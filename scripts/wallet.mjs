#!/usr/bin/env node

/**
 * Sponge Wallet CLI wrapper for Claude Code skills.
 *
 * Calls Sponge Wallet REST endpoints directly (no MCP JSON-RPC).
 *
 * Usage:
 *   node wallet.mjs register <agent_name>          # Register a new agent (get claim URL for human)
 *   node wallet.mjs register --poll <device_code>  # Poll for registration completion
 *   node wallet.mjs login                          # Authenticate via browser (OAuth device flow)
 *   node wallet.mjs logout                         # Remove stored credentials
 *   node wallet.mjs whoami                         # Show current auth status
 *   node wallet.mjs <tool_name> '<json_args>'      # Call a wallet tool
 *
 * Examples:
 *   node wallet.mjs register "MyTradingBot"
 *   node wallet.mjs get_balance '{}'
 *   node wallet.mjs evm_transfer '{"chain":"base","to":"0x...","amount":"10","currency":"USDC"}'
 *
 * Credential resolution order:
 *   1. SPONGE_API_KEY environment variable
 *   2. ~/.spongewallet/credentials.json (saved by `login` or `register` command)
 *
 * Environment:
 *   SPONGE_API_KEY  - Optional. Overrides stored credentials.
 *   SPONGE_API_URL  - Optional. Override API base URL (default: https://api.wallet.paysponge.com)
 */

import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const DEFAULT_API_URL = "https://api.wallet.paysponge.com";
const API_URL = process.env.SPONGE_API_URL || DEFAULT_API_URL;
const CREDENTIALS_DIR = path.join(os.homedir(), ".spongewallet");
const CREDENTIALS_FILE = path.join(CREDENTIALS_DIR, "credentials.json");

// ---------------------------------------------------------------------------
// Credential management
// ---------------------------------------------------------------------------

function loadCredentials() {
  try {
    if (!fs.existsSync(CREDENTIALS_FILE)) return null;
    const data = JSON.parse(fs.readFileSync(CREDENTIALS_FILE, "utf-8"));
    if (!data.apiKey) return null;
    return data;
  } catch {
    return null;
  }
}

function saveCredentials(credentials) {
  fs.mkdirSync(CREDENTIALS_DIR, { recursive: true, mode: 0o700 });
  fs.writeFileSync(CREDENTIALS_FILE, JSON.stringify(credentials, null, 2), { mode: 0o600 });
}

function deleteCredentials() {
  if (fs.existsSync(CREDENTIALS_FILE)) fs.unlinkSync(CREDENTIALS_FILE);
}

function getApiKey() {
  // 1. Environment variable
  if (process.env.SPONGE_API_KEY) return process.env.SPONGE_API_KEY;
  // 2. Stored credentials
  const creds = loadCredentials();
  return creds?.apiKey ?? null;
}

// ---------------------------------------------------------------------------
// OAuth Device Flow
// ---------------------------------------------------------------------------

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Register a new agent (for agents without an account).
 * Returns a claim URL for the human owner to verify.
 */
async function register(agentName) {
  const res = await fetch(`${API_URL}/api/agents/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: agentName }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to register agent: ${text}`);
  }

  const data = await res.json();

  console.log(JSON.stringify({
    status: "registration_pending",
    agent_name: agentName,
    claim_url: data.verificationUriComplete,
    claim_code: data.claimCode,
    device_code: data.deviceCode,
    expires_in: data.expiresIn,
    interval: data.interval,
    message: `Send this URL to your human owner: ${data.verificationUriComplete}`,
    free_usdc_offer: {
      description: "Your human owner can get $1 USDC FREE on Solana by posting a tweet!",
      tweet_text: data.claimText,
      how_it_works: "After logging in, they can copy the tweet text, post it on X, paste the tweet URL, and approve to receive $1 USDC.",
    },
    instructions: [
      "1. Send the claim_url to your human owner",
      "2. They log in (email, wallet, Google, or GitHub)",
      "3. OPTIONAL: They post the tweet_text on X to get $1 USDC FREE on Solana",
      "4. They click Approve to create your wallet",
      "5. Run: node wallet.mjs register --poll <device_code> to get your API key",
    ],
  }, null, 2));
}

/**
 * Login Phase 1: Request a device code and return the verification URL.
 * Outputs JSON so Claude can show the URL to the user.
 */
async function loginStart() {
  const res = await fetch(`${API_URL}/api/oauth/device/authorization`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      clientId: "spongewallet-skill",
      scope: "wallet:read wallet:write transaction:sign transaction:write",
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to start device flow: ${text}`);
  }

  const device = await res.json();

  // Try to copy code to clipboard
  let copied = false;
  try {
    const { execSync } = await import("node:child_process");
    const platform = process.platform;
    if (platform === "darwin") {
      execSync(`echo -n ${JSON.stringify(device.userCode)} | pbcopy`);
      copied = true;
    } else if (platform === "linux") {
      execSync(`echo -n ${JSON.stringify(device.userCode)} | xclip -selection clipboard 2>/dev/null || echo -n ${JSON.stringify(device.userCode)} | xsel --clipboard 2>/dev/null`);
      copied = true;
    } else if (platform === "win32") {
      execSync(`echo|set /p=${JSON.stringify(device.userCode)} | clip`);
      copied = true;
    }
  } catch {
    // Clipboard not available
  }

  // Output structured JSON for Claude to present to the user
  console.log(JSON.stringify({
    status: "login_required",
    verification_url: device.verificationUri,
    user_code: device.userCode,
    device_code: device.deviceCode,
    expires_in: device.expiresIn,
    interval: device.interval,
    copied_to_clipboard: copied,
    message: `Visit ${device.verificationUri} and enter code: ${device.userCode}`,
  }, null, 2));
}

/**
 * Login Phase 2: Poll for token completion after user has approved in browser.
 * Called with the device_code from Phase 1.
 */
async function loginPoll(deviceCode, intervalSeconds, expiresInSeconds) {
  const expiresAt = Date.now() + expiresInSeconds * 1000;
  let interval = intervalSeconds * 1000;

  while (Date.now() < expiresAt) {
    await sleep(interval);

    const tokenRes = await fetch(`${API_URL}/api/oauth/device/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grantType: "urn:ietf:params:oauth:grant-type:device_code",
        deviceCode,
        clientId: "spongewallet-skill",
      }),
    });

    if (tokenRes.ok) {
      const token = await tokenRes.json();

      const credentials = {
        apiKey: token.apiKey,
        agentId: token.agentId || undefined,
        createdAt: new Date().toISOString(),
        baseUrl: API_URL !== DEFAULT_API_URL ? API_URL : undefined,
      };
      saveCredentials(credentials);

      console.log(JSON.stringify({
        status: "success",
        message: "Authenticated successfully. You can now use any wallet tool.",
        credentials_file: CREDENTIALS_FILE,
      }, null, 2));
      return;
    }

    const errorData = await tokenRes.json().catch(() => ({}));
    switch (errorData.error) {
      case "authorization_pending":
        // Still waiting — keep polling silently
        break;
      case "slow_down":
        interval += 5000;
        break;
      case "access_denied":
        throw new Error("Access denied by user.");
      case "expired_token":
        throw new Error("Device code expired. Please run login again.");
      default:
        throw new Error(`Auth failed: ${errorData.errorDescription || errorData.error || "Unknown error"}`);
    }
  }

  throw new Error("Device code expired. Please run login again.");
}

function logout() {
  deleteCredentials();
  console.log("Logged out. Credentials removed.");
}

function whoami() {
  const envKey = process.env.SPONGE_API_KEY;
  const creds = loadCredentials();

  if (envKey) {
    const prefix = envKey.substring(0, 20);
    const isTest = envKey.startsWith("sponge_test_");
    console.log(`Authenticated via SPONGE_API_KEY environment variable`);
    console.log(`  Key: ${prefix}...`);
    console.log(`  Mode: ${isTest ? "testnet" : "mainnet"}`);
  } else if (creds) {
    const prefix = creds.apiKey.substring(0, 20);
    const isTest = creds.apiKey.startsWith("sponge_test_");
    console.log(`Authenticated via stored credentials`);
    console.log(`  Key: ${prefix}...`);
    console.log(`  Mode: ${isTest ? "testnet" : "mainnet"}`);
    console.log(`  File: ${CREDENTIALS_FILE}`);
    if (creds.agentId) console.log(`  Agent: ${creds.agentId}`);
    if (creds.createdAt) console.log(`  Since: ${creds.createdAt}`);
  } else {
    console.log("Not authenticated.");
    console.log("\nAI agents: Run: node wallet.mjs register <your-agent-name>");
    console.log("Humans with existing accounts: Run: node wallet.mjs login");
  }
}

// ---------------------------------------------------------------------------
// REST API
// ---------------------------------------------------------------------------

function buildQuery(params = {}) {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    searchParams.set(key, String(value));
  }
  return searchParams.toString();
}

async function apiRequest(apiKey, method, path, { query, body } = {}) {
  const url = new URL(path, API_URL);
  const queryString = query ? buildQuery(query) : "";
  if (queryString) {
    url.search = queryString;
  }

  const headers = {
    "Authorization": `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    "Accept": "application/json",
  };

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    let errorBody;
    try { errorBody = await res.json(); } catch { errorBody = { message: res.statusText }; }
    throw new Error(errorBody?.message || errorBody?.error || `HTTP ${res.status}`);
  }

  return res.json();
}

async function callTool(apiKey, tool, toolArgs = {}) {
  switch (tool) {
    case "get_balance": {
      const allowedChains = Array.isArray(toolArgs.allowedChains)
        ? toolArgs.allowedChains.join(",")
        : toolArgs.allowedChains;
      return apiRequest(apiKey, "GET", "/api/balances", {
        query: {
          chain: toolArgs.chain ?? "all",
          allowedChains,
          onlyUsdc: toolArgs.onlyUsdc ? "true" : undefined,
        },
      });
    }
    case "evm_transfer":
      return apiRequest(apiKey, "POST", "/api/transfers/evm", {
        body: {
          chain: toolArgs.chain,
          to: toolArgs.to,
          amount: toolArgs.amount,
          currency: toolArgs.currency,
        },
      });
    case "solana_transfer":
      return apiRequest(apiKey, "POST", "/api/transfers/solana", {
        body: {
          chain: toolArgs.chain,
          to: toolArgs.to,
          amount: toolArgs.amount,
          currency: toolArgs.currency,
        },
      });
    case "solana_swap":
      return apiRequest(apiKey, "POST", "/api/transactions/swap", {
        body: {
          chain: toolArgs.chain,
          inputToken: toolArgs.input_token,
          outputToken: toolArgs.output_token,
          amount: toolArgs.amount,
          slippageBps: toolArgs.slippage_bps,
        },
      });
    case "get_solana_tokens":
      return apiRequest(apiKey, "GET", "/api/solana/tokens", {
        query: { chain: toolArgs.chain },
      });
    case "search_solana_tokens":
      return apiRequest(apiKey, "GET", "/api/solana/tokens/search", {
        query: { query: toolArgs.query, limit: toolArgs.limit },
      });
    case "get_transaction_status":
      return apiRequest(
        apiKey,
        "GET",
        `/api/transactions/status/${encodeURIComponent(toolArgs.transaction_hash)}`,
        { query: { chain: toolArgs.chain } },
      );
    case "get_transaction_history":
      return apiRequest(apiKey, "GET", "/api/transactions/history", {
        query: {
          limit: toolArgs.limit,
          chain: toolArgs.chain,
        },
      });
    case "request_funding":
      return apiRequest(apiKey, "POST", "/api/funding-requests", {
        body: {
          amount: toolArgs.amount,
          reason: toolArgs.reason,
          chain: toolArgs.chain,
          currency: toolArgs.currency,
        },
      });
    case "withdraw_to_main_wallet":
      return apiRequest(apiKey, "POST", "/api/wallets/withdraw-to-main", {
        body: {
          chain: toolArgs.chain,
          amount: toolArgs.amount,
          currency: toolArgs.currency,
        },
      });
    // DISABLED: x402 paid API tools temporarily disabled
    // case "sponge":
    //   return apiRequest(apiKey, "POST", "/api/sponge", { body: toolArgs });
    // case "create_x402_payment":
    //   return apiRequest(apiKey, "POST", "/api/x402/payments", {
    //     body: {
    //       chain: toolArgs.chain,
    //       to: toolArgs.to,
    //       token: toolArgs.token,
    //       amount: toolArgs.amount,
    //       decimals: toolArgs.decimals,
    //       valid_for_seconds: toolArgs.valid_for_seconds,
    //       resource_url: toolArgs.resource_url,
    //       resource_description: toolArgs.resource_description,
    //       fee_payer: toolArgs.fee_payer,
    //       http_method: toolArgs.http_method,
    //     },
    //   });
    default:
      throw new Error(`Unknown tool: ${tool}`);
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const command = process.argv[2];

// Handle register command (for new agents without an account)
if (command === "register") {
  const subcommand = process.argv[3];
  try {
    if (subcommand === "--poll") {
      // Poll for registration completion (same as login poll)
      const deviceCode = process.argv[4];
      const interval = parseInt(process.argv[5] || "5", 10);
      const expiresIn = parseInt(process.argv[6] || "600", 10);
      if (!deviceCode) {
        console.error(JSON.stringify({ status: "error", error: "Usage: node wallet.mjs register --poll <device_code> [interval] [expires_in]" }));
        process.exit(1);
      }
      await loginPoll(deviceCode, interval, expiresIn);
    } else {
      // Start registration with agent name
      const agentName = subcommand || process.argv[3];
      if (!agentName) {
        console.error(JSON.stringify({ status: "error", error: "Usage: node wallet.mjs register <agent_name>" }));
        process.exit(1);
      }
      await register(agentName);
    }
  } catch (err) {
    console.error(JSON.stringify({ status: "error", error: err.message }));
    process.exit(1);
  }
  process.exit(0);
}

// Handle auth commands (no API key needed)
if (command === "login") {
  const subcommand = process.argv[3];
  try {
    if (subcommand === "--poll") {
      // Phase 2: poll for token with device_code, interval, expires_in
      const deviceCode = process.argv[4];
      const interval = parseInt(process.argv[5] || "5", 10);
      const expiresIn = parseInt(process.argv[6] || "900", 10);
      if (!deviceCode) {
        console.error(JSON.stringify({ status: "error", error: "Usage: node wallet.mjs login --poll <device_code> [interval] [expires_in]" }));
        process.exit(1);
      }
      await loginPoll(deviceCode, interval, expiresIn);
    } else {
      // Phase 1: start device flow, return URL as JSON
      await loginStart();
    }
  } catch (err) {
    console.error(JSON.stringify({ status: "error", error: err.message }));
    process.exit(1);
  }
  process.exit(0);
}

if (command === "logout") {
  logout();
  process.exit(0);
}

if (command === "whoami") {
  whoami();
  process.exit(0);
}

// Everything else requires authentication
const apiKey = getApiKey();

if (!apiKey) {
  console.error(JSON.stringify({
    status: "error",
    error: "Not authenticated. AI agents: Run: node wallet.mjs register <your-agent-name>. Humans: Run: node wallet.mjs login",
  }));
  process.exit(1);
}

const toolName = command;
const argsRaw = process.argv[3] || "{}";

if (!toolName) {
  console.error(JSON.stringify({
    status: "error",
    error: "Usage: node wallet.mjs <tool_name> '<json_args>'",
    available_tools: [
      "register", "login", "logout", "whoami",
      "get_balance", "evm_transfer", "solana_transfer", "solana_swap",
      "get_solana_tokens", "search_solana_tokens",
      "get_transaction_status", "get_transaction_history",
      "request_funding", "withdraw_to_main_wallet",
      // "sponge", "create_x402_payment", // x402 paid API tools temporarily disabled
    ],
  }));
  process.exit(1);
}

let args;
try {
  args = JSON.parse(argsRaw);
} catch {
  console.error(JSON.stringify({
    status: "error",
    error: `Invalid JSON arguments: ${argsRaw}`,
  }));
  process.exit(1);
}

try {
  const result = await callTool(apiKey, toolName, args);
  console.log(JSON.stringify({ status: "success", data: result }, null, 2));
} catch (err) {
  console.error(JSON.stringify({
    status: "error",
    error: err.message || String(err),
  }));
  process.exit(1);
}
