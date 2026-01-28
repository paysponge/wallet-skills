#!/usr/bin/env node

/**
 * Sponge Wallet CLI wrapper for Claude Code skills.
 *
 * Usage:
 *   node wallet.mjs <tool_name> '<json_args>'
 *
 * Examples:
 *   node wallet.mjs get_balance '{}'
 *   node wallet.mjs get_balance '{"chain":"base"}'
 *   node wallet.mjs evm_transfer '{"chain":"base","to":"0x...","amount":"10","currency":"USDC"}'
 *   node wallet.mjs solana_swap '{"chain":"solana","inputToken":"SOL","outputToken":"USDC","amount":"1"}'
 *
 * Environment:
 *   SPONGE_API_KEY  - Required. Your Sponge Wallet API key (sponge_live_* or sponge_test_*)
 *   SPONGE_API_URL  - Optional. Override the API base URL (default: https://api.wallet.paysponge.com)
 */

const API_URL = process.env.SPONGE_API_URL || "https://api.wallet.paysponge.com";
const API_KEY = process.env.SPONGE_API_KEY;

if (!API_KEY) {
  console.error(JSON.stringify({
    status: "error",
    error: "SPONGE_API_KEY environment variable is required. Get one at https://spongewallet.com",
  }));
  process.exit(1);
}

const toolName = process.argv[2];
const argsRaw = process.argv[3] || "{}";

if (!toolName) {
  console.error(JSON.stringify({
    status: "error",
    error: "Usage: node wallet.mjs <tool_name> '<json_args>'",
    available_tools: [
      "get_balance", "evm_transfer", "solana_transfer", "solana_swap",
      "get_solana_tokens", "search_solana_tokens",
      "get_transaction_status", "get_transaction_history",
      "request_funding", "withdraw_to_main_wallet",
      "sponge", "create_x402_payment",
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

async function callTool(tool, toolArgs) {
  const url = `${API_URL}/api/mcp/tools/call`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      tool,
      arguments: toolArgs,
    }),
  });

  if (!response.ok) {
    let errorBody;
    try {
      errorBody = await response.json();
    } catch {
      errorBody = { message: response.statusText };
    }
    return {
      status: "error",
      statusCode: response.status,
      error: errorBody.message || errorBody.error || `HTTP ${response.status}`,
    };
  }

  const data = await response.json();
  return { status: "success", data };
}

try {
  const result = await callTool(toolName, args);
  console.log(JSON.stringify(result, null, 2));
} catch (err) {
  console.error(JSON.stringify({
    status: "error",
    error: err.message || String(err),
  }));
  process.exit(1);
}
