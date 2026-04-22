---
name: sponge-wallet
version: 0.2.1

description: Crypto wallet, token swaps, cross-chain bridges, and access to paid external services (search, image gen, web scraping, AI, and more) via x402 payments.
homepage: https://wallet.paysponge.com
user-invocable: true
metadata: {"openclaw":{"emoji":"\ud83e\uddfd","category":"finance","primaryEnv":"SPONGE_API_KEY","requires":{"env":["SPONGE_API_KEY"]}}}
---

```
SPONGE WALLET API QUICK REFERENCE v0.2.1
Base:   https://api.wallet.paysponge.com
Auth:   Authorization: Bearer <SPONGE_API_KEY>
Ver:    Sponge-Version: 0.2.1  (REQUIRED on every request)
Docs:   This file is canonical (skills guide + params)

Capabilities: wallet + swaps (Solana/Base/Ethereum/Polygon/Arbitrum/Tempo) + bridges + payment links + paid external services (x402 + MPP) + trading + shopping + prepaid cards + banking + virtual cards + onramp

Paid services (search, image gen, scraping, AI, data, etc.):
  GET  /api/discover                     -> Step 1: find services by query/category
  GET  /api/discover/:serviceId          -> Step 2: get endpoints, params, pricing (REQUIRED before fetch)
  POST /api/paid/fetch                   -> Step 3: call service endpoint (auto-selects x402 USDC or MPP on Tempo)
  POST /api/x402/fetch                   -> Step 3 alt: call service endpoint (x402 USDC only)
  POST /api/mpp/fetch                    -> Step 3 alt: call service endpoint (MPP on Tempo; asset negotiated per endpoint, typically USDC.e)
  POST /api/siwe/generate                -> optional SIWE auth for endpoints that require EIP-4361 signatures

Wallet & tokens:
  GET  /api/balances                     -> get balances (includes Polymarket USDC.e)
  POST /api/payment-links                -> create reusable x402 payment link
  GET  /api/payment-links/:paymentLinkId -> get payment link status/details
  POST /api/transfers/evm                -> EVM transfer (ETH/USDC)
  POST /api/transfers/solana             -> Solana transfer (SOL/USDC)
  POST /api/transfers/tempo              -> Tempo transfer (pathUSD/AlphaUSD/BetaUSD/ThetaUSD)
  POST /api/solana/sign                  -> Sign pre-built Solana transaction only
  POST /api/solana/sign-and-send         -> Sign and submit pre-built Solana transaction
  POST /api/transactions/swap            -> Solana swap (DFlow); also supports EVM chains
  POST /api/transactions/swap/quote      -> Solana swap quote only (DFlow)
  POST /api/transactions/swap/execute    -> Execute a previously obtained swap quote
  POST /api/transactions/base-swap       -> Base swap (0x)
  POST /api/transactions/tempo-swap      -> Tempo swap (StablecoinExchange DEX)
  POST /api/transactions/bridge          -> Bridge (Relay)
  MCP: consolidate_usdc                  -> Consolidate USDC from all chains into one
  MCP: token_chart                       -> Token price charts (GeckoTerminal)
  GET  /api/solana/tokens                -> list SPL tokens
  GET  /api/solana/tokens/search         -> search Jupiter token list
  GET  /api/transactions/status/:txHash  -> transaction status
  GET  /api/transactions/history         -> transaction history
  POST /api/wallets/withdraw-to-main     -> withdraw to owner

Secrets & checkout data:
  POST /api/credit-cards                 -> store encrypted card details (dedicated card tool)
  GET  /api/agent-keys                   -> list stored secret metadata
  GET  /api/agent-keys/value             -> retrieve a stored secret value (use `service=credit_card` for cards; this is the only read call needed for personal saved cards)
  DELETE /api/agent-keys                 -> delete saved secret by service (use `service=credit_card` to remove personal saved card)
  POST /api/agent-keys                   -> store non-card service keys (`service=credit_card` is rejected)

Virtual cards (enrolled cards):
  MCP: get_virtual_card                  -> issue virtual card for a specific amount/merchant
  MCP: get_card_session                  -> get secure session to retrieve vaulted card details
  MCP: report_card_usage                 -> report outcome of a purchase attempt

Onramp:
  POST /api/onramp/crypto               -> create fiat-to-crypto onramp link (Stripe/Coinbase)

Planning & proposals:
  POST /api/plans/submit                 -> submit multi-step plan
  POST /api/plans/approve                -> approve and execute plan
  POST /api/trades/propose               -> propose single swap for approval

Prepaid cards (Laso Finance, US only):
  MCP: order_prepaid_card                -> order non-reloadable prepaid Visa ($5-$1000, charged in USDC)
  MCP: get_prepaid_card                  -> get card status/details (poll until "ready")
  MCP: search_prepaid_card_merchants     -> check if a merchant accepts the card

Banking (Bridge.xyz):
  MCP: bank_onboard              -> start KYC, get hosted verification URL
  MCP: bank_status               -> check KYC/onboarding status
  MCP: bank_create_virtual_account -> create/get virtual bank account (USD→USDC deposits)
  MCP: bank_get_virtual_account  -> get deposit instructions for a wallet
  MCP: bank_list_external_accounts -> list linked bank accounts
  MCP: bank_add_external_account -> link US bank account for ACH payouts
  MCP: bank_send                -> off-ramp: send USD to linked bank via ACH (USDC→USD)
  MCP: bank_list_transfers       -> list fiat transfer history

Trading & shopping:
  POST /api/polymarket                     -> Polymarket prediction market trading
  POST /api/hyperliquid                  -> Hyperliquid perps/spot trading
  POST /api/checkout                     -> Amazon checkout (initiate purchase)
  GET  /api/checkout/:sessionId          -> checkout status
  DELETE /api/checkout/:sessionId        -> cancel checkout
  GET  /api/checkout/history             -> checkout history

Auth (one-time setup):
  POST /api/agents/register              -> register (no auth)
  POST /api/oauth/device/authorization   -> device login start (humans)
  POST /api/oauth/device/token           -> device token poll (agents + humans)

Rules: use register (agents), never login | store key in ~/.spongewallet/credentials.json | requests are JSON
Errors: HTTP status + JSON error message
```

# Sponge Wallet API - Agent Skills Guide

This skill is **doc-only**. There is no local CLI. Most capabilities are exposed via the Sponge Wallet REST API, and MCP-only tools are labeled explicitly in this file.

## What you can do with Sponge

1. **Manage crypto** — check balances, transfer tokens (EVM, Solana, and Tempo), swap on Solana/Base/Ethereum/Polygon/Arbitrum/Tempo, bridge cross-chain, view token price charts
   - For pre-built Solana transactions returned by an external API, use `POST /api/solana/sign-and-send`.
   - Use `POST /api/solana/sign` only when you explicitly need a partially/fully signed transaction back without broadcasting.
2. **Create payment links** — generate reusable x402 payment URLs and check payment status
3. **Access paid external services** — search, image generation, web scraping, AI models, data enrichment, and more. Always follow these 3 steps:
   1. `GET /api/discover?query=...` — find a service
   2. `GET /api/discover/{serviceId}` — get its endpoints, params, and payment config **(do not skip)**
   3. `POST /api/paid/fetch` — call the endpoint (auto-selects x402 USDC or MPP on Tempo based on service). Alternatively use `POST /api/x402/fetch` (USDC only) or `POST /api/mpp/fetch` (MPP on Tempo; asset negotiated per endpoint, typically USDC.e).
   - If the target endpoint also requires SIWE auth, generate the signature first with MCP tool `generate_siwe` and include its output in the fetch headers.
4. **Banking** — KYC onboarding, virtual bank accounts (receive USD as USDC), link bank accounts, send USD to bank (off-ramp USDC)
5. **Trade on prediction markets and perps** — Polymarket, Hyperliquid
6. **Shop on Amazon** — checkout with configured Amazon account
7. **Store encrypted card data for checkout** — use the dedicated card tool (`store_credit_card` / `POST /api/credit-cards`)
8. **Virtual cards** — issue virtual cards for web purchases from enrolled cards
9. **Fiat onramp** — buy crypto with card/bank payment via Stripe or Coinbase

**If a task requires an external capability you don't have** (e.g., generating images, searching the web, scraping a URL, looking up a person's email), use the 3-step discover flow above. There is likely a paid service available for it.

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

## MCP SIWE Tool: `generate_siwe`

Use this MCP tool when an external API requires SIWE (EIP-4361) authentication.
REST wrapper endpoint: `POST /api/siwe/generate`.

Required args:
- `domain`
- `uri`

Optional args:
- `statement`, `nonce`, `chain_id`, `expiration_time`, `not_before`, `request_id`, `resources`

Returns:
- `message`, `signature`, `address`, `chainId`, `nonce`, `issuedAt`, `expirationTime`, `base64SiweMessage`

Workflow:
1. Call `generate_siwe` with the exact target `domain` and `uri`.
2. Build the `Authorization` header using returned `signature` and `base64SiweMessage` in the target API's expected format.
3. Pass that header to `/api/x402/fetch` (or `x402_fetch` MCP tool) when calling the protected endpoint.

## CRITICAL: AI Agents Must Use `register`, NOT `login`

### 1) Agent Registration (AI agents only)

There are two modes:
- **Standard device flow** (default): human must approve before the API key is returned.
- **Agent-first** (`agentFirst: true`): agent receives the API key immediately, and the human can claim later.

**Step 1 — Start registration (agent-first recommended)**
```bash
curl -sS -X POST "$SPONGE_API_URL/api/agents/register" \
  -H "Sponge-Version: 0.2.1" \
  -H "Content-Type: application/json" \
  -d '{
    "name":"YourAgentName",
    "agentFirst": true
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
  -H "Sponge-Version: 0.2.1" \
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
  -H "Sponge-Version: 0.2.1" \
  -H "Content-Type: application/json" \
  -d '{
    "clientId":"spongewallet-skill",
    "scope":"wallet:read wallet:write transaction:sign transaction:write"
  }'
```

**Phase 2 — Poll for token** (same endpoint as agents)
```bash
curl -sS -X POST "$SPONGE_API_URL/api/oauth/device/token" \
  -H "Sponge-Version: 0.2.1" \
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
-H "Sponge-Version: 0.2.1" \
-H "Content-Type: application/json" \
-H "Accept: application/json"
```

**Agent ID note:** `agentId` is optional for API key auth. It is only required when using a user session (e.g., Privy-based auth) or when explicitly operating on a different agent.

### API Endpoints Reference

| Endpoint | Method | Path | Params/Body |
|----------|--------|------|-------------|
| Get balances | GET | `/api/balances` | Query: `chain`, `allowedChains`, `onlyUsdc` |
| Create payment link | POST | `/api/payment-links` | Body: `amount`, optional `description`, `max_uses`, `expires_in_minutes`, `callback_url`, `livemode` |
| Get payment link status | GET | `/api/payment-links/{paymentLinkId}` | Query: `agentId` (optional) |
| List SPL tokens | GET | `/api/solana/tokens` | Query: `chain` |
| Search Solana tokens | GET | `/api/solana/tokens/search` | Query: `query`, `limit` |
| Tempo transfer | POST | `/api/transfers/tempo` | Body: `to`, `amount`, `token` (pathUSD/AlphaUSD/BetaUSD/ThetaUSD), optional `data` (hex calldata for raw contract calls) |
| EVM transfer | POST | `/api/transfers/evm` | Body: `chain`, `to`, `amount`, `currency` |
| Solana transfer | POST | `/api/transfers/solana` | Body: `chain`, `to`, `amount`, `currency` |
| Solana swap | POST | `/api/transactions/swap` | Body: `chain`, `inputToken`, `outputToken`, `amount`, `slippageBps` |
| Solana swap quote | POST | `/api/transactions/swap/quote` | Body: `chain`, `inputToken`, `outputToken`, `amount`, `slippageBps` |
| Solana swap execute | POST | `/api/transactions/swap/execute` | Body: `quoteId` |
| Base swap | POST | `/api/transactions/base-swap` | Body: `chain`, `inputToken`, `outputToken`, `amount`, `slippageBps` |
| Tempo swap | POST | `/api/transactions/tempo-swap` | Body: `chain` (tempo), `inputToken`, `outputToken`, `amount`, `slippageBps` |
| Token chart | MCP only | `token_chart` | Args: `network` (solana/base/eth), `token`, optional `interval` (5m/15m/1h/4h/1d), `limit` |
| Bridge | POST | `/api/transactions/bridge` | Body: `sourceChain`, `destinationChain`, `token`, `amount`, `destinationToken`, `recipientAddress` |
| Consolidate USDC | MCP only | `consolidate_usdc` | Args: `destination_chain`, `min_amount` (optional, default `"1"`) |
| Transaction status | GET | `/api/transactions/status/{txHash}` | Query: `chain` |
| Transaction history | GET | `/api/transactions/history` | Query: `limit`, `chain` |
| Store credit card (encrypted) | POST | `/api/credit-cards` | Body (snake_case): `card_number`, `expiration` OR (`expiry_month` + `expiry_year`), `cvc`, `cardholder_name`, `email`, `billing_address`, `shipping_address` (**phone required**), optional `label`, `metadata` |
| Store service key (non-card) | POST | `/api/agent-keys` | Body: `service`, `key`, optional `label`, `metadata` (`service=credit_card` is rejected) |
| List stored keys | GET | `/api/agent-keys` | Query: `agentId` (optional) |
| Get stored key value | GET | `/api/agent-keys/value` | Query: `service` (use `credit_card` for card details) |
| Delete stored key | DELETE | `/api/agent-keys` | Query: `service` (`credit_card` to delete saved personal card), optional `agentId` |
| **Step 1: Discover services** | GET | `/api/discover` | Query: `type`, `limit`, `offset`, `query`, `category` |
| **Step 2: Get service details** | GET | `/api/discover/{serviceId}` | — |
| **Step 3: Paid fetch (unified)** | POST | `/api/paid/fetch` | Body: `url`, `method`, `headers`, `body`, `chain` (preferred wallet chain hint) |
| **Step 3 alt: x402 fetch** | POST | `/api/x402/fetch` | Body: `url`, `method`, `headers`, `body`, `preferred_chain` |
| **Step 3 alt: MPP fetch** | POST | `/api/mpp/fetch` | Body: `url`, `method`, `headers`, `body`, `chain` |
| SIWE signature | POST | `/api/siwe/generate` | Body: `domain`, `uri`; optional: `statement`, `nonce`, `chain_id`, `expiration_time`, `not_before`, `request_id`, `resources` |
| Virtual card | MCP only | `get_virtual_card` | Args: `amount`, `merchant_name`, `merchant_url`; optional: `currency`, `merchant_country_code`, `description`, `products`, `shipping_address`, `enrollment_id` |
| Card session | MCP only | `get_card_session` | Args: optional `amount`, `currency`, `merchant_name`, `merchant_url`, `payment_method_id` |
| Report card usage | MCP only | `report_card_usage` | Args: `payment_method_id`, `status` (success/failed/cancelled); optional: `merchant_name`, `merchant_domain`, `amount`, `currency`, `failure_reason` |
| Crypto onramp | POST | `/api/onramp/crypto` | Body: `wallet_address`; optional: `provider` (auto/stripe/coinbase), `chain` (base/solana/polygon), `fiat_amount`, `fiat_currency` |
| Hyperliquid | POST | `/api/hyperliquid` | Body: `action`, + action-specific params (see below) |
| Amazon checkout | POST | `/api/checkout` | Body: `checkoutUrl`, `amazonAccountId`, `shippingAddress`, `dryRun`, `clearCart` |
| Checkout status | GET | `/api/checkout/{sessionId}` | Query: `agentId` (optional) |
| Checkout history | GET | `/api/checkout/history` | Query: `agentId`, `limit`, `offset` |
| Submit plan | POST | `/api/plans/submit` | Body: `title`, `reasoning`, `steps` (see Planning section) |
| Approve plan | POST | `/api/plans/approve` | Body: `plan_id` |
| Propose trade | POST | `/api/trades/propose` | Body: `input_token`, `output_token`, `amount`, `reason` |
| **Order prepaid card** | MCP only | `order_prepaid_card` | Args: `amount` (5–1000). NON-RELOADABLE, NON-REFUNDABLE. |
| **Get prepaid card** | MCP only | `get_prepaid_card` | Args: `card_id` (optional, omit to list all) |
| **Search card merchants** | MCP only | `search_prepaid_card_merchants` | Args: `query` (merchant name) |
| MPP session | MCP only | `mpp_session` | Args: `action` (start/request/close/list); see MPP Session section |

Note: most request bodies use camelCase (e.g., `inputToken`, `slippageBps`). Card secret endpoints use snake_case fields (e.g., `card_number`, `cardholder_name`).

> **CRITICAL — Paid Services require ALL 3 steps in order:**
> 1. `GET /api/discover` — search for a service by query or category
> 2. `GET /api/discover/{serviceId}` — get the service's endpoints, parameters, pricing, and payment config (**DO NOT SKIP THIS STEP**)
> 3. `POST /api/x402/fetch` — call the endpoint using the URL from step 2
>
> You MUST call step 2 before step 3. Step 2 returns the `paymentsProtocolConfig` (with baseUrls) and the endpoint parameters/instructions needed to construct the fetch request. Using a direct API URL will fail with auth errors.

### Planning (Multi-Step Actions)

Use `submit_plan` whenever you need to do 2+ related actions together (e.g., swap then bridge, buy multiple tokens, rebalance a portfolio). This groups everything into a single proposal the user can review and approve.

**Workflow:**
1. Call `submit_plan` with a title, reasoning, and ordered list of steps
2. Present the plan to the user
3. When the user confirms ("go ahead", "do it", "execute"), call `approve_plan` with the `plan_id`
4. Steps execute sequentially and automatically. If any step fails, the plan pauses for retry or reject.

**Step types:**
- `swap` — requires: `input_token`, `output_token`, `amount`, `reason`; optional: `chain` (defaults to solana; use `base` or `tempo` for other DEXs)
- `transfer` — requires: `chain`, `to`, `amount`, `currency`, `reason`
- `bridge` — requires: `source_chain`, `destination_chain`, `token`, `amount`, `reason`; optional: `destination_token`

**Rules:**
- Do NOT execute steps individually with other tools after submitting a plan — always use `approve_plan`
- Plans can have 1–20 steps
- The user can skip individual steps on the dashboard before approving
- Use `propose_trade` only for a single swap that needs explicit approval; for multi-step flows, always use `submit_plan`

### Polymarket Actions

The `polymarket` endpoint is a unified tool for Polymarket trading, funding, withdrawals, and account status. Pass `action` plus action-specific parameters:

| Action | Description | Required Params | Optional Params |
|--------|-------------|-----------------|-----------------|
| `status` | Check whether Polymarket is linked and view balances | — | — |
| `search_markets` | Search Polymarket markets | `query` | `limit` |
| `get_market` | Fetch market metadata | `market_slug` or `token_id` | — |
| `get_market_price` | Fetch current market price | `market_slug` or `token_id` | — |
| `positions` | View current positions | — | — |
| `orders` | View open orders | — | — |
| `get_order` | Fetch an order by ID | `order_id` | — |
| `balance_allowance` | View CLOB balance + allowance | — | — |
| `refresh_balance_allowance` | Refresh CLOB balance + allowance | — | — |
| `order` | Place a limit or market order | `outcome`, `side`, `size`, `market_slug` or `token_id` | `type`, `price`, `order_type` |
| `cancel` | Cancel an order | `order_id` | — |
| `set_allowances` | Approve contracts for trading | — | — |
| `deposit` | Make Safe-held USDC.e available to the exchange | — | — |
| `deposit_from_wallet` | Move Polygon wallet USDC.e into the Safe | `amount` | — |
| `withdraw` | Withdraw USDC.e to Polygon wallet | `amount` | — |
| `withdraw_native` | Withdraw Polygon-native USDC to Polygon wallet | `amount` | — |
| `redeem` | Redeem settled winning positions | — | `condition_id` |

**Order params:**
- `market_slug` or `token_id`: identify which market to trade
- `outcome`: `"yes"` or `"no"`
- `side`: `"buy"` or `"sell"`
- `size`: number of shares
- `type`: `"limit"` or `"market"`; defaults to `"limit"`
- `price`: required for limit orders, decimal between `0` and `1`
- `order_type`: `"GTC"`, `"GTD"`, `"FOK"`, or `"FAK"`; market orders only support `FOK` or `FAK`

**Scopes:** Trade and funding actions (`order`, `cancel`, `set_allowances`, `deposit`, `deposit_from_wallet`, `withdraw`, `withdraw_native`, `redeem`) require `polymarket:trade`. Read actions require `wallet:read`.

**Provisioning:** Trading and funding calls auto-link Polymarket on first use if the agent has a Polygon/EVM wallet. You can also explicitly enable it with `POST /api/agents/:id/polymarket/enable`.

**Funding:** For cross-chain funding, use the bridge tool with `destination_chain: "polymarket"` so the route lands as USDC.e in the Polymarket Safe.

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

### Tempo Transfer

Send Tempo stablecoins (pathUSD, AlphaUSD, BetaUSD, ThetaUSD) on the Tempo chain.

```bash
curl -sS -X POST "$SPONGE_API_URL/api/transfers/tempo" \
  -H "Authorization: Bearer $SPONGE_API_KEY" \
  -H "Sponge-Version: 0.2.1" \
  -H "Content-Type: application/json" \
  -d '{
    "to":"0x...",
    "amount":"10",
    "token":"pathUSD"
  }'
```

Supported tokens: `pathUSD` (default), `AlphaUSD`, `BetaUSD`, `ThetaUSD`.

For raw contract calls, pass `data` (hex calldata) instead of `token`/`amount`:
```bash
curl -sS -X POST "$SPONGE_API_URL/api/transfers/tempo" \
  -H "Authorization: Bearer $SPONGE_API_KEY" \
  -H "Sponge-Version: 0.2.1" \
  -H "Content-Type: application/json" \
  -d '{
    "to":"0xContractAddress...",
    "amount":"0",
    "data":"0xabcdef..."
  }'
```

### EVM Swaps (Ethereum, Polygon, Arbitrum)

In addition to Solana swaps and Base swaps, swaps are available on Ethereum, Polygon, and Arbitrum via the MCP tools `ethereum_swap`, `polygon_swap`, and `arbitrum_swap`. These use the 0x Protocol aggregator for optimal pricing.

The unified `POST /api/transactions/swap` REST endpoint also supports EVM chains — pass the chain name (e.g., `base`, `ethereum`, `polygon`, `arbitrum-one`) in the `chain` field.

### Swap Quote & Execute (Solana)

For Solana swaps, you can get a quote before executing:

1. **Get quote:** `POST /api/transactions/swap/quote` — returns pricing details and a `quoteId`
2. **Execute:** `POST /api/transactions/swap/execute` with `{ "quoteId": "..." }` — executes the quoted swap

Quotes expire in ~30 seconds. Use this when you want to preview pricing or get user confirmation before swapping.

### Token Price Charts

Get price chart data for any token on Solana, Base, or Ethereum via GeckoTerminal. MCP-only tool: `token_chart`.

Parameters:
- `network`: `"solana"`, `"base"`, or `"eth"`
- `token`: Token address or symbol (e.g., `"SOL"`, `"ETH"`, `"USDC"`, or a contract address)
- `interval`: Candle interval — `"5m"`, `"15m"`, `"1h"` (default), `"4h"`, `"1d"`
- `limit`: Number of candles (default 100, max 1000)

Returns an ASCII sparkline, OHLC price summary, and a link to the web chart.

### Virtual Cards (Enrolled Cards)

If the user has enrolled a card via the dashboard, you can issue virtual cards for specific purchases.

**MCP tools:**
- `get_virtual_card` — issue a virtual card scoped to a specific amount and merchant. Returns card number, expiry, CVC.
- `get_card_session` — get a short-lived session to retrieve full card details (PAN, expiry, CVC) from a vaulted payment method. Returns `session_key` and `retrieve_url`. Immediately fetch: `GET {retrieve_url}` with header `BT-API-KEY: {session_key}`.
- `report_card_usage` — report the outcome (success/failed/cancelled) of a purchase attempt that used a stored card. Logs usage and updates spending records.

### Crypto Onramp

Create a fiat-to-crypto onramp link to fund your wallet with USDC via card or bank payment.

```bash
curl -sS -X POST "$SPONGE_API_URL/api/onramp/crypto" \
  -H "Authorization: Bearer $SPONGE_API_KEY" \
  -H "Sponge-Version: 0.2.1" \
  -H "Content-Type: application/json" \
  -d '{
    "wallet_address":"0x...",
    "chain":"base",
    "fiat_amount":"100"
  }'
```

Returns a hosted checkout URL. Provider is auto-selected (Stripe first, Coinbase fallback). Mainnet chains only.

### MPP — Machine Payments Protocol

MPP works like x402 but settles on Tempo instead of Base/Solana/Ethereum. The asset is negotiated per endpoint (typically USDC.e). Use the same 3-step discover flow, then call `/api/mpp/fetch` instead of `/api/x402/fetch`.

**When to use MPP vs x402:**
- Use **x402** (`POST /api/x402/fetch`) when paying with USDC on Base/Solana/Ethereum
- Use **MPP** (`POST /api/mpp/fetch`) when the endpoint settles on Tempo (asset chosen by the endpoint, e.g. USDC.e)
- Use **paid_fetch** (`POST /api/paid/fetch`) to let the system auto-select the best protocol

```bash
curl -sS -X POST "$SPONGE_API_URL/api/mpp/fetch" \
  -H "Authorization: Bearer $SPONGE_API_KEY" \
  -H "Sponge-Version: 0.2.1" \
  -H "Content-Type: application/json" \
  -d '{
    "url":"https://paysponge.com/exa/search",
    "method":"POST",
    "body":{"query":"best pizza in NYC","text":true},
    "chain":"tempo"
  }'
```

### MPP Session (MCP only)

For multiple paid requests to the same service, use `mpp_session` to open a session with a budget:

Do **not** use `mpp_session` just because the URL is on an MPP/Tempo route. Many MPP endpoints are still one-shot charge flows. Default to `paid_fetch` first; if the response shows `payment_details.intent: "session"` or the endpoint is clearly SSE/streaming, then reuse that endpoint with `mpp_session`.

1. **Start:** `mpp_session(action: "start", max_deposit: "10")` — opens session with budget ceiling
2. **Request:** `mpp_session(action: "request", session_id: "...", url: "...", method: "POST", body: {...})` — makes paid requests within the session
3. **Close:** `mpp_session(action: "close", session_id: "...")` — settles and releases unused deposit
4. **List:** `mpp_session(action: "list")` — inspect existing sessions

### Paid Fetch (Unified)

`POST /api/paid/fetch` is the recommended fetch tool — it auto-selects the best payment route (x402 USDC on Base/Solana/Ethereum, or MPP on Tempo with the endpoint's chosen asset) based on the service's supported protocols and your wallet balances.

```bash
curl -sS -X POST "$SPONGE_API_URL/api/paid/fetch" \
  -H "Authorization: Bearer $SPONGE_API_KEY" \
  -H "Sponge-Version: 0.2.1" \
  -H "Content-Type: application/json" \
  -d '{
    "url":"https://paysponge.com/exa/search",
    "method":"POST",
    "body":{"query":"best pizza in NYC","text":true},
    "chain":"base"
  }'
```

The `chain` parameter is a hint for which wallet to spend from, not a hard requirement — the system falls back automatically if the endpoint doesn't support the requested chain.

### Prepaid Cards (Laso Finance)

Order prepaid Visa debit cards funded with USDC on Base. US merchants only.

**CRITICAL: Cards are NON-RELOADABLE and NON-REFUNDABLE.** Only order a card when you know the exact purchase amount and are ready to buy. Do not order cards speculatively.

**WARNING: Prepaid debit cards are NOT accepted everywhere.** Always ask the user what they want to buy and let them know that not all merchants accept prepaid debit cards. Recommend checking with `search_prepaid_card_merchants` before ordering.

**MCP tools:**
- `order_prepaid_card(amount)` — order a card ($5–$1000). Charges the amount in USDC immediately.
- `get_prepaid_card(card_id?)` — get card status/details. Omit card_id to list all cards.
- `search_prepaid_card_merchants(query)` — check if a merchant accepts the card. Recommended before ordering.

Note: `get_prepaid_card` is only for Laso prepaid cards. Do not use it to retrieve user-saved personal card details.

**Recommended workflow:**
1. **Ask the user what they want to buy** — get the merchant/store name
2. **Let the user know that prepaid debit cards are not accepted everywhere**
3. `search_prepaid_card_merchants(query: "MerchantName")` — check if the merchant accepts the card and share the result with the user
4. Confirm the exact amount with the user
5. `order_prepaid_card(amount: <exact purchase amount>)` — charges USDC on Base
6. `get_prepaid_card(card_id: "<card_id>")` — poll every 2-3 seconds until status is `"ready"` (~7-10 seconds)
7. Use the returned card details (number, CVV, expiry) to complete the purchase

**Costs:**
- Auth: $0.001 USDC (automatic, cached for ~1 hour)
- Card: exact card amount in USDC (e.g., $25 card = 25 USDC)

**Scopes:** `order_prepaid_card` requires `wallet:write` + `transaction:sign`. Read tools require `wallet:read`.

### Credit Card Secret Storage

Use the dedicated card tool for payment card data:
- MCP: `store_credit_card`
- REST: `POST /api/credit-cards`

Do not use `store_key` (or `POST /api/agent-keys`) for cards. `service: "credit_card"` is intentionally rejected there.

For chat agents, collect card details one field at a time in this exact order:
1. `card_number`
2. `expiration` (MM/YYYY)
3. `cvc`
4. `cardholder_name`
5. `billing_address`
6. `shipping_address` (must include `phone`)
7. `email`

Rules:
- Ask exactly one missing field per message.
- Re-ask only the field that is missing or invalid.
- Do not call `store_credit_card` until all required fields are present.
- For user-saved personal card retrieval, call only `get_key_value(service: "credit_card")` (or `GET /api/agent-keys/value?service=credit_card`) and return full values.
- Do not call `get_key_list` for personal card retrieval.
- Do not call `get_prepaid_card` for personal card retrieval.

Example (store + retrieve):
```bash
curl -sS -X POST "$SPONGE_API_URL/api/credit-cards" \
  -H "Authorization: Bearer $SPONGE_API_KEY" \
  -H "Sponge-Version: 0.2.1" \
  -H "Content-Type: application/json" \
  -d '{
    "card_number":"4111111111111111",
    "expiration":"12/2030",
    "cvc":"123",
    "cardholder_name":"Jane Doe",
    "email":"jane@example.com",
    "billing_address":{"line1":"123 Main St","city":"San Francisco","state":"CA","postal_code":"94105","country":"US"},
    "shipping_address":{"line1":"123 Main St","city":"San Francisco","state":"CA","postal_code":"94105","country":"US","phone":"+14155550123"},
    "label":"personal-visa"
  }'

curl -sS "$SPONGE_API_URL/api/agent-keys/value?service=credit_card" \
  -H "Authorization: Bearer $SPONGE_API_KEY" \
  -H "Sponge-Version: 0.2.1" \
  -H "Accept: application/json"
```

## Quick Start

### 1) Register (agents only)
```bash
curl -sS -X POST "$SPONGE_API_URL/api/agents/register" \
  -H "Sponge-Version: 0.2.1" \
  -H "Content-Type: application/json" \
  -d '{
    "name":"YourAgentName",
    "agentFirst": true
  }'
```
Share the claim URL with your human, then store the `apiKey` immediately (agent-first). For standard device flow, poll for the token after approval.

### 2) Check balance
```bash
curl -sS "$SPONGE_API_URL/api/balances?chain=base" \
  -H "Authorization: Bearer $SPONGE_API_KEY" \
  -H "Sponge-Version: 0.2.1" \
  -H "Accept: application/json"
```

### 3) Transfer USDC on Base
```bash
curl -sS -X POST "$SPONGE_API_URL/api/transfers/evm" \
  -H "Authorization: Bearer $SPONGE_API_KEY" \
  -H "Sponge-Version: 0.2.1" \
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
  -H "Sponge-Version: 0.2.1" \
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
  -H "Sponge-Version: 0.2.1" \
  -H "Content-Type: application/json" \
  -d '{
    "chain":"base",
    "inputToken":"ETH",
    "outputToken":"USDC",
    "amount":"0.1",
    "slippageBps":50
  }'
```

### Swap stablecoins on Tempo
```bash
curl -sS -X POST "$SPONGE_API_URL/api/transactions/tempo-swap" \
  -H "Authorization: Bearer $SPONGE_API_KEY" \
  -H "Sponge-Version: 0.2.1" \
  -H "Content-Type: application/json" \
  -d '{
    "chain":"tempo",
    "inputToken":"USDC.e",
    "outputToken":"pathUSD",
    "amount":"10",
    "slippageBps":50
  }'
```

Available Tempo tokens: `pathUSD`, `AlphaUSD`, `BetaUSD`, `ThetaUSD`, `USDC.e` (mainnet only). All are 6-decimal stablecoins routed through the native StablecoinExchange DEX.

### Bridge tokens cross-chain
```bash
curl -sS -X POST "$SPONGE_API_URL/api/transactions/bridge" \
  -H "Authorization: Bearer $SPONGE_API_KEY" \
  -H "Sponge-Version: 0.2.1" \
  -H "Content-Type: application/json" \
  -d '{
    "sourceChain":"solana",
    "destinationChain":"base",
    "token":"SOL",
    "amount":"0.1",
    "destinationToken":"ETH"
  }'
```

### Consolidate USDC from all chains

Consolidate scattered USDC balances across multiple chains into a single destination chain. This capability is **MCP-only**. There is currently **no REST route** for it. The tool discovers USDC on every chain, skips balances below `min_amount`, and bridges each qualifying balance sequentially.

```json
{
  "tool": "consolidate_usdc",
  "arguments": {
    "destination_chain": "base",
    "min_amount": "1"
  }
}
```

Response includes: `balances` (per-chain discovery results), `bridges` (successful bridge txs with tracking URLs), `errors` (failed bridges), `totalConsolidated`, `totalBridges`.

Use this only through MCP: `consolidate_usdc` with `destination_chain` and optional `min_amount`.

### Check transaction status
```bash
curl -sS "$SPONGE_API_URL/api/transactions/status/0xabc123...?chain=base" \
  -H "Authorization: Bearer $SPONGE_API_KEY" \
  -H "Sponge-Version: 0.2.1" \
  -H "Accept: application/json"
```

### Polymarket — Check account status
```bash
curl -sS -X POST "$SPONGE_API_URL/api/polymarket" \
  -H "Authorization: Bearer $SPONGE_API_KEY" \
  -H "Sponge-Version: 0.2.1" \
  -H "Content-Type: application/json" \
  -d '{"action":"status"}'
```

### Polymarket — Search markets
```bash
curl -sS -X POST "$SPONGE_API_URL/api/polymarket" \
  -H "Authorization: Bearer $SPONGE_API_KEY" \
  -H "Sponge-Version: 0.2.1" \
  -H "Content-Type: application/json" \
  -d '{"action":"search_markets","query":"election","limit":5}'
```

### Polymarket — Place a limit order
```bash
curl -sS -X POST "$SPONGE_API_URL/api/polymarket" \
  -H "Authorization: Bearer $SPONGE_API_KEY" \
  -H "Sponge-Version: 0.2.1" \
  -H "Content-Type: application/json" \
  -d '{
    "action":"order",
    "market_slug":"will-bitcoin-be-above-100k-on-december-31-2026",
    "outcome":"yes",
    "side":"buy",
    "size":10,
    "type":"limit",
    "price":0.42,
    "order_type":"GTC"
  }'
```

### Polymarket — Withdraw to Polygon wallet
```bash
curl -sS -X POST "$SPONGE_API_URL/api/polymarket" \
  -H "Authorization: Bearer $SPONGE_API_KEY" \
  -H "Sponge-Version: 0.2.1" \
  -H "Content-Type: application/json" \
  -d '{
    "action":"withdraw",
    "amount":"25"
  }'
```

### Hyperliquid — Check account status
```bash
curl -sS -X POST "$SPONGE_API_URL/api/hyperliquid" \
  -H "Authorization: Bearer $SPONGE_API_KEY" \
  -H "Sponge-Version: 0.2.1" \
  -H "Content-Type: application/json" \
  -d '{"action":"status"}'
```

### Hyperliquid — Get BTC ticker
```bash
curl -sS -X POST "$SPONGE_API_URL/api/hyperliquid" \
  -H "Authorization: Bearer $SPONGE_API_KEY" \
  -H "Sponge-Version: 0.2.1" \
  -H "Content-Type: application/json" \
  -d '{"action":"ticker","symbol":"BTC/USDC:USDC"}'
```

### Hyperliquid — Place a limit order
```bash
curl -sS -X POST "$SPONGE_API_URL/api/hyperliquid" \
  -H "Authorization: Bearer $SPONGE_API_KEY" \
  -H "Sponge-Version: 0.2.1" \
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
  -H "Sponge-Version: 0.2.1" \
  -H "Content-Type: application/json" \
  -d '{"action":"positions"}'
```

### Submit a multi-step plan
```bash
curl -sS -X POST "$SPONGE_API_URL/api/plans/submit" \
  -H "Authorization: Bearer $SPONGE_API_KEY" \
  -H "Sponge-Version: 0.2.1" \
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
  -H "Sponge-Version: 0.2.1" \
  -H "Content-Type: application/json" \
  -d '{"plan_id":"<plan_id>"}'
```

### Propose a single trade for approval
```bash
curl -sS -X POST "$SPONGE_API_URL/api/trades/propose" \
  -H "Authorization: Bearer $SPONGE_API_KEY" \
  -H "Sponge-Version: 0.2.1" \
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
  -H "Sponge-Version: 0.2.1" \
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
  -H "Sponge-Version: 0.2.1" \
  -H "Accept: application/json"
```

### Amazon Checkout — Get history
```bash
curl -sS "$SPONGE_API_URL/api/checkout/history?limit=10" \
  -H "Authorization: Bearer $SPONGE_API_KEY" \
  -H "Sponge-Version: 0.2.1" \
  -H "Accept: application/json"
```

### Using Paid External Services (Search, Image Gen, Scraping, AI, etc.)

The catalog gives you access to paid APIs via x402 (USDC on Base/Solana/Ethereum) or MPP (Tempo, asset negotiated per endpoint — typically USDC.e). **If you need a capability you don't have natively** (web search, image generation, web scraping, data enrichment, AI models, etc.), discover and call a service.

Always follow this 3-step workflow: **discover → get service details → fetch**.

**IMPORTANT**: Always use the URL from step 2. Do NOT use direct API URLs — most services are proxied through paysponge and direct URLs will fail with auth errors.

#### Step 1: Discover services

```bash
curl -sS "$SPONGE_API_URL/api/discover?limit=10" \
  -H "Authorization: Bearer $SPONGE_API_KEY" \
  -H "Sponge-Version: 0.2.1" \
  -H "Accept: application/json"
```

Returns available paid services from the catalog. Supports semantic search via the `query` parameter (vector embeddings rank results by relevance). Combine with `category` to narrow results.

```bash
# Search by natural language description
curl -sS "$SPONGE_API_URL/api/discover?query=web+scraping+and+crawling" \
  -H "Authorization: Bearer $SPONGE_API_KEY" \
  -H "Sponge-Version: 0.2.1" \
  -H "Accept: application/json"

# Filter by category
curl -sS "$SPONGE_API_URL/api/discover?category=search" \
  -H "Authorization: Bearer $SPONGE_API_KEY" \
  -H "Sponge-Version: 0.2.1" \
  -H "Accept: application/json"
```

Available categories: `search`, `image`, `llm`, `crawl`, `data`, `predict`, `parse`, `prospect`, `person_search`, `crypto_data`

Each result includes: `id`, `name`, `description`, `category`, `endpointCount`.

**The discover response does NOT include endpoint paths, parameters, or the baseUrl needed for fetch. You MUST call step 2 next.**

#### Step 2: Get service details (REQUIRED — do not skip)

Once you have a service `id` from step 1 (e.g., `ctg_abc123`), call `GET /api/discover/{serviceId}` to get the service's endpoints, parameters, pricing, and payment config:

```bash
curl -sS "$SPONGE_API_URL/api/discover/ctg_abc123" \
  -H "Authorization: Bearer $SPONGE_API_KEY" \
  -H "Sponge-Version: 0.2.1" \
  -H "Accept: application/json"
```

This returns everything you need to construct the fetch call:
- **paymentsProtocolConfig**: Array of payment options, each with:
  - `baseUrl`: The proxy URL to use in step 3
  - `protocol`: `x402` or `mpp`
  - `networks`: Supported networks (e.g. `["base", "solana"]` for x402, `["tempo"]` for mpp)
- **endpoints**: List of callable endpoints, each with:
  - `method`: HTTP method (GET, POST, etc.)
  - `path`: Endpoint path to append to the baseUrl
  - `description`: What the endpoint does
  - `price` / `currency`: Cost per call
  - `parameters`: JSON schema for query/path/body params — tells you exactly what to send
  - `instructions`: Free-text usage guide with examples
- **openapiSpecUrl**: URL to the service's OpenAPI spec. Only fetch it if `parameters` / `instructions` on the endpoint don't tell you enough to build the request body.
- **docsUrl**: Link to the service's official API documentation (fallback reference)

**Without this step, you don't know what endpoints exist, what parameters they accept, or what URL to use.**

#### Step 3: Call with fetch

Pick a protocol from `paymentsProtocolConfig` and construct the URL as: **`baseUrl`** + **endpoint `path`**. Then call fetch via `/api/paid/fetch` (recommended — auto-selects protocol), `/api/x402/fetch` (x402 USDC only), or `/api/mpp/fetch` (MPP on Tempo; asset negotiated per endpoint):

```bash
curl -sS -X POST "$SPONGE_API_URL/api/paid/fetch" \
  -H "Authorization: Bearer $SPONGE_API_KEY" \
  -H "Sponge-Version: 0.2.1" \
  -H "Content-Type: application/json" \
  -d '{
    "url":"https://paysponge.com/exa/search",
    "method":"POST",
    "body":{"query":"best pizza in NYC","text":true},
    "chain":"base"
  }'
```

The fetch endpoint handles the entire payment flow automatically:
1. Makes the HTTP request to the specified URL
2. If the service returns 402 Payment Required, extracts payment requirements
3. Creates and signs a payment using the agent's wallet (USDC for x402; for MPP, the asset the endpoint requested — typically USDC.e)
4. Retries the request with the payment header
5. Returns the final API response with `payment_made` and `payment_details`

If `payment_details.intent` comes back as `"session"`, that means the endpoint supports Tempo session payments. For follow-up calls to that same endpoint, switch to `mpp_session` instead of repeatedly creating one-shot calls.

#### Fetching an OpenAPI spec when you need it

If the `parameters` / `instructions` from step 2 aren't enough to build the request body — or the user points at a service that `GET /api/discover` doesn't know about — use the `get_openapi_spec` MCP tool. It accepts one of:

- `service_id`: a catalog service id (returns the cached spec, no network fetch).
- `url`: either a direct OpenAPI URL (e.g. `https://api.example.com/openapi.json`) or a base URL. For a base URL, common paths are probed automatically (`/openapi.json`, `/openapi.yaml`, `/.well-known/x402`, `/docs/openapi.json`, `/swagger.json`, etc.).

Returns `{ spec, sourceUrl, format, status }`. `status: "ok"` means the spec was found; `status: "not_found"` means none was discovered — fall back to `docsUrl` or your best guess. Only call this tool when you actually need the spec; specs can be large.

## Banking (Bridge.xyz) — MCP only

Receive and send USD via bank accounts. All tools are MCP-only (not REST).

### Setup flow

1. **Onboard** — `bank_onboard` to start KYC. Returns a hosted URL for identity verification.
2. **Check status** — `bank_status` to poll KYC progress (pending → approved).
3. Once approved, you can:
   - **Receive USD as USDC** (on-ramp): create a virtual bank account, get deposit instructions, share them with sender
   - **Send USD to a bank** (off-ramp): link an external bank account, then send wire/ACH

### On-ramp: USD → USDC (virtual accounts)

```
# 1. Create or get virtual account for a wallet (idempotent — returns existing if one exists)
MCP: bank_create_virtual_account  { wallet_id: "<uuid>" }

# 2. Get deposit instructions (account number, routing number)
MCP: bank_get_virtual_account     { wallet_id: "<uuid>" }
```

When someone sends USD to the virtual account's bank details, it's automatically converted to USDC and deposited into the wallet. Supported chains: Ethereum, Base, Solana.

### Off-ramp: USDC → USD (ACH)

```
# 1. Link a US bank account
MCP: bank_add_external_account  {
  bank_name, account_owner_name, routing_number, account_number,
  checking_or_savings, street_line_1, city, state, postal_code
}

# 2. List linked accounts (get external_account_id)
MCP: bank_list_external_accounts

# 3. Send USD via ACH (converts USDC from wallet → USD)
MCP: bank_send  { wallet_id, external_account_id, amount: "100.00" }

# 4. Check transfer status
MCP: bank_list_transfers  { transfer_id?: "<uuid>" }
```

ACH settlement: typically 1-3 business days.

## Chain Reference

Supported chains: `ethereum`, `base`, `polygon`, `arbitrum-one`, `tempo`, `solana`.

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
