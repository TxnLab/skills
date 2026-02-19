---
name: haystack-agent-trader
description: >-
  Autonomous trading skill for AI agents on Algorand. Enables agents to
  generate their own wallet, fund it, and execute swaps through the Haystack
  Router DEX aggregator. Use when an agent needs to independently trade
  tokens, check balances, or execute swaps on the Algorand blockchain.
---

# Haystack Agent Trader

This skill enables you (the AI agent) to autonomously trade on Algorand. You create your own wallet, manage keys, and execute swaps end-to-end from scripts.

For SDK details (quotes, swaps, signers, React integration), see the **haystack-router** skill.

## Setup

```bash
npm install @txnlab/haystack-router algosdk
```

## Quick Start

### 1. Generate an account

```javascript
import algosdk from 'algosdk'

const account = algosdk.generateAccount()
const mnemonic = algosdk.secretKeyToMnemonic(account.sk)
console.log('Address:', account.addr.toString())
// Save mnemonic to .env — never commit it
```

Save to `.env`:
```
AGENT_MNEMONIC="your twenty five word mnemonic here"
AGENT_ADDRESS="ALGO_ADDRESS_HERE"
NETWORK=mainnet
```

### 2. Fund the account

**Mainnet:** Transfer ALGO to the agent's address. Need ~1 ALGO minimum (0.1 MBR + fees + swap amount).

**Testnet:** Use the dispenser at https://bank.testnet.algorand.network

### 3. Execute a swap

```javascript
import algosdk from 'algosdk'
import { RouterClient } from '@txnlab/haystack-router'

const account = algosdk.mnemonicToSecretKey(process.env.AGENT_MNEMONIC)
const address = account.addr.toString()

const signer = async (txnGroup, indexesToSign) =>
  indexesToSign.map((i) => algosdk.signTransaction(txnGroup[i], account.sk).blob)

const router = new RouterClient({
  apiKey: '1b72df7e-1131-4449-8ce1-29b79dd3f51e',
  autoOptIn: true,
})

const quote = await router.newQuote({
  fromASAID: 0,
  toASAID: 3160000000, // HAY
  amount: 500_000,     // 0.5 ALGO
  address,
})

const swap = await router.newSwap({ quote, address, signer, slippage: 1 })
const result = await swap.execute()
console.log(`Confirmed in round ${result.confirmedRound}`)
```

### 4. Check balances

algosdk v3 returns account fields as BigInt and uses camelCase property names:

```javascript
const algod = new algosdk.Algodv2('', 'https://mainnet-api.algonode.cloud', '')
const info = await algod.accountInformation(address).do()
console.log('ALGO:', Number(info.amount) / 1e6)
for (const asset of info.assets || []) {
  console.log(`ASA ${asset.assetId}: ${asset.amount}`)
}
```

### 5. Close account

To close an account and reclaim all ALGO, you must first opt out of every asset (balance must be 0), then close the account with `closeRemainderTo`:

```javascript
const params = await algod.getTransactionParams().do()

// Opt out of each asset (0-balance required)
for (const asset of info.assets || []) {
  const optOut = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
    sender: address,
    receiver: address,
    assetIndex: Number(asset.assetId),
    amount: BigInt(0),
    closeRemainderTo: address,
    suggestedParams: params,
  })
  // ... sign and submit, or group with the close txn below
}

// Close account — sends all remaining ALGO to the recipient
const closeTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
  sender: address,
  receiver: recipientAddress,
  amount: BigInt(0),
  closeRemainderTo: recipientAddress,
  suggestedParams: params,
})
```

Group the opt-out and close transactions into a single atomic group with `algosdk.assignGroupID()` for efficiency.

## Runnable Scripts

The `scripts/` directory contains ready-to-run tools:

| Script             | Purpose                             |
| ------------------ | ----------------------------------- |
| `setup_wallet.mjs` | Generate account, save to .env      |
| `swap.mjs`         | Execute a swap with full opt-in     |
| `balances.mjs`     | Check all account balances          |
| `price_check.mjs`  | Get a quote without executing       |

```bash
node scripts/setup_wallet.mjs --network mainnet
node scripts/swap.mjs --from 0 --to 3160000000 --amount 500000
node scripts/balances.mjs
node scripts/price_check.mjs --from 0 --to 3160000000 --amount 500000
```

## Minimum Balance

Algorand accounts must maintain a minimum balance:
- Base: 0.1 ALGO
- Per ASA opted-in: +0.1 ALGO
- Per app opted-in: +0.1 ALGO

Keep at least 0.5 ALGO in reserve for MBR + transaction fees.

## Security

See [key-management.md](references/key-management.md) for detailed guidance.

- Store mnemonic in `.env` — never commit to git
- Limit funding to what you're willing to risk
- Use testnet first to validate strategies
- Log transaction IDs, never keys

## References

| Topic                  | File                                              |
| ---------------------- | ------------------------------------------------- |
| Key security, storage  | [key-management.md](references/key-management.md) |
| SDK API, quotes, swaps | See **haystack-router** skill                     |
| Common ASA IDs         | See **haystack-router** skill → assets.md         |
