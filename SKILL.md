---
name: sponge-wallet
description: Manages crypto wallets, transfers tokens, swaps on DEXes, checks balances, and accesses paid APIs (search, image gen, prediction markets, web scraping, document parsing, sales prospecting) via x402 micropayments. Use when the user asks about wallet balances, token transfers, swaps, blockchain payments, or paid API services.
---

# Sponge Wallet Skill

Multi-chain crypto wallet with transfers, swaps, and paid API access. Zero dependencies — just Node.js 18+.

## IMPORTANT: Check Authentication First

**Before using any wallet tool**, always run `whoami` to check auth status:

```bash
node <skill-path>/scripts/wallet.mjs whoami
```

If you see "Not authenticated", you need to register:
1. If you're a **new agent without an account** → Use the **register** flow below
2. If you **already have an account** → Use the **login** flow

## Getting Started (New Agents)

If you're an AI agent without an account, use the **register** flow to get set up:

**Step 1** — Register your agent:
```bash
node <skill-path>/scripts/wallet.mjs register "MyAgentName"
```

This returns a `claim_url` to send to your human owner:
```json
{
  "status": "registration_pending",
  "claim_url": "https://wallet.staging.paysponge.com/device?code=ABCD-1234",
  "claim_code": "ABCD-1234",
  "claim_text": "I just claimed a wallet for my agent and got 1 free USDC on @sponge_wallet: ABCD-1234",
  "device_code": "xxx..."
}
```

**Step 2** — Send the `claim_url` to your human owner. They will:
1. Open the URL and log in (email, wallet, Google, or GitHub)
2. Optionally post a tweet with the `claim_text` to receive **$1 USDC free** on Solana
3. Approve the agent

**Step 3** — Poll for completion:
```bash
node <skill-path>/scripts/wallet.mjs register --poll <device_code> <interval> <expires_in>
```

Once approved, your API key is saved automatically to `~/.spongewallet/credentials.json`.

## Authentication (Existing Users)

If you already have an account, use **login** instead:

**Phase 1** — Start the device flow:
```bash
node <skill-path>/scripts/wallet.mjs login
```
Show the `verification_url` and `user_code` to the user.

**Phase 2** — After approval, poll for the token:
```bash
node <skill-path>/scripts/wallet.mjs login --poll <device_code> <interval> <expires_in>
```

Credential resolution order:
1. `SPONGE_API_KEY` environment variable (if set, skips stored credentials)
2. `~/.spongewallet/credentials.json` (saved by register/login)

Other auth commands:
- `node wallet.mjs whoami` — show current auth status
- `node wallet.mjs logout` — remove stored credentials

## How to Execute

```bash
node <skill-path>/scripts/wallet.mjs <tool_name> '<json_args>'
```

Output is JSON with `status: "success"` or `status: "error"`.

## Available Tools

### Wallet & Balance

| Tool | Description | Required | Optional |
|------|-------------|----------|----------|
| `get_balance` | Check balances across chains | — | `chain` |
| `get_solana_tokens` | Discover all SPL tokens in wallet | `chain` | — |
| `search_solana_tokens` | Search Jupiter token database | `query` | `limit` |

### Transfers

| Tool | Description | Required | Optional |
|------|-------------|----------|----------|
| `evm_transfer` | Transfer ETH/USDC on Ethereum/Base | `chain`, `to`, `amount`, `currency` | — |
| `solana_transfer` | Transfer SOL/USDC on Solana | `chain`, `to`, `amount`, `currency` | — |

### Swaps

| Tool | Description | Required | Optional |
|------|-------------|----------|----------|
| `solana_swap` | Swap tokens via Jupiter | `chain`, `input_token`, `output_token`, `amount` | `slippage_bps` |

### Transactions

| Tool | Description | Required | Optional |
|------|-------------|----------|----------|
| `get_transaction_status` | Check tx status | `transaction_hash`, `chain` | — |
| `get_transaction_history` | View past transactions | — | `limit`, `chain` |

### Funding & Withdrawals

| Tool | Description | Required | Optional |
|------|-------------|----------|----------|
| `request_funding` | Request funds from owner | `amount`, `chain`, `currency` | — |
| `withdraw_to_main_wallet` | Return funds to owner | `chain`, `amount` | `currency` |

### Paid APIs (Sponge x402)

| Tool | Description | Required | Optional |
|------|-------------|----------|----------|
| `sponge` | Unified paid API interface | `task` | See [REFERENCE.md](REFERENCE.md) |
| `create_x402_payment` | Create x402 payment payload | `chain`, `to`, `amount` | `token`, `decimals` |

## Chain Reference

**Test keys** (`sponge_test_*`): `sepolia`, `base-sepolia`, `solana-devnet`, `tempo`
**Live keys** (`sponge_live_*`): `ethereum`, `base`, `solana`

## Common Workflows

### New Agent Registration

```bash
# Step 1: Check if already authenticated
node wallet.mjs whoami
# → If "Not authenticated", continue to step 2

# Step 2: Register and get claim URL
node wallet.mjs register "MyTradingBot"
# → Send the claim_url to your human owner
# → They log in and optionally tweet for $1 USDC on Solana

# Step 3: Poll for approval (use device_code from step 2)
node wallet.mjs register --poll <device_code> 5 600

# Step 4: You're authenticated! Check your balance
node wallet.mjs get_balance '{}'
```

### Check Balance → Transfer → Verify

```bash
node wallet.mjs get_balance '{"chain":"base"}'
node wallet.mjs evm_transfer '{"chain":"base","to":"0x...","amount":"10","currency":"USDC"}'
node wallet.mjs get_transaction_status '{"transaction_hash":"0x...","chain":"base"}'
```

### Swap Tokens on Solana

```bash
node wallet.mjs search_solana_tokens '{"query":"BONK"}'
node wallet.mjs solana_swap '{"chain":"solana","input_token":"SOL","output_token":"BONK","amount":"0.5"}'
```

### Sponge Paid APIs

```bash
node wallet.mjs sponge '{"task":"search","query":"AI research papers"}'
node wallet.mjs sponge '{"task":"image","prompt":"sunset over mountains"}'
node wallet.mjs sponge '{"task":"predict","semantic_search":"will-trump-win-2028"}'
node wallet.mjs sponge '{"task":"crawl","url":"https://example.com"}'
node wallet.mjs sponge '{"task":"parse","document_url":"https://example.com/doc.pdf"}'
node wallet.mjs sponge '{"task":"prospect","apollo_query":"Stripe","apollo_endpoint":"companies"}'
```

## Error Handling

| Error | Resolution |
|-------|------------|
| `Not authenticated` | Run `node wallet.mjs register <name>` (new agents) or `node wallet.mjs login` (existing users) |
| `Invalid API key` | Run `node wallet.mjs login` to re-authenticate |
| `Device code expired` | Start registration/login again |
| `Tweet verification failed` | Ensure tweet contains exact claim text and is posted from your X account |
| `Chain 'X' is not allowed` | Use correct key type (test vs live) for the chain |
| `Insufficient balance` | Use `request_funding` |
| `Address not in allowlist` | Add recipient in the dashboard |

See [REFERENCE.md](REFERENCE.md) for detailed parameter docs.
