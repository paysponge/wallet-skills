---
name: sponge-wallet
version: 0.2.0

description: Crypto wallet, token swaps, cross-chain bridges, Tempo transfers, and access to paid external services (search, image gen, web scraping, AI, and more) via x402 and MPP micropayments.
homepage: https://wallet.paysponge.com
user-invocable: true
metadata: {"openclaw":{"emoji":"\ud83e\uddfd","category":"finance","primaryEnv":"SPONGE_API_KEY","requires":{"env":["SPONGE_API_KEY"]}}}
---

```
SPONGE WALLET API QUICK REFERENCE v0.2.0
Base:   https://api.wallet.paysponge.com
Auth:   Authorization: Bearer <SPONGE_API_KEY>
Ver:    Sponge-Version: 0.2.0  (REQUIRED on every request)
Docs:   This file is canonical (skills guide + params)

Capabilities: wallet + swaps + bridges + Tempo transfers + paid external services (x402 + MPP) + trading + shopping

x402 paid services (search, image gen, scraping, AI, data, etc.):
  GET  /api/x402/discover                -> Step 1: find services by query/category
  GET  /api/x402/discover/:serviceId     -> Step 2: get endpoints, params, pricing (REQUIRED before fetch)
  POST /api/x402/fetch                   -> Step 3: call service endpoint (auto-pays with USDC)

MPP paid services (same as x402 but pays with Tempo stablecoins):
  POST /api/mpp/fetch                    -> call service endpoint (auto-pays with pathUSD on Tempo)

Wallet & tokens:
  GET  /api/balances                     -> get balances (includes Polymarket USDC.e)
  POST /api/transfers/tempo              -> Tempo transfer (pathUSD/AlphaUSD/BetaUSD/ThetaUSD)
  POST /api/transfers/evm                -> EVM transfer (ETH/USDC)
  POST /api/transfers/solana             -> Solana transfer (SOL/USDC)
  POST /api/transactions/swap            -> Solana swap
  POST /api/transactions/base-swap       -> Base swap (0x)
  POST /api/transactions/bridge          -> Bridge (deBridge)
  GET  /api/solana/tokens                -> list SPL tokens
  GET  /api/solana/tokens/search         -> search Jupiter token list
  GET  /api/transactions/status/:txHash  -> transaction status
  GET  /api/transactions/history         -> transaction history
  POST /api/funding-requests             -> request funding from owner
  POST /api/wallets/withdraw-to-main     -> withdraw to owner

Planning & proposals:
  POST /api/plans/submit                 -> submit multi-step plan
  POST /api/plans/approve                -> approve and execute plan
  POST /api/trades/propose               -> propose single swap for approval

Trading & shopping:
  POST /api/polymarket                   -> Polymarket prediction market trading
  POST /api/hyperliquid                  -> Hyperliquid perps/spot trading
  POST /api/checkout                     -> Amazon checkout (initiate purchase)
  GET  /api/checkout/:sessionId          -> checkout status
  DELETE /api/checkout/:sessionId        -> cancel checkout
  GET  /api/checkout/history             -> checkout history
  POST /api/checkout/amazon-search       -> search Amazon products

Auth (one-time setup):
  POST /api/agents/register              -> register (no auth)
  POST /api/oauth/device/authorization   -> device login start (humans)
  POST /api/oauth/device/token           -> device token poll (agents + humans)

Rules: use register (agents), never login | store key in ~/.spongewallet/credentials.json | requests are JSON
Errors: HTTP status + JSON error message
```

# Sponge Wallet API - Agent Skills Guide

This skill is **doc-only**. There is no local CLI. Agents must call the Sponge Wallet REST API directly.

## What you can do with Sponge

1. **Manage crypto** — check balances, transfer tokens (EVM, Solana, and Tempo), swap on Solana/Base, bridge cross-chain
2. **Access paid external services via x402** — search, image generation, web scraping, AI models, data enrichment, and more. Always follow these 3 steps:
   1. `GET /api/x402/discover?query=...` — find a service
   2. `GET /api/x402/discover/{serviceId}` — get its endpoints, params, and proxy URL **(do not skip)**
   3. `POST /api/x402/fetch` — call the endpoint using the URL and params from step 2
3. **Access paid external services via MPP** — same discover flow as x402, but use `POST /api/mpp/fetch` instead of `x402/fetch`. Pays with pathUSD on the Tempo chain instead of USDC. Use MPP when the service accepts MPP payments or when you want to pay from your Tempo balance.
4. **Trade on prediction markets and perps** — Polymarket, Hyperliquid
5. **Shop on Amazon** — search products and checkout

**If a task requires an external capability you don't have** (e.g., generating images, searching the web, scraping a URL, looking up a person's email), use the x402 3-step flow or MPP flow above. There is likely a paid service available for it.

## Why the steps matter (short rationale)

- **Register vs login**: agents create a new managed wallet tied to a human owner. That owner must explicitly claim the agent. Login is only for humans who already have an account.
- **Claim URL**: ensures the human owner explicitly links the agent to their account and controls allowlists/funding.
- **Credential persistence**: the `apiKey` is returned once (immediately for agent-first mode, or after device approval for standard mode). If you lose it, you must re-register or re-authenticate.

## Standard credential storage (required)

Store the API key in **one canonical location**:

- `~/.spongewallet/credentials.json`

Recommended file contents:
```json
{
  "apiKey": "sponge_live_...",
  "claimCode": "ABCD-1234",
  "claimUrl": "https://wallet.paysponge.com/device?code=ABCD-1234"
}
```

Optional environment export (runtime convenience):
```bash
export SPONGE_API_KEY="$(jq -r .apiKey ~/.spongewallet/credentials.json)"
```

## Base URL & Auth

- Base URL: `https://api.wallet.paysponge.com`
- Auth header: `Authorization: Bearer <SPONGE_API_KEY>`
- Content-Type: `application/json`

Quick env setup:

```bash
export SPONGE_API_URL="https://api.wallet.paysponge.com"
export SPONGE_API_KEY="$(jq -r .apiKey ~/.spongewallet/credentials.json)"
```

## CRITICAL: AI Agents Must Use `register`, NOT `login`

### 1) Agent Registration (AI agents only)

There are two modes:
- **Standard device flow** (default): human must approve before the API key is returned.
- **Agent-first** (`agentFirst: true`): agent receives the API key immediately, and the human can claim later.

**Step 1 — Start registration (agent-first recommended)**
```bash
curl -sS -X POST "$SPONGE_API_URL/api/agents/register" \
  -H "Sponge-Version: 0.2.0" \
  -H "Content-Type: application/json" \
  -d '{
    "name":"YourAgentName",
    "agentFirst": true,
    "testnet": true
  }'
```

Response includes:
- `verificationUriComplete` (claim URL for the human owner)
- `claimCode`, `deviceCode`, `expiresIn`, `interval`, `claimText`
- `apiKey` (returned immediately in agent-first mode)

Store `apiKey`, `claimCode`, and `verificationUriComplete` (as `claimUrl`) in `~/.spongewallet/credentials.json` so a human can claim later if context resets.

**Step 2 — Send the claim URL to the human owner**
They log in, optionally post the tweet text, and approve the agent.

Claim link format:
- `verificationUriComplete` (example path: `/device?code=ABCD-1234`)
- The base URL is the frontend (prod or local), so just pass the full `verificationUriComplete` to the human.

**Step 3 — Poll for completion (standard device flow only)**
```bash
curl -sS -X POST "$SPONGE_API_URL/api/oauth/device/token" \
  -H "Sponge-Version: 0.2.0" \
  -H "Content-Type: application/json" \
  -d '{
    "grantType":"urn:ietf:params:oauth:grant-type:device_code",
    "deviceCode":"<deviceCode>",
    "clientId":"spongewallet-skill"
  }'
```

On success, the response includes `apiKey`. Save it to `~/.spongewallet/credentials.json` and use it as `SPONGE_API_KEY`.

Note: In **agent-first mode**, you already have the `apiKey` from Step 1. The device token will remain pending until the human claims.

### 2) Human Login (existing accounts only)

**Phase 1 — Request device code**
```bash
curl -sS -X POST "$SPONGE_API_URL/api/oauth/device/authorization" \
  -H "Sponge-Version: 0.2.0" \
  -H "Content-Type: application/json" \
  -d '{
    "clientId":"spongewallet-skill",
    "scope":"wallet:read wallet:write transaction:sign transaction:write"
  }'
```

**Phase 2 — Poll for token** (same endpoint as agents)
```bash
curl -sS -X POST "$SPONGE_API_URL/api/oauth/device/token" \
  -H "Sponge-Version: 0.2.0" \
  -H "Content-Type: application/json" \
  -d '{
    "grantType":"urn:ietf:params:oauth:grant-type:device_code",
    "deviceCode":"<deviceCode>",
    "clientId":"spongewallet-skill"
  }'
```

## Tool Call Pattern

All tool calls are plain REST requests with JSON payloads.

**Common headers (include on EVERY request)**
```bash
-H "Authorization: Bearer $SPONGE_API_KEY" \
-H "Sponge-Version: 0.2.0" \
-H "Content-Type: application/json" \
-H "Accept: application/json"
```

**Agent ID note:** `agentId` is optional for API key auth. It is only required when using a user session (e.g., Privy-based auth) or when explicitly operating on a different agent.

### API Endpoints Reference

| Endpoint | Method | Path | Params/Body |
|----------|--------|------|-------------|
| Get balances | GET | `/api/balances` | Query: `chain`, `allowedChains`, `onlyUsdc` |
| List SPL tokens | GET | `/api/solana/tokens` | Query: `chain` |
| Search Solana tokens | GET | `/api/solana/tokens/search` | Query: `query`, `limit` |
| Tempo transfer | POST | `/api/transfers/tempo` | Body: `to`, `amount`, `token` (pathUSD/AlphaUSD/BetaUSD/ThetaUSD) |
| EVM transfer | POST | `/api/transfers/evm` | Body: `chain`, `to`, `amount`, `currency` |
| Solana transfer | POST | `/api/transfers/solana` | Body: `chain`, `to`, `amount`, `currency` |
| Solana swap | POST | `/api/transactions/swap` | Body: `chain`, `inputToken`, `outputToken`, `amount`, `slippageBps` |
| Base swap | POST | `/api/transactions/base-swap` | Body: `chain`, `inputToken`, `outputToken`, `amount`, `slippageBps` |
| Bridge | POST | `/api/transactions/bridge` | Body: `sourceChain`, `destinationChain`, `token`, `amount`, `destinationToken`, `recipientAddress` |
| Transaction status | GET | `/api/transactions/status/{txHash}` | Query: `chain` |
| Transaction history | GET | `/api/transactions/history` | Query: `limit`, `chain` |
| Request funding | POST | `/api/funding-requests` | Body: `amount`, `reason`, `chain`, `currency` |
| **x402 Step 1: Discover services** | GET | `/api/x402/discover` | Query: `type`, `limit`, `offset`, `query`, `category` |
| **x402 Step 2: Get service details** | GET | `/api/x402/discover/{serviceId}` | — |
| **x402 Step 3: Fetch with auto-pay** | POST | `/api/x402/fetch` | Body: `url`, `method`, `headers`, `body`, `preferred_chain` |
| **MPP Fetch with auto-pay** | POST | `/api/mpp/fetch` | Body: `url`, `method`, `headers`, `body`, `chain` |
| Polymarket | POST | `/api/polymarket` | Body: `action`, + action-specific params (see below) |
| Hyperliquid | POST | `/api/hyperliquid` | Body: `action`, + action-specific params (see below) |
| Amazon checkout | POST | `/api/checkout` | Body: `checkoutUrl`, `amazonAccountId`, `shippingAddress`, `dryRun`, `clearCart` |
| Checkout status | GET | `/api/checkout/{sessionId}` | Query: `agentId` (optional) |
| Checkout history | GET | `/api/checkout/history` | Query: `agentId`, `limit`, `offset` |
| Amazon search | POST | `/api/checkout/amazon-search` | Body: `query`, `maxResults`, `region` |
| Submit plan | POST | `/api/plans/submit` | Body: `title`, `reasoning`, `steps` (see Planning section) |
| Approve plan | POST | `/api/plans/approve` | Body: `plan_id` |
| Propose trade | POST | `/api/trades/propose` | Body: `input_token`, `output_token`, `amount`, `reason` |

Note: request bodies use camelCase (e.g., `inputToken`, `slippageBps`).

> **CRITICAL — x402 Paid Services require ALL 3 steps in order:**
> 1. `GET /api/x402/discover` — search for a service by query or category
> 2. `GET /api/x402/discover/{serviceId}` — get the service's endpoints, parameters, pricing, and proxy URL (**DO NOT SKIP THIS STEP**)
> 3. `POST /api/x402/fetch` — call the endpoint using the URL from step 2
>
> You MUST call step 2 before step 3. Step 2 returns the correct proxy URL and the endpoint parameters/instructions needed to construct the `x402_fetch` request. Using a direct API URL will fail with auth errors.

### Planning (Multi-Step Actions)

Use `submit_plan` whenever you need to do 2+ related actions together (e.g., swap then bridge, buy multiple tokens, rebalance a portfolio). This groups everything into a single proposal the user can review and approve.

**Workflow:**
1. Call `submit_plan` with a title, reasoning, and ordered list of steps
2. Present the plan to the user
3. When the user confirms ("go ahead", "do it", "execute"), call `approve_plan` with the `plan_id`
4. Steps execute sequentially and automatically. If any step fails, the plan pauses for retry or reject.

**Step types:**
- `swap` — requires: `input_token`, `output_token`, `amount`, `reason`
- `transfer` — requires: `chain`, `to`, `amount`, `currency`, `reason`
- `bridge` — requires: `source_chain`, `destination_chain`, `token`, `amount`, `reason`; optional: `destination_token`

**Rules:**
- Do NOT execute steps individually with other tools after submitting a plan — always use `approve_plan`
- Plans can have 1–20 steps
- The user can skip individual steps on the dashboard before approving
- Use `propose_trade` only for a single swap that needs explicit approval; for multi-step flows, always use `submit_plan`

### Polymarket Actions

The `polymarket` endpoint is a unified tool. Pass `action` plus action-specific parameters:

| Action | Description | Required Params | Optional Params |
|--------|-------------|-----------------|-----------------|
| `status` | Check Polymarket account status and USDC.e balance | — | — |
| `markets` | Search prediction markets | — | `query`, `limit` |
| `positions` | View current market positions | — | — |
| `orders` | View open and recent orders | — | — |
| `order` | Place a buy/sell order | `outcome`, `side`, `size`, `price` | `market_slug` or `token_id`, `order_type` |
| `cancel` | Cancel an open order | `order_id` | — |
| `set_allowances` | Reset token approvals | — | — |
| `withdraw` | Withdraw USDC.e from Safe to any address | `to_address`, `amount` | — |

**Order params:**
- `market_slug`: Market URL slug (e.g., `"will-bitcoin-hit-100k"`) — use this OR `token_id`
- `token_id`: Polymarket condition token ID — use this OR `market_slug`
- `outcome`: `"yes"` or `"no"`
- `side`: `"buy"` or `"sell"`
- `size`: Number of shares (e.g., `10`)
- `price`: Probability price 0.0–1.0 (e.g., `0.65` = 65 cents per share)
- `order_type`: `"GTC"` (default), `"GTD"`, `"FOK"`, `"FAK"`

**Scopes:** Trade actions (`order`, `cancel`, `set_allowances`, `withdraw`) require `polymarket:trade` scope. Read actions (`status`, `markets`, `positions`, `orders`) require `polymarket:read`.

**Auto-provisioning:** The Polymarket Safe wallet is created automatically on first use. No manual setup needed.

### Hyperliquid Actions

The `hyperliquid` endpoint is a unified tool for perps/spot trading on Hyperliquid DEX. Pass `action` plus action-specific parameters:

| Action | Description | Required Params | Optional Params |
|--------|-------------|-----------------|-----------------|
| `status` | Check account balances and equity | — | — |
| `positions` | View open perp positions (entry, PnL, liq price) | — | — |
| `orders` | View open orders | — | `symbol` |
| `fills` | Recent trade history | — | `symbol`, `since`, `limit` |
| `markets` | List available perp/spot markets | — | — |
| `ticker` | Current price for a symbol | `symbol` | — |
| `orderbook` | L2 order book | `symbol` | `limit` |
| `funding` | Current + predicted funding rates | — | `symbol` |
| `order` | Place limit/market/stop/TP order | `symbol`, `side`, `type`, `amount` | `price`, `reduce_only`, `trigger_price`, `tp_sl`, `tif` |
| `cancel` | Cancel an order | `order_id`, `symbol` | — |
| `cancel_all` | Cancel all open orders | — | `symbol` |
| `set_leverage` | Set leverage for a symbol | `symbol`, `leverage` | — |
| `withdraw` | Withdraw USDC from Hyperliquid | `amount`, `destination` | — |
| `transfer` | Move USDC between spot and perps | `amount`, `to_perp` | — |

**Order params:**
- `symbol`: CCXT symbol (e.g., `"BTC/USDC:USDC"` for perps, `"PURR/USDC"` for spot)
- `side`: `"buy"` or `"sell"`
- `type`: `"limit"` or `"market"`
- `amount`: Size in base currency (e.g., `"0.001"` for BTC)
- `price`: Limit price (required for limit orders)
- `reduce_only`: Boolean, default false
- `trigger_price`: For stop-loss/take-profit orders
- `tp_sl`: `"tp"` (take-profit) or `"sl"` (stop-loss) — required if `trigger_price` set
- `tif`: `"GTC"` (default), `"IOC"`, `"PO"` (post-only)

**Scopes:** Trade actions (`order`, `cancel`, `cancel_all`, `set_leverage`, `withdraw`) require `hyperliquid:trade` scope. Read actions require `wallet:read`.

**Signing:** Hyperliquid uses EVM wallet signing (EIP-712). No API keys needed — your agent's existing EVM wallet is used automatically.

**Deposits:** Use the bridge tool to deposit USDC to Hyperliquid: `bridge(source_chain: "base", destination_chain: "hyperliquid", token: "USDC", amount: "100")`. Your agent's EVM wallet address is your Hyperliquid account.

**Withdrawals:** Use the bridge tool to withdraw USDC from Hyperliquid: `bridge(source_chain: "hyperliquid", destination_chain: "base", token: "USDC", amount: "100")`. USDC is automatically moved from perps to spot before bridging.

### Amazon Checkout

Purchase products from Amazon using a configured Amazon account.

**Prerequisites:**
- An Amazon account must be configured via the dashboard or `/api/agents/:id/amazon-accounts` endpoints
- A shipping address must be set (inline or via `/api/agents/:id/shipping-addresses`)

**Async workflow:**
1. Initiate checkout with `POST /api/checkout` — returns a `sessionId`
2. Wait ~60 seconds for the initial checkout process
3. Poll `GET /api/checkout/:sessionId` every 10 seconds until status is `completed` or `failed`

**Status progression:** `pending` → `in_progress` → `completed` | `failed` | `cancelled`

**Key options:**
- `dryRun: true` — stops before placing the order (useful for testing or previewing total cost)
- `clearCart: true` — clears the Amazon cart before adding the product (default behavior)

**Scopes:** Checkout actions require `amazon_checkout` scope on the API key.

## Quick Start

### 1) Register (agents only)
```bash
curl -sS -X POST "$SPONGE_API_URL/api/agents/register" \
  -H "Sponge-Version: 0.2.0" \
  -H "Content-Type: application/json" \
  -d '{
    "name":"YourAgentName",
    "agentFirst": true,
    "testnet": true
  }'
```
Share the claim URL with your human, then store the `apiKey` immediately (agent-first). For standard device flow, poll for the token after approval.

### 2) Check balance
```bash
curl -sS "$SPONGE_API_URL/api/balances?chain=base" \
  -H "Authorization: Bearer $SPONGE_API_KEY" \
  -H "Sponge-Version: 0.2.0" \
  -H "Accept: application/json"
```

### 3) Transfer USDC on Base
```bash
curl -sS -X POST "$SPONGE_API_URL/api/transfers/evm" \
  -H "Authorization: Bearer $SPONGE_API_KEY" \
  -H "Sponge-Version: 0.2.0" \
  -H "Content-Type: application/json" \
  -d '{
    "chain":"base",
    "to":"0x...",
    "amount":"10",
    "currency":"USDC"
  }'
```

## Examples

### Swap tokens on Solana
```bash
curl -sS -X POST "$SPONGE_API_URL/api/transactions/swap" \
  -H "Authorization: Bearer $SPONGE_API_KEY" \
  -H "Sponge-Version: 0.2.0" \
  -H "Content-Type: application/json" \
  -d '{
    "chain":"solana",
    "inputToken":"SOL",
    "outputToken":"BONK",
    "amount":"0.5",
    "slippageBps":100
  }'
```

### Swap tokens on Base
```bash
curl -sS -X POST "$SPONGE_API_URL/api/transactions/base-swap" \
  -H "Authorization: Bearer $SPONGE_API_KEY" \
  -H "Sponge-Version: 0.2.0" \
  -H "Content-Type: application/json" \
  -d '{
    "chain":"base",
    "inputToken":"ETH",
    "outputToken":"USDC",
    "amount":"0.1",
    "slippageBps":50
  }'
```

### Bridge tokens cross-chain
```bash
curl -sS -X POST "$SPONGE_API_URL/api/transactions/bridge" \
  -H "Authorization: Bearer $SPONGE_API_KEY" \
  -H "Sponge-Version: 0.2.0" \
  -H "Content-Type: application/json" \
  -d '{
    "sourceChain":"solana",
    "destinationChain":"base",
    "token":"SOL",
    "amount":"0.1",
    "destinationToken":"ETH"
  }'
```

### Check transaction status
```bash
curl -sS "$SPONGE_API_URL/api/transactions/status/0xabc123...?chain=base" \
  -H "Authorization: Bearer $SPONGE_API_KEY" \
  -H "Sponge-Version: 0.2.0" \
  -H "Accept: application/json"
```

### Polymarket — Check status
```bash
curl -sS -X POST "$SPONGE_API_URL/api/polymarket" \
  -H "Authorization: Bearer $SPONGE_API_KEY" \
  -H "Sponge-Version: 0.2.0" \
  -H "Content-Type: application/json" \
  -d '{"action":"status"}'
```

### Polymarket — Search markets
```bash
curl -sS -X POST "$SPONGE_API_URL/api/polymarket" \
  -H "Authorization: Bearer $SPONGE_API_KEY" \
  -H "Sponge-Version: 0.2.0" \
  -H "Content-Type: application/json" \
  -d '{"action":"markets","query":"bitcoin","limit":5}'
```

### Polymarket — Place an order
```bash
curl -sS -X POST "$SPONGE_API_URL/api/polymarket" \
  -H "Authorization: Bearer $SPONGE_API_KEY" \
  -H "Sponge-Version: 0.2.0" \
  -H "Content-Type: application/json" \
  -d '{
    "action":"order",
    "market_slug":"will-bitcoin-hit-100k",
    "outcome":"yes",
    "side":"buy",
    "size":10,
    "price":0.65
  }'
```

### Polymarket — View positions
```bash
curl -sS -X POST "$SPONGE_API_URL/api/polymarket" \
  -H "Authorization: Bearer $SPONGE_API_KEY" \
  -H "Sponge-Version: 0.2.0" \
  -H "Content-Type: application/json" \
  -d '{"action":"positions"}'
```

### Polymarket — Withdraw USDC.e
```bash
curl -sS -X POST "$SPONGE_API_URL/api/polymarket" \
  -H "Authorization: Bearer $SPONGE_API_KEY" \
  -H "Sponge-Version: 0.2.0" \
  -H "Content-Type: application/json" \
  -d '{
    "action":"withdraw",
    "to_address":"0x...",
    "amount":"10.00"
  }'
```

### Hyperliquid — Check account status
```bash
curl -sS -X POST "$SPONGE_API_URL/api/hyperliquid" \
  -H "Authorization: Bearer $SPONGE_API_KEY" \
  -H "Sponge-Version: 0.2.0" \
  -H "Content-Type: application/json" \
  -d '{"action":"status"}'
```

### Hyperliquid — Get BTC ticker
```bash
curl -sS -X POST "$SPONGE_API_URL/api/hyperliquid" \
  -H "Authorization: Bearer $SPONGE_API_KEY" \
  -H "Sponge-Version: 0.2.0" \
  -H "Content-Type: application/json" \
  -d '{"action":"ticker","symbol":"BTC/USDC:USDC"}'
```

### Hyperliquid — Place a limit order
```bash
curl -sS -X POST "$SPONGE_API_URL/api/hyperliquid" \
  -H "Authorization: Bearer $SPONGE_API_KEY" \
  -H "Sponge-Version: 0.2.0" \
  -H "Content-Type: application/json" \
  -d '{
    "action":"order",
    "symbol":"BTC/USDC:USDC",
    "side":"buy",
    "type":"limit",
    "amount":"0.001",
    "price":"50000"
  }'
```

### Hyperliquid — View positions
```bash
curl -sS -X POST "$SPONGE_API_URL/api/hyperliquid" \
  -H "Authorization: Bearer $SPONGE_API_KEY" \
  -H "Sponge-Version: 0.2.0" \
  -H "Content-Type: application/json" \
  -d '{"action":"positions"}'
```

### Submit a multi-step plan
```bash
curl -sS -X POST "$SPONGE_API_URL/api/plans/submit" \
  -H "Authorization: Bearer $SPONGE_API_KEY" \
  -H "Sponge-Version: 0.2.0" \
  -H "Content-Type: application/json" \
  -d '{
    "title":"Rebalance to USDC",
    "reasoning":"Taking profit on SOL position and bridging to Base",
    "steps":[
      {"type":"swap","input_token":"SOL","output_token":"USDC","amount":"10","reason":"Take profit on SOL"},
      {"type":"bridge","source_chain":"solana","destination_chain":"base","token":"USDC","amount":"100","reason":"Move USDC to Base"}
    ]
  }'
```

### Approve a plan
```bash
curl -sS -X POST "$SPONGE_API_URL/api/plans/approve" \
  -H "Authorization: Bearer $SPONGE_API_KEY" \
  -H "Sponge-Version: 0.2.0" \
  -H "Content-Type: application/json" \
  -d '{"plan_id":"<plan_id>"}'
```

### Propose a single trade for approval
```bash
curl -sS -X POST "$SPONGE_API_URL/api/trades/propose" \
  -H "Authorization: Bearer $SPONGE_API_KEY" \
  -H "Sponge-Version: 0.2.0" \
  -H "Content-Type: application/json" \
  -d '{
    "input_token":"USDC",
    "output_token":"SOL",
    "amount":"500",
    "reason":"Accumulating SOL at current prices"
  }'
```

### Amazon Checkout — Initiate purchase
```bash
curl -sS -X POST "$SPONGE_API_URL/api/checkout" \
  -H "Authorization: Bearer $SPONGE_API_KEY" \
  -H "Sponge-Version: 0.2.0" \
  -H "Content-Type: application/json" \
  -d '{
    "checkoutUrl":"https://www.amazon.com/dp/B0EXAMPLE",
    "dryRun":true,
    "clearCart":true
  }'
```

### Amazon Checkout — Poll status
```bash
curl -sS "$SPONGE_API_URL/api/checkout/<sessionId>" \
  -H "Authorization: Bearer $SPONGE_API_KEY" \
  -H "Sponge-Version: 0.2.0" \
  -H "Accept: application/json"
```

### Amazon Checkout — Get history
```bash
curl -sS "$SPONGE_API_URL/api/checkout/history?limit=10" \
  -H "Authorization: Bearer $SPONGE_API_KEY" \
  -H "Sponge-Version: 0.2.0" \
  -H "Accept: application/json"
```

### Amazon — Search products
```bash
curl -sS -X POST "$SPONGE_API_URL/api/checkout/amazon-search" \
  -H "Authorization: Bearer $SPONGE_API_KEY" \
  -H "Sponge-Version: 0.2.0" \
  -H "Content-Type: application/json" \
  -d '{"query":"wireless mouse","maxResults":5}'
```

### x402 — Using Paid External Services (Search, Image Gen, Scraping, AI, etc.)

x402 gives you access to a catalog of paid APIs. **If you need a capability you don't have natively** (web search, image generation, web scraping, data enrichment, AI models, etc.), use x402 to discover and call a service.

Always follow this 3-step workflow: **discover → get service details → fetch**.

**IMPORTANT**: Always use the URL from step 2. Do NOT use direct API URLs — most services are proxied through paysponge and direct URLs will fail with auth errors.

#### Step 1: Discover services

```bash
curl -sS "$SPONGE_API_URL/api/x402/discover?limit=10" \
  -H "Authorization: Bearer $SPONGE_API_KEY" \
  -H "Sponge-Version: 0.2.0" \
  -H "Accept: application/json"
```

Returns available x402-enabled services from the Bazaar catalog. Supports semantic search via the `query` parameter (vector embeddings rank results by relevance). Combine with `category` to narrow results.

```bash
# Search by natural language description
curl -sS "$SPONGE_API_URL/api/x402/discover?query=web+scraping+and+crawling" \
  -H "Authorization: Bearer $SPONGE_API_KEY" \
  -H "Sponge-Version: 0.2.0" \
  -H "Accept: application/json"

# Filter by category
curl -sS "$SPONGE_API_URL/api/x402/discover?category=search" \
  -H "Authorization: Bearer $SPONGE_API_KEY" \
  -H "Sponge-Version: 0.2.0" \
  -H "Accept: application/json"
```

Available categories: `search`, `image`, `llm`, `crawl`, `data`, `predict`, `parse`, `prospect`, `person_search`, `crypto_data`

Each result includes: `id`, `name`, `description`, `category`, `endpointCount`.

**The discover response does NOT include endpoint paths, parameters, or the proxy URL needed for `x402_fetch`. You MUST call step 2 next.**

#### Step 2: Get service details (REQUIRED — do not skip)

Once you have a service `id` from step 1 (e.g., `ctg_abc123`), call `GET /api/x402/discover/{serviceId}` to get the service's endpoints, parameters, pricing, and the correct proxy URL:

```bash
curl -sS "$SPONGE_API_URL/api/x402/discover/ctg_abc123" \
  -H "Authorization: Bearer $SPONGE_API_KEY" \
  -H "Sponge-Version: 0.2.0" \
  -H "Accept: application/json"
```

This returns everything you need to construct the `x402_fetch` call:
- **url**: The correct proxy URL to use in step 3 (this is different from the service's raw URL)
- **endpoints**: List of callable endpoints, each with:
  - `method`: HTTP method (GET, POST, etc.)
  - `path`: Endpoint path to append to the service URL
  - `description`: What the endpoint does
  - `price` / `currency`: Cost per call
  - `parameters`: JSON schema for query/path/body params — tells you exactly what to send
  - `instructions`: Free-text usage guide with examples
- **docsUrl**: Link to the service's official API documentation (fallback reference)

**Without this step, you don't know what endpoints exist, what parameters they accept, or what URL to use.**

#### Step 3: Call with x402_fetch

Construct the URL as: **service `url` from step 2** + **endpoint `path` from step 2**. Then call `x402_fetch`:

```bash
curl -sS -X POST "$SPONGE_API_URL/api/x402/fetch" \
  -H "Authorization: Bearer $SPONGE_API_KEY" \
  -H "Sponge-Version: 0.2.0" \
  -H "Content-Type: application/json" \
  -d '{
    "url":"https://paysponge.com/exa/search",
    "method":"POST",
    "body":{"query":"best pizza in NYC","text":true},
    "preferred_chain":"base"
  }'
```

The `x402_fetch` tool handles the entire payment flow automatically:
1. Makes the HTTP request to the specified URL
2. If the service returns 402 Payment Required, extracts payment requirements
3. Creates and signs a USDC payment using the agent's wallet (Base or Solana)
4. Retries the request with the Payment-Signature header
5. Returns the final API response with `payment_made` and `payment_details`

### Tempo Transfer — Send pathUSD on Tempo
```bash
curl -sS -X POST "$SPONGE_API_URL/api/transfers/tempo" \
  -H "Authorization: Bearer $SPONGE_API_KEY" \
  -H "Sponge-Version: 0.2.0" \
  -H "Content-Type: application/json" \
  -d '{
    "to":"0x...",
    "amount":"10",
    "token":"pathUSD"
  }'
```

Supported tokens: `pathUSD` (default), `AlphaUSD`, `BetaUSD`, `ThetaUSD`.

### MPP — Using Paid External Services via Machine Payments Protocol

MPP (Machine Payments Protocol) works just like x402 but pays with Tempo stablecoins (pathUSD) instead of USDC. Use the same 3-step discover flow as x402 to find services and get their endpoints, then call `mpp_fetch` instead of `x402_fetch`.

**When to use MPP vs x402:**
- Use **x402** (`POST /api/x402/fetch`) when paying with USDC on Base/Solana/Ethereum
- Use **MPP** (`POST /api/mpp/fetch`) when paying with pathUSD on Tempo, or when the service accepts MPP payments

**Workflow — same discover steps as x402, different fetch endpoint:**
1. `GET /api/x402/discover?query=...` — find a service (same as x402)
2. `GET /api/x402/discover/{serviceId}` — get endpoints, params, and proxy URL **(do not skip)**
3. `POST /api/mpp/fetch` — call the endpoint using the URL from step 2 (auto-pays with pathUSD on Tempo)

```bash
curl -sS -X POST "$SPONGE_API_URL/api/mpp/fetch" \
  -H "Authorization: Bearer $SPONGE_API_KEY" \
  -H "Sponge-Version: 0.2.0" \
  -H "Content-Type: application/json" \
  -d '{
    "url":"https://paysponge.com/exa/search",
    "method":"POST",
    "body":{"query":"best pizza in NYC","text":true},
    "chain":"tempo"
  }'
```

**Parameters:**
- `url` (required): The proxy URL from step 2 + endpoint path
- `method` (optional): HTTP method — `GET`, `POST`, `PUT`, `DELETE`, `PATCH` (defaults to `GET`)
- `headers` (optional): Additional headers to send with the request
- `body` (optional): Request body for POST/PUT/PATCH requests
- `chain` (optional): `tempo` (testnet) or `tempo-mainnet` (defaults to your key's available Tempo chain)

The `mpp_fetch` tool handles the entire payment flow automatically:
1. Makes the HTTP request to the specified URL
2. If the service returns 402 Payment Required, extracts the MPP payment challenge
3. Creates and signs a pathUSD payment credential using the agent's Tempo wallet
4. Retries the request with the Authorization header containing the MPP credential
5. Returns the final API response with `payment_made` and `payment_details`

## Chain Reference

**Test keys** (`sponge_test_*`): `sepolia`, `base-sepolia`, `solana-devnet`, `tempo`
**Live keys** (`sponge_live_*`): `ethereum`, `base`, `solana`, `tempo-mainnet`

## Error Responses

Errors return JSON with an error message and HTTP status:

```json
{"error":"message"}
```

| Status | Meaning | Common Cause |
|--------|---------|--------------|
| 400 | Bad Request | Missing/invalid fields |
| 401 | Unauthorized | Missing or invalid API key |
| 403 | Forbidden | Address not in allowlist or permission denied |
| 404 | Not Found | Resource does not exist |
| 409 | Conflict | Duplicate action |
| 429 | Rate Limited | Too many requests (back off + retry) |
| 500 | Server Error | Transient; retry later |

## Security

- Never share your API key in logs, posts, or screenshots.
- Store your API key in `~/.spongewallet/credentials.json` and restrict file permissions.
- Rotate the key if exposure is suspected.

---

Built for agents.
