# API Reference

## RouterClient

### Constructor

```typescript
new RouterClient(config: ConfigParams & { middleware?: SwapMiddleware[] })
```

See [configuration.md](configuration.md) for all options.

### newQuote()

```typescript
async newQuote(params: FetchQuoteParams): Promise<SwapQuote>
```

Get an optimized swap quote with bigint coercion and timestamps.

### fetchQuote()

```typescript
async fetchQuote(params: FetchQuoteParams): Promise<FetchQuoteResponse>
```

Get a raw swap quote without SwapQuote enhancements.

### newSwap()

```typescript
async newSwap(config: {
  quote: SwapQuote | FetchQuoteResponse
  address: string
  signer: TransactionSigner | SignerFunction
  slippage: number
  note?: Uint8Array
}): Promise<SwapComposer>
```

### needsAssetOptIn()

```typescript
async needsAssetOptIn(address: string, assetId: number | bigint): Promise<boolean>
```

Returns `false` for ALGO (ASA 0).

---

## SwapComposer

Returned by `router.newSwap()`. Builder pattern for transaction groups.

### execute()

```typescript
async execute(waitRounds?: number): Promise<{
  confirmedRound: bigint
  txIds: string[]
  methodResults: ABIResult[]
}>
```

Sign, submit, and wait for confirmation. `waitRounds` defaults to 10.

### buildGroup()

```typescript
buildGroup(): TransactionWithSigner[]
```

### sign()

```typescript
async sign(): Promise<Uint8Array[]>
```

### submit()

```typescript
async submit(): Promise<string[]>
```

Sign and submit without waiting. Returns transaction IDs.

### addTransaction()

```typescript
addTransaction(transaction: Transaction, signer?: TransactionSigner): this
```

### addMethodCall()

```typescript
addMethodCall(methodCall: MethodCall, signer?: TransactionSigner): this
```

### addSwapTransactions()

```typescript
async addSwapTransactions(): Promise<this>
```

Manually add swap transactions (called automatically by `execute()` if omitted).

### getSummary()

```typescript
getSummary(): SwapSummary | undefined
```

Only available after `execute()`.

### getInputTransactionId()

```typescript
getInputTransactionId(): string | undefined
```

Available after `buildGroup()`.

### getStatus()

```typescript
getStatus(): SwapComposerStatus
// BUILDING (0) → BUILT (1) → SIGNED (2) → SUBMITTED (3) → COMMITTED (4)
```

### count()

```typescript
count(): number
```

---

## SwapMiddleware

```typescript
interface SwapMiddleware {
  readonly name: string
  readonly version: string
  shouldApply(context: QuoteContext): Promise<boolean>
  adjustQuoteParams?(params: FetchQuoteParams): Promise<FetchQuoteParams>
  beforeSwap?(context: SwapContext): Promise<TransactionWithSigner[]>
  afterSwap?(context: SwapContext): Promise<TransactionWithSigner[]>
}
```

### Built-in: AutoOptOutMiddleware

```typescript
import { AutoOptOutMiddleware } from '@txnlab/haystack-router'

new AutoOptOutMiddleware({
  excludedAssets?: readonly (number | bigint)[]
})
```

---

## Types

### FetchQuoteParams

```typescript
interface FetchQuoteParams {
  fromASAID: bigint | number
  toASAID: bigint | number
  amount: bigint | number
  type?: 'fixed-input' | 'fixed-output'
  address?: string | null
  disabledProtocols?: readonly Protocol[]
  maxGroupSize?: number   // Default: 16
  maxDepth?: number       // Default: 4
  optIn?: boolean
}
```

### SwapQuote

```typescript
type SwapQuote = FetchQuoteResponse & {
  quote: bigint
  amount: bigint
  address?: string
  createdAt: number
}
```

### SwapSummary

```typescript
interface SwapSummary {
  inputAssetId: bigint
  outputAssetId: bigint
  inputAmount: bigint
  outputAmount: bigint
  type: QuoteType
  totalFees: bigint        // microAlgos
  transactionCount: number
  inputTxnId: string
  outputTxnId: string
}
```

### SignerFunction

```typescript
type SignerFunction = (
  txnGroup: Transaction[],
  indexesToSign: number[],
) => Promise<(Uint8Array | null)[]>
```

### Route

```typescript
interface Route {
  percentage: number
  path: PathElement[]
}

interface PathElement {
  name: string
  in: Asset
  out: Asset
}

interface Asset {
  id: number
  decimals: number
  unit_name: string
  name: string
  price_usd: number
}
```

### Protocol

```typescript
enum Protocol {
  TinymanV2 = 'TinymanV2'
  Pact = 'Pact'
  Folks = 'Folks'
  TAlgo = 'TAlgo'
}
```
