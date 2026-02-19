# Key Management for Autonomous Agents

## How Algorand Keys Work

An Algorand account consists of:
- **Address**: A 58-character public address (e.g., `ABC...XYZ`)
- **Secret Key (sk)**: A 64-byte Uint8Array used to sign transactions
- **Mnemonic**: A 25-word human-readable backup of the secret key

The mnemonic and secret key are equivalent — either one can derive the other. Whoever holds
the mnemonic controls the account completely.

## Storage Guidelines

### The .env Pattern

Store credentials in a `.env` file at the project root:

```
AGENT_MNEMONIC="word1 word2 word3 ... word25"
AGENT_ADDRESS="YOURADDRESSHERE"
NETWORK=mainnet
```

**Critical rules:**
1. Add `.env` to `.gitignore` immediately after creating it
2. Never log the mnemonic to stdout, files, or remote services
3. Never include the mnemonic in error reports or stack traces
4. Set file permissions: `chmod 600 .env`

### Loading Keys in Scripts

```javascript
import algosdk from 'algosdk'
import { readFileSync } from 'fs'

// Parse .env manually (no external dependency needed)
const envContent = readFileSync('.env', 'utf-8')
const mnemonic = envContent.match(/AGENT_MNEMONIC="([^"]+)"/)?.[1]

const { addr, sk } = algosdk.mnemonicToSecretKey(mnemonic)
```

### What NOT to Do

```javascript
// ❌ Never hardcode mnemonics
const mnemonic = "abandon abandon ... about"

// ❌ Never log keys
console.log('My secret key:', sk)
console.log('Mnemonic:', mnemonic)

// ❌ Never pass keys via command line arguments (visible in process list)
// node script.js --mnemonic "word1 word2 ..."

// ❌ Never commit keys
// git add .env  ← this should be in .gitignore
```

## Funding Strategy

### Testnet
Use the Algorand testnet dispenser (free, unlimited):
- URL: https://bank.testnet.algorand.network
- Gives 10 testnet ALGO per request
- Can be called programmatically or via browser

### Mainnet — Risk Management
- **Start small**: Fund with only what you're willing to lose while testing
- **Separate accounts**: Use different accounts for different strategies
- **Set limits**: Implement per-trade and daily volume limits in your trading logic
- **Monitor**: Log every transaction ID for auditability
- **Withdraw profits**: Periodically sweep accumulated profits to a secure wallet

### Minimum Balance Awareness

Algorand requires maintaining a minimum balance:
- Base: 100,000 microALGO (0.1 ALGO)
- Each ASA opt-in: +100,000 microALGO
- Each app opt-in: +100,000 microALGO (base, increases with state)

**Rule of thumb**: Keep at least 2 ALGO in reserve above what you plan to trade.

## Account Recovery

To recover an account from a mnemonic:

```javascript
const { addr, sk } = algosdk.mnemonicToSecretKey(mnemonic)
```

To generate a new account:

```javascript
const account = algosdk.generateAccount()
const mnemonic = algosdk.secretKeyToMnemonic(account.sk)
```

## Account Closure

When you're done with an agent account, close it to reclaim all ALGO. Algorand requires that you **opt out of all assets before closing** — you cannot close an account with outstanding asset opt-ins.

**Steps:**
1. Ensure all ASA balances are 0 (swap or transfer tokens out first)
2. Send 0-amount asset transfers with `closeRemainderTo` set to the sender's own address (this opts out)
3. Send a 0-amount ALGO payment with `closeRemainderTo` set to the destination address

Group all opt-out and close transactions atomically:

```javascript
const params = await algod.getTransactionParams().do()
const txns = []

// Opt out of each asset
for (const asset of accountInfo.assets || []) {
  txns.push(
    algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
      sender: address,
      receiver: address,
      assetIndex: Number(asset.assetId),
      amount: BigInt(0),
      closeRemainderTo: address,
      suggestedParams: params,
    }),
  )
}

// Close account
txns.push(
  algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    sender: address,
    receiver: destinationAddress,
    amount: BigInt(0),
    closeRemainderTo: destinationAddress,
    suggestedParams: params,
  }),
)

algosdk.assignGroupID(txns)
const signed = txns.map((txn) => algosdk.signTransaction(txn, sk).blob)
await algod.sendRawTransaction(signed).do()
```

**Common error**: `cannot close: N outstanding assets` — means you still have ASA opt-ins. Opt out of all assets first.

## Multi-Account Strategy

For advanced agents managing multiple strategies:

```
AGENT_MNEMONIC_TRADING="..."
AGENT_MNEMONIC_ACCUMULATION="..."
AGENT_MNEMONIC_ARBITRAGE="..."
```

Each account operates independently with its own balances and opt-ins.
