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

Capabilities: wallet + swaps (Solana/Base/Ethereum/Polygon/Arbitrum/Tempo) + bridges + payment links + paid external services (x402 + MPP) + trading + shopping + banking + Sponge Card + onramp

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
  POST /api/virtual-cards                -> issue a virtual card scoped to amount and merchant
  POST /api/card-sessions                -> get a short-lived session to retrieve vaulted card details
  POST /api/card-usage                   -> report outcome of a purchase attempt

Sponge Card (beta preview):
  GET  /api/sponge-card/status           -> onboarding/consent/card readiness status
  POST /api/sponge-card/onboard          -> submit KYC application + consent acknowledgements
  POST /api/sponge-card/terms            -> accept terms for an existing application
  POST /api/sponge-card/create-card      -> create the virtual Sponge Card after approval
  GET  /api/sponge-card/details          -> encrypted PAN/CVC + secret_key + spending power (decrypt client-side)
  POST /api/sponge-card/fund             -> top up card collateral with USDC from your wallet
  POST /api/sponge-card/withdraw         -> withdraw card collateral back to your wallet

Onramp:
  POST /api/onramp/crypto               -> create fiat-to-crypto onramp link (Stripe/Coinbase)

Planning & proposals:
  POST /api/plans/submit                 -> submit multi-step plan
  POST /api/plans/approve                -> approve and execute plan
  POST /api/trades/propose               -> propose single swap for approval

Banking (Bridge.xyz):
  POST /api/bank/onboard          -> start KYC, get hosted verification URL
  GET  /api/bank/status           -> check KYC/onboarding status
  POST /api/bank/virtual-account  -> create/get virtual bank account (USD→USDC deposits)
  GET  /api/bank/virtual-account  -> get deposit instructions for a wallet
  GET  /api/bank/external-accounts -> list linked bank accounts
  POST /api/bank/external-accounts -> link US bank account for ACH or wire payouts
  POST /api/bank/send             -> off-ramp: send USD to linked bank via ACH or wire (USDC→USD)
  GET  /api/bank/transfers        -> list fiat transfer history

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

This skill is **doc-only**. There is no local CLI. It documents the public Sponge Wallet REST API only.

## What you can do with Sponge

1. **Manage crypto** — check balances, transfer tokens (EVM, Solana, and Tempo), swap on Solana/Base/Ethereum/Polygon/Arbitrum/Tempo, bridge cross-chain
   - For pre-built Solana transactions returned by an external API, use `POST /api/solana/sign-and-send`.
   - Use `POST /api/solana/sign` only when you explicitly need a partially/fully signed transaction back without broadcasting.
2. **Create payment links** — generate reusable x402 payment URLs and check payment status
3. **Access paid external services** — search, image generation, web scraping, AI models, data enrichment, and more. Always follow these 3 steps:
   1. `GET /api/discover?query=...` — find a service
   2. `GET /api/discover/{serviceId}` — get its endpoints, params, and payment config **(do not skip)**
   3. `POST /api/paid/fetch` — call the endpoint (auto-selects x402 USDC or MPP on Tempo based on service). Alternatively use `POST /api/x402/fetch` (USDC only) or `POST /api/mpp/fetch` (MPP on Tempo; asset negotiated per endpoint, typically USDC.e).
   - If the target endpoint also requires SIWE auth, call `POST /api/siwe/generate` first and include its output in the fetch headers.
4. **Banking** — KYC onboarding, virtual bank accounts (receive USD as USDC), link bank accounts, send USD to bank (off-ramp USDC)
5. **Trade on prediction markets and perps** — Polymarket, Hyperliquid
6. **Shop on Amazon** — checkout with configured Amazon account
7. **Store encrypted card data for checkout** — use `POST /api/credit-cards`
8. **Use enrolled virtual cards** — issue scoped card credentials for a purchase or retrieve vaulted card details through a short-lived session
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

## SIWE Signature

Use `POST /api/siwe/generate` when an external API requires SIWE (EIP-4361) authentication.

Required args:
- `domain`
- `uri`

Optional args:
- `statement`, `nonce`, `chain_id`, `expiration_time`, `not_before`, `request_id`, `resources`

Returns:
- `message`, `signature`, `address`, `chainId`, `nonce`, `issuedAt`, `expirationTime`, `base64SiweMessage`

Workflow:
1. Call `POST /api/siwe/generate` with the exact target `domain` and `uri`.
2. Build the `Authorization` header using returned `signature` and `base64SiweMessage` in the target API's expected format.
3. Pass that header to `/api/paid/fetch` or `/api/x402/fetch` when calling the protected endpoint.

## CRITICAL: AI Agents Must Use `register`, NOT `login`

### 1) Agent Registration (AI agents only)

There are two modes:
- **Standard auth flow** (default): human must approve before the API key is returned.
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

**Step 3 — Poll for completion (standard auth flow only)**
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

Note: In **agent-first mode**, you already have the `apiKey` from Step 1. The auth token will remain pending until the human claims.

### 2) Human Login (existing accounts only)

**Phase 1 — Request device code**
```bash
curl -sS -X POST "$SPONGE_API_URL/api/oauth/device/authorization" \
  -H "Sponge-Version: 0.2.1" \
  -H "Content-Type: application/json" \
  -d '{
    "clientId":"spongewallet-skill"
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

Use the public REST endpoints documented in this file. Internal-only tools are intentionally omitted.

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
| Bridge | POST | `/api/transactions/bridge` | Body: `sourceChain`, `destinationChain`, `token`, `amount`, `destinationToken`, `recipientAddress` |
| Transaction status | GET | `/api/transactions/status/{txHash}` | Query: `chain` |
| Transaction history | GET | `/api/transactions/history` | Query: `limit`, `chain` |
| Store credit card (encrypted) | POST | `/api/credit-cards` | Body (snake_case): `card_number`, `expiration` OR (`expiry_month` + `expiry_year`), `cvc`, `cardholder_name`, `email`, `billing_address`, `shipping_address` (**phone required**), optional `label`, `metadata` |
| Issue virtual card | POST | `/api/virtual-cards` | Body: `amount`, `merchant_name`, `merchant_url`; optional: `currency`, `merchant_country_code`, `description`, `products`, `shipping_address`, `enrollment_id`, `agentId` |
| Create card session | POST | `/api/card-sessions` | Body: optional `amount`, `currency`, `merchant_name`, `merchant_url`, `payment_method_id`, `agentId` |
| Report card usage | POST | `/api/card-usage` | Body: `payment_method_id`, `status` (success/failed/cancelled); optional: `merchant_name`, `merchant_domain`, `amount`, `currency`, `failure_reason`, `agentId` |
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
| **Sponge Card status** (admin) | GET | `/api/sponge-card/status` | Query: optional `refresh`, `agentId` |
| **Onboard Sponge Card** (admin) | POST | `/api/sponge-card/onboard` | Body: KYC fields, consent booleans, optional `email`, `phone_*`, `agentId` |
| **Accept Sponge Card terms** (admin) | POST | `/api/sponge-card/terms` | Body: consent booleans, optional `agentId` |
| **Create Sponge Card** (admin) | POST | `/api/sponge-card/create-card` | Body: `billing`, `email`, `phone`, optional `shipping`, `agentId` |
| **Sponge Card details** (admin) | GET | `/api/sponge-card/details` | Query: `agentId` (optional) |
| **Fund Sponge Card** (admin) | POST | `/api/sponge-card/fund` | Body: `amount`, optional `chain`, `agentId` |
| **Withdraw from Sponge Card** (admin) | POST | `/api/sponge-card/withdraw` | Body: `amount`, optional `chain`, `agentId` |
| Banking onboard | POST | `/api/bank/onboard` | Body: optional `wallet_id`, `redirect_uri`, `customer_type`, `agentId` |
| Banking status | GET | `/api/bank/status` | Query: optional `agentId` |
| Create virtual bank account | POST | `/api/bank/virtual-account` | Body: `wallet_id`, optional `agentId` |
| Get virtual bank account | GET | `/api/bank/virtual-account` | Query: optional `wallet_id`, `agentId` |
| List linked bank accounts | GET | `/api/bank/external-accounts` | Query: optional `agentId` |
| Link bank account | POST | `/api/bank/external-accounts` | Body (snake_case): `bank_name`, `account_owner_name`, `routing_number`, `account_number`, `checking_or_savings`, `street_line_1`, optional `street_line_2`, `city`, `state`, `postal_code`, optional `agentId` |
| Send USD to bank | POST | `/api/bank/send` | Body: `wallet_id`, `external_account_id`, `amount`, optional `payment_rail` (ach/wire), `agentId` |
| List bank transfers | GET | `/api/bank/transfers` | Query: optional `transfer_id`, `agentId` |
| Crypto onramp | POST | `/api/onramp/crypto` | Body: `wallet_address`; optional: `provider` (auto/stripe/coinbase), `chain` (base/solana/polygon), `fiat_amount`, `fiat_currency` |
| Hyperliquid | POST | `/api/hyperliquid` | Body: `action`, + action-specific params (see below) |
| Amazon checkout | POST | `/api/checkout` | Body: `checkoutUrl`, `amazonAccountId`, `shippingAddress`, `dryRun`, `clearCart` |
| Checkout status | GET | `/api/checkout/{sessionId}` | Query: `agentId` (optional) |
| Checkout history | GET | `/api/checkout/history` | Query: `agentId`, `limit`, `offset` |
| Submit plan | POST | `/api/plans/submit` | Body: `title`, `reasoning`, `steps` (see Planning section) |
| Approve plan | POST | `/api/plans/approve` | Body: `plan_id` |
| Propose trade | POST | `/api/trades/propose` | Body: `input_token`, `output_token`, `amount`, `reason` |
Note: most request bodies use camelCase (e.g., `inputToken`, `slippageBps`). Card secret endpoints and Sponge Card API endpoints use snake_case fields (e.g., `card_number`, `cardholder_name`, `first_name`, `postal_code`).

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

The unified `POST /api/transactions/swap` REST endpoint supports EVM chains. Pass the chain name (e.g., `base`, `ethereum`, `polygon`, `arbitrum-one`) in the `chain` field.

### Swap Quote & Execute (Solana)

For Solana swaps, you can get a quote before executing:

1. **Get quote:** `POST /api/transactions/swap/quote` — returns pricing details and a `quoteId`
2. **Execute:** `POST /api/transactions/swap/execute` with `{ "quoteId": "..." }` — executes the quoted swap

Quotes expire in ~30 seconds. Use this when you want to preview pricing or get user confirmation before swapping.

### Sponge Card (beta preview)

The Sponge Card is a stablecoin-collateralized credit card. Access is gated during beta — ineligible calls return 403 `Forbidden`.

Environment (dev vs production) is fixed by your API key type: `sponge_test_*` -> dev sandbox, `sponge_live_*` -> production.

The full no-UI flow is:

1. `GET /api/sponge-card/status` - check onboarding and card readiness.
2. `POST /api/sponge-card/onboard` - submit KYC data and consent acknowledgements.
3. If status says consent is missing, `POST /api/sponge-card/terms`.
4. When `ready_for_card_creation` is true, `POST /api/sponge-card/create-card`.
5. Use `/details`, `/fund`, and `/withdraw` after a card exists.

#### Check onboarding status

```bash
curl -sS "$SPONGE_API_URL/api/sponge-card/status?refresh=true" \
  -H "Authorization: Bearer $SPONGE_API_KEY" \
  -H "Sponge-Version: 0.2.1" \
  -H "Accept: application/json"
```

Returns `onboarded`, `environment`, `ready_for_card_creation`, `customer`, `completion_link_url`, `cards`, `balances`, and `message`. If `completion_link_url` is present, Rain needs hosted identity/document verification. Have the user complete that URL outside Sponge, then poll status again.

#### Onboard for Sponge Card

Submit the same KYC and consent data collected by the dashboard. Bodies use snake_case.

```bash
curl -sS -X POST "$SPONGE_API_URL/api/sponge-card/onboard" \
  -H "Authorization: Bearer $SPONGE_API_KEY" \
  -H "Sponge-Version: 0.2.1" \
  -H "Content-Type: application/json" \
  -d '{
    "email":"user@example.com",
    "first_name":"Ada",
    "last_name":"Lovelace",
    "birth_date":"1990-01-01",
    "national_id":"123456789",
    "country_of_issue":"US",
    "phone_country_code":"1",
    "phone_number":"4155550100",
    "address":{
      "line1":"123 Market St",
      "city":"San Francisco",
      "region":"CA",
      "postal_code":"94105",
      "country_code":"US"
    },
    "occupation":"Software engineer",
    "e_sign_consent":true,
    "account_opening_privacy_notice":true,
    "sponge_card_terms":true,
    "information_certification":true,
    "unauthorized_solicitation_acknowledgement":true
  }'
```

- `email` is optional if the authenticated user email is available.
- `national_id` is sensitive. Do not log, store, or echo it after submission.
- `account_opening_privacy_notice` is required when `address.country_code` is `US`.

Returns `submitted_application`, `environment`, `ready_for_card_creation`, `customer`, `completion_link_url`, and `message`.

#### Accept Sponge Card terms

Use this only when `/status` says the Rain application is approved but Sponge consent is missing.

```bash
curl -sS -X POST "$SPONGE_API_URL/api/sponge-card/terms" \
  -H "Authorization: Bearer $SPONGE_API_KEY" \
  -H "Sponge-Version: 0.2.1" \
  -H "Content-Type: application/json" \
  -d '{
    "e_sign_consent":true,
    "account_opening_privacy_notice":true,
    "sponge_card_terms":true,
    "information_certification":true,
    "unauthorized_solicitation_acknowledgement":true
  }'
```

#### Create a Sponge Card

Call this after status returns `ready_for_card_creation: true`. If a card already exists for this API-key environment, the API returns the existing card instead of issuing a duplicate.

```bash
curl -sS -X POST "$SPONGE_API_URL/api/sponge-card/create-card" \
  -H "Authorization: Bearer $SPONGE_API_KEY" \
  -H "Sponge-Version: 0.2.1" \
  -H "Content-Type: application/json" \
  -d '{
    "billing":{
      "line1":"123 Market St",
      "city":"San Francisco",
      "region":"CA",
      "postal_code":"94105",
      "country_code":"US"
    },
    "email":"user@example.com",
    "phone":"+14155550100"
  }'
```

Returns `created`, `environment`, `card`, and `message`.

#### Fetch card details (encrypted)

```bash
curl -sS "$SPONGE_API_URL/api/sponge-card/details" \
  -H "Authorization: Bearer $SPONGE_API_KEY" \
  -H "Sponge-Version: 0.2.1" \
  -H "Accept: application/json"
```

Returns `last4`, `expiration_month`, `expiration_year`, `type`, `status`, `spending_power_cents`, plus an encrypted PAN + CVC blob and a one-time `secret_key`. Plaintext card numbers never exist on the backend — **you must decrypt locally** with AES-128-GCM:

```js
const { webcrypto } = require("crypto");
async function decrypt({ iv, data }, secretKeyHex) {
  const key = await webcrypto.subtle.importKey(
    "raw",
    Buffer.from(secretKeyHex, "hex"),
    { name: "AES-GCM" },
    false,
    ["decrypt"],
  );
  const pt = await webcrypto.subtle.decrypt(
    { name: "AES-GCM", iv: Buffer.from(iv, "base64") },
    key,
    Buffer.from(data, "base64"),
  );
  return new TextDecoder().decode(pt);
}
const pan = await decrypt(result.encrypted_pan, result.secret_key);
const cvc = await decrypt(result.encrypted_cvc, result.secret_key);
```

Treat the decrypted PAN/CVC as highly sensitive: do not log, persist, or echo to non-cardholder destinations.

#### Fund the card

Send USDC from your wallet to the collateral deposit address to increase the card's spending power. Sponge credits the deposit once the transfer confirms (1–2 blocks on EVM, seconds on Solana).

```bash
curl -sS -X POST "$SPONGE_API_URL/api/sponge-card/fund" \
  -H "Authorization: Bearer $SPONGE_API_KEY" \
  -H "Sponge-Version: 0.2.1" \
  -H "Content-Type: application/json" \
  -d '{"amount":"100","chain":"base"}'
```

- `amount`: USDC in human-readable units (e.g. `"100"`, `"100.50"`). Positive decimal.
- `chain`: optional. Required only if the user has more than one collateral contract. Allowed: `base`, `ethereum`, `polygon`, `arbitrum-one`, `solana`.

Returns `tx_hash`, `chain_id`, `to_address`, `token_address`, `amount`.

#### Withdraw from the card

Pull USDC back from the collateral contract to your wallet. Reduces the card's spending power.

```bash
curl -sS -X POST "$SPONGE_API_URL/api/sponge-card/withdraw" \
  -H "Authorization: Bearer $SPONGE_API_KEY" \
  -H "Sponge-Version: 0.2.1" \
  -H "Content-Type: application/json" \
  -d '{"amount":"50.25","chain":"base"}'
```

- `amount`: USD with max 2 decimal places (e.g. `"50"`, `"50.25"`). Positive.
- `chain`: optional — same rules as `fund`.

Returns `tx_hash`, `chain_id`, `amount`, `recipient_address`.

Notes:
- Solana withdrawals run as two transactions (submit admin signature, then withdraw); only the final tx hash is returned.
- Sponge rate-limits withdrawal authorizations. If a previous signature is still active you'll get a "retry after N seconds" error.

**Scopes:** `/api/sponge-card/status` and `/api/sponge-card/details` require `payment:read`. `/api/sponge-card/onboard` requires `wallet:write` + `payment:write`. `/api/sponge-card/terms` and `/api/sponge-card/create-card` require `payment:write`. `/api/sponge-card/fund` and `/api/sponge-card/withdraw` require `wallet:write` + `transaction:sign` + `transaction:write`.

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

### Credit Card Secret Storage

Use `POST /api/credit-cards` for payment card data.

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
- Do not submit the card until all required fields are present.
- For user-saved personal card retrieval, call only `get_key_value(service: "credit_card")` (or `GET /api/agent-keys/value?service=credit_card`) and return full values.
- Do not call `get_key_list` for personal card retrieval.

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

### Virtual Cards (Enrolled Cards)

If the user has enrolled a card via the dashboard, you can issue virtual cards for specific purchases.

#### Issue a scoped virtual card

```bash
curl -sS -X POST "$SPONGE_API_URL/api/virtual-cards" \
  -H "Authorization: Bearer $SPONGE_API_KEY" \
  -H "Sponge-Version: 0.2.1" \
  -H "Content-Type: application/json" \
  -d '{
    "amount":"49.99",
    "merchant_name":"Netflix",
    "merchant_url":"https://www.netflix.com",
    "merchant_country_code":"US",
    "description":"Monthly subscription"
  }'
```

Returns fresh card credentials (`card_number`, `expiration_month`, `expiration_year`, `cvc`) plus `expires_at` and `instruction_id`.

#### Create a short-lived card session

Use this when you need to retrieve full vaulted card details from Basis Theory. The session expires quickly, so fetch the retrieve URL immediately with the returned `session_key`.

```bash
curl -sS -X POST "$SPONGE_API_URL/api/card-sessions" \
  -H "Authorization: Bearer $SPONGE_API_KEY" \
  -H "Sponge-Version: 0.2.1" \
  -H "Content-Type: application/json" \
  -d '{
    "amount":"49.99",
    "merchant_name":"Netflix",
    "merchant_url":"https://www.netflix.com"
  }'
```

Then immediately fetch the returned `retrieve_url`:

```bash
curl -sS "<retrieve_url>" \
  -H "BT-API-KEY: <session_key>"
```

The card data is returned in `data.number`, `data.expiration_month`, `data.expiration_year`, and `data.cvc`.

#### Report card usage

Use this after checkout to log the outcome of a purchase attempt.

```bash
curl -sS -X POST "$SPONGE_API_URL/api/card-usage" \
  -H "Authorization: Bearer $SPONGE_API_KEY" \
  -H "Sponge-Version: 0.2.1" \
  -H "Content-Type: application/json" \
  -d '{
    "payment_method_id":"pm_123",
    "merchant_name":"Netflix",
    "amount":"49.99",
    "currency":"USD",
    "status":"success"
  }'
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
Share the claim URL with your human, then store the `apiKey` immediately (agent-first). For standard auth flow, poll for the token after approval.

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

#### Fetching an OpenAPI spec when you need it

If the `parameters` / `instructions` from step 2 are not enough to build the request body, fall back to the service `docsUrl` returned by `GET /api/discover/{serviceId}` or the provider's official API docs.

## Banking (Bridge.xyz)

Receive and send USD via bank accounts over REST.

### Setup flow

1. **Onboard** — `POST /api/bank/onboard` to start KYC. Returns a hosted URL for identity verification unless the customer is already active.
2. **Check status** — `GET /api/bank/status` to poll KYC progress (pending → approved).
3. Once approved, you can:
   - **Receive USD as USDC** (on-ramp): create a virtual bank account, get deposit instructions, share them with sender
   - **Send USD to a bank** (off-ramp): link an external bank account, then send wire/ACH

### On-ramp: USD → USDC (virtual accounts)

```
# 1. Create or get virtual account for a wallet (idempotent — returns existing if one exists)
POST /api/bank/virtual-account  { "wallet_id": "<uuid>" }

# 2. Get deposit instructions (account number, routing number)
GET /api/bank/virtual-account?wallet_id=<uuid>
```

When someone sends USD to the virtual account's bank details, it's automatically converted to USDC and deposited into the wallet. Supported chains: Ethereum, Base, Solana.

### Off-ramp: USDC → USD (ACH or wire)

```
# 1. Link a US bank account
POST /api/bank/external-accounts  {
  "bank_name":"Bank of America",
  "account_owner_name":"Jane Doe",
  "routing_number":"021000021",
  "account_number":"1234567890",
  "checking_or_savings":"checking",
  "street_line_1":"123 Main St",
  "city":"San Francisco",
  "state":"CA",
  "postal_code":"94105"
}

# 2. List linked accounts (get external_account_id)
GET /api/bank/external-accounts

# 3. Send USD via ACH or wire (converts USDC from wallet → USD)
POST /api/bank/send  { "wallet_id":"<uuid>", "external_account_id":"<uuid>", "amount":"100.00", "payment_rail":"ach" }
POST /api/bank/send  { "wallet_id":"<uuid>", "external_account_id":"<uuid>", "amount":"100.00", "payment_rail":"wire" }

# 4. Check transfer status
GET /api/bank/transfers
GET /api/bank/transfers?transfer_id=<uuid>
```

ACH settlement: typically 1-3 business days. Wire payouts are typically faster.

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
