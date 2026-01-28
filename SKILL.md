---
name: sponge-wallet
description: Manage crypto wallets, transfer tokens, swap on DEXes, check balances, and use paid APIs (search, image gen, prediction markets, web scraping, document parsing, sales prospecting) via x402 micropayments. Use when the user asks about wallet balances, token transfers, swaps, blockchain payments, or paid API services.
---

# Sponge Wallet Skill

Sponge Wallet gives you full control over a multi-chain crypto wallet. You can check balances, transfer tokens, swap on DEXes, make x402 micropayments, and access paid APIs — all from the command line.

## Setup

**Requirements:**
- Node.js 18+ (or Bun)
- `SPONGE_API_KEY` environment variable set

**Install dependencies** (one-time):
```bash
cd <skill-path>/scripts && npm install
```

## How to Execute Tools

Run the wrapper script with the tool name and a JSON arguments object:

```bash
node <skill-path>/scripts/wallet.mjs <tool_name> '<json_args>'
```

All output is JSON. Check the `status` field: `"success"` or `"error"`.

## Available Tools

### Wallet & Balance

| Tool | Description | Required Args | Optional Args |
|------|-------------|---------------|---------------|
| `get_balance` | Check wallet balances across chains | — | `chain` |
| `get_solana_tokens` | Discover all SPL tokens in wallet | `chain` | — |
| `search_solana_tokens` | Search Jupiter token database | `query` | `limit` |

### Transfers

| Tool | Description | Required Args | Optional Args |
|------|-------------|---------------|---------------|
| `evm_transfer` | Transfer ETH or USDC on Ethereum/Base | `chain`, `to`, `amount`, `currency` | — |
| `solana_transfer` | Transfer SOL or USDC on Solana | `chain`, `to`, `amount`, `currency` | — |

### Swaps

| Tool | Description | Required Args | Optional Args |
|------|-------------|---------------|---------------|
| `solana_swap` | Swap tokens on Solana via Jupiter | `chain`, `input_token`, `output_token`, `amount` | `slippage_bps` |

### Transactions

| Tool | Description | Required Args | Optional Args |
|------|-------------|---------------|---------------|
| `get_transaction_status` | Check transaction status | `transaction_hash`, `chain` | — |
| `get_transaction_history` | View past transactions | — | `limit`, `chain` |

### Funding & Withdrawals

| Tool | Description | Required Args | Optional Args |
|------|-------------|---------------|---------------|
| `request_funding` | Request funds from owner | `amount`, `chain`, `currency` | — |
| `withdraw_to_main_wallet` | Return funds to owner | `chain`, `amount` | `currency` |

### Paid APIs (Sponge x402)

| Tool | Description | Required Args | Optional Args |
|------|-------------|---------------|---------------|
| `sponge` | Unified interface for paid API services | `task` | `query`, `prompt`, `url`, `model`, `num_results`, `provider`, `auto_pay`, and more |
| `create_x402_payment` | Create signed x402 payment | `chain`, `to`, `amount` | `token`, `decimals`, `valid_for_seconds`, `resource_url` |

## Chain Reference

**Test keys** (`sponge_test_*`) access testnets only:
- `sepolia` — Ethereum Sepolia
- `base-sepolia` — Base Sepolia
- `solana-devnet` — Solana Devnet
- `tempo` — Tempo Testnet

**Live keys** (`sponge_live_*`) access mainnets only:
- `ethereum` — Ethereum Mainnet
- `base` — Base Mainnet
- `solana` — Solana Mainnet

## Common Workflows

### Check Balance Then Transfer

```bash
# 1. Check balance on Base
node wallet.mjs get_balance '{"chain":"base"}'

# 2. Transfer USDC on Base
node wallet.mjs evm_transfer '{"chain":"base","to":"0x742d35Cc...","amount":"10","currency":"USDC"}'

# 3. Verify the transaction (use txHash from step 2)
node wallet.mjs get_transaction_status '{"transaction_hash":"0xabc...","chain":"base"}'
```

### Swap Tokens on Solana

```bash
# 1. Search for a token
node wallet.mjs search_solana_tokens '{"query":"BONK"}'

# 2. Swap SOL for the token
node wallet.mjs solana_swap '{"chain":"solana","input_token":"SOL","output_token":"BONK","amount":"0.5"}'

# 3. Check your token holdings
node wallet.mjs get_solana_tokens '{"chain":"solana"}'
```

### Web Search with Sponge

```bash
# Automatic payment — just provide the task
node wallet.mjs sponge '{"task":"search","query":"latest AI research papers"}'
```

### Image Generation

```bash
node wallet.mjs sponge '{"task":"image","prompt":"a sunset over mountains in watercolor style"}'
```

### Prediction Markets

```bash
node wallet.mjs sponge '{"task":"predict","semantic_search":"will-trump-win-2028","dome_path":"/v1/polymarket/markets"}'
```

### Web Scraping

```bash
node wallet.mjs sponge '{"task":"crawl","url":"https://example.com/article"}'
```

### Document Parsing

```bash
node wallet.mjs sponge '{"task":"parse","document_url":"https://example.com/report.pdf"}'
```

### Sales Prospecting

```bash
# Search for companies
node wallet.mjs sponge '{"task":"prospect","apollo_query":"Stripe","apollo_endpoint":"companies"}'

# Find people at a company
node wallet.mjs sponge '{"task":"prospect","apollo_query":"Stripe","apollo_endpoint":"people","apollo_person_titles":["VP Sales","CRO"]}'

# Enrich a contact by email
node wallet.mjs sponge '{"task":"prospect","apollo_endpoint":"enrich","apollo_email":"john@company.com"}'
```

### Request Funding When Low

```bash
# 1. Check balance
node wallet.mjs get_balance '{"chain":"base"}'

# 2. If insufficient, request more from owner
node wallet.mjs request_funding '{"amount":"50","chain":"base","currency":"USDC"}'
```

## Error Handling

| Error | Cause | Resolution |
|-------|-------|------------|
| `SPONGE_API_KEY environment variable is required` | Missing API key | Set `SPONGE_API_KEY` env var |
| `Invalid API key` | Wrong or expired key | Get a new key from spongewallet.com |
| `Chain 'X' is not allowed` | Using testnet chain with live key (or vice versa) | Use the correct key type for the chain |
| `Insufficient balance` | Not enough funds | Use `request_funding` to get more |
| `Address not in allowlist` | Recipient not approved | Add recipient to your agent's allowlist in the dashboard |

## Sponge Task Reference

| Task | Provider | Description | Key Args |
|------|----------|-------------|----------|
| `search` | Exa | AI-powered web search | `query`, `num_results` |
| `image` | Gemini | Image generation | `prompt` |
| `predict` | Dome | Prediction markets (Polymarket, Kalshi) | `semantic_search`, `dome_path` |
| `crawl` | Firecrawl | Web scraping | `url` |
| `llm` | OpenRouter | LLM completions | `query` or `prompt`, `model` |
| `parse` | Reducto | Document parsing (PDF, images, spreadsheets) | `document_url` |
| `prospect` | Apollo | Sales prospecting | `apollo_query`, `apollo_endpoint`, `apollo_filters` |

Cost: ~$0.01 USDC per sponge request, paid automatically via x402.

See `REFERENCE.md` for detailed parameter documentation for every tool.
