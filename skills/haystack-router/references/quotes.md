# Quotes

## Getting a Quote

```typescript
const quote = await router.newQuote({
  fromASAID: 0,          // ALGO
  toASAID: 31566704,     // USDC
  amount: 1_000_000,     // 1 ALGO in base units
  address: activeAddress,
})
```

## Parameters

| Parameter           | Type               | Required | Description                                     |
| ------------------- | ------------------ | -------- | ----------------------------------------------- |
| `fromASAID`         | `number \| bigint` | Yes      | Input asset ID (0 = ALGO)                       |
| `toASAID`           | `number \| bigint` | Yes      | Output asset ID                                 |
| `amount`            | `number \| bigint` | Yes      | Amount in base units                            |
| `type`              | `string`           | No       | `'fixed-input'` (default) or `'fixed-output'`   |
| `address`           | `string`           | No       | User address (needed for auto opt-in detection) |
| `maxGroupSize`      | `number`           | No       | Max transactions in group (default: 16)         |
| `maxDepth`          | `number`           | No       | Max routing hops (default: 4)                   |
| `optIn`             | `boolean`          | No       | Include opt-in transaction for output asset     |
| `disabledProtocols` | `Protocol[]`       | No       | Protocols to exclude from routing               |

## Quote Response (SwapQuote)

```typescript
quote.quote              // bigint — expected output amount in base units
quote.amount             // bigint — original input amount
quote.usdIn              // number — USD value of input
quote.usdOut             // number — USD value of output
quote.userPriceImpact    // number | undefined — price impact %
quote.flattenedRoute     // Record<string, number> — protocol split percentages
quote.route              // Route[] — routing path details
quote.requiredAppOptIns  // number[] — app IDs needing opt-in
quote.createdAt          // number — timestamp (ms)
```

## Quote Types

**Fixed-input** (default): Specify exact input, receive variable output.

```typescript
const quote = await router.newQuote({
  fromASAID: 0, toASAID: 31566704, amount: 1_000_000,
  type: 'fixed-input',
})
// quote.quote = expected USDC received
```

**Fixed-output**: Specify desired output, send variable input.

```typescript
const quote = await router.newQuote({
  fromASAID: 0, toASAID: 31566704, amount: 1_000_000,
  type: 'fixed-output',
})
// quote.quote = ALGO required to send
```

## Displaying Quote Data

```typescript
const outputHuman = Number(quote.quote) / 10 ** toDecimals
const inputHuman = Number(quote.amount) / 10 ** fromDecimals
const rate = outputHuman / inputHuman

console.log(`${inputHuman} ALGO → ${outputHuman} USDC`)
console.log(`Rate: 1 ALGO = ${rate.toFixed(4)} USDC`)
console.log(`USD in: $${quote.usdIn.toFixed(2)}`)

if (quote.userPriceImpact !== undefined) {
  console.log(`Price impact: ${quote.userPriceImpact.toFixed(2)}%`)
}
```

## Route Details

```typescript
// Flattened view: protocol → percentage
for (const [protocol, pct] of Object.entries(quote.flattenedRoute)) {
  console.log(`${protocol}: ${pct}%`)
}

// Detailed route with hops
for (const route of quote.route) {
  console.log(`${route.percentage}% of swap:`)
  for (const hop of route.path) {
    console.log(`  ${hop.in.unit_name} → ${hop.out.unit_name} via ${hop.name}`)
  }
}
```

## Lower-Level: fetchQuote()

`fetchQuote()` returns the raw `FetchQuoteResponse` without bigint coercion or `createdAt`. Use `newQuote()` unless you need the raw response.
