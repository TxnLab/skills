# Swaps

## Executing a Swap

```typescript
const swap = await router.newSwap({
  quote,
  address: activeAddress,
  signer: transactionSigner,
  slippage: 1, // 1%
})

const result = await swap.execute()
console.log(`Confirmed in round ${result.confirmedRound}`)
```

## newSwap() Parameters

| Parameter  | Type                                  | Required | Description                               |
| ---------- | ------------------------------------- | -------- | ----------------------------------------- |
| `quote`    | `SwapQuote \| FetchQuoteResponse`     | Yes      | Quote from `newQuote()` or `fetchQuote()` |
| `address`  | `string`                              | Yes      | Signer's Algorand address                 |
| `signer`   | `TransactionSigner \| SignerFunction` | Yes      | Transaction signing function              |
| `slippage` | `number`                              | Yes      | Slippage tolerance (e.g., `1` = 1%)       |
| `note`     | `Uint8Array`                          | No       | Note attached to input transaction        |

## Signer Patterns

### Browser: use-wallet

```typescript
import { useWallet } from '@txnlab/use-wallet-react'

const { activeAddress, transactionSigner } = useWallet()

const swap = await router.newSwap({
  quote,
  address: activeAddress,
  signer: transactionSigner,
  slippage: 1,
})
```

### Node.js: Custom Signer

```typescript
import algosdk from 'algosdk'

const account = algosdk.mnemonicToSecretKey(mnemonic)

const signer = async (
  txnGroup: algosdk.Transaction[],
  indexesToSign: number[],
): Promise<Uint8Array[]> => {
  return indexesToSign.map(
    (index) => algosdk.signTransaction(txnGroup[index], account.sk).blob,
  )
}

const swap = await router.newSwap({
  quote,
  address: account.addr.toString(),
  signer,
  slippage: 1,
})
```

The SDK detects both signer return patterns automatically:

- **Pera/Defly style**: `Uint8Array[]` matching `indexesToSign` length
- **Lute/ARC-1 style**: `(Uint8Array | null)[]` matching full group length

## Execution Result

```typescript
const result = await swap.execute()

result.confirmedRound // bigint — block where swap confirmed
result.txIds         // string[] — all transaction IDs
result.methodResults // ABIResult[] — ABI method call results
```

## Swap Summary

After execution, get exact amounts (may differ from quote due to slippage):

```typescript
const summary = swap.getSummary()

if (summary) {
  summary.inputAssetId   // bigint
  summary.outputAssetId  // bigint
  summary.inputAmount    // bigint — exact input sent
  summary.outputAmount   // bigint — exact output received
  summary.totalFees      // bigint — total ALGO fees (microAlgos)
  summary.transactionCount // number
  summary.inputTxnId     // string
  summary.outputTxnId    // string
}
```

## Batch Swaps

Execute multiple swaps sequentially:

```typescript
const pairs = [
  { from: 0, to: 31566704, amount: 1_000_000 },
  { from: 0, to: 31566704, amount: 2_000_000 },
]

for (const { from, to, amount } of pairs) {
  const quote = await router.newQuote({
    fromASAID: from, toASAID: to, amount, address,
  })
  const swap = await router.newSwap({ quote, address, signer, slippage: 1 })
  const result = await swap.execute()
  console.log(`Confirmed in round ${result.confirmedRound}`)
}
```

## Tracking Transactions

Attach a note for backend tracking:

```typescript
const swap = await router.newSwap({
  quote, address, signer, slippage: 1,
  note: new TextEncoder().encode('order-123'),
})

await swap.execute()
const inputTxId = swap.getInputTransactionId()
```

## Advanced: Custom Transaction Composition

Add custom transactions before/after the swap in the same atomic group:

```typescript
const result = await swap
  .addTransaction(customTxn)    // Add before swap
  .addSwapTransactions()        // Add swap txns + middleware
  .addMethodCall(abiCall)       // Add ABI call after swap
  .execute()
```

Constraints: max 16 transactions per group, non-composable swaps cannot add custom transactions.

## Advanced: Step-by-Step Execution

```typescript
const swap = await router.newSwap({ quote, address, signer, slippage: 1 })

const txnsWithSigners = swap.buildGroup() // Assigns group IDs
const signedTxns = await swap.sign()
const txIds = await swap.submit()         // Doesn't wait

swap.getStatus() // BUILDING → BUILT → SIGNED → SUBMITTED → COMMITTED
```

## Error Handling

```typescript
try {
  const result = await swap.execute()
} catch (error) {
  // Common errors:
  // - Slippage exceeded (price moved beyond tolerance)
  // - Insufficient balance
  // - Asset not opted in
  // - Transaction rejected by user
}
```

Quotes are time-sensitive. Refetch if stale.
