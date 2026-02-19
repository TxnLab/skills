---
name: haystack-router
description: >-
  Route and execute optimal token swaps on Algorand using Haystack Router,
  a DEX aggregator and smart order routing protocol. Use when building swap
  interfaces, getting best-price quotes across multiple Algorand DEXes and
  LST protocols, executing atomic swaps, integrating token exchange into
  React apps with use-wallet, automating swaps from Node.js, or migrating
  from @txnlab/deflex.
---

# Haystack Router

DEX aggregator and smart order routing on Algorand. Finds optimal swap routes across Tinyman V2, Pact, Folks, and LST protocols (tALGO, xALGO), then executes atomically via on-chain smart contracts.

## Package

`@txnlab/haystack-router` — TypeScript SDK. Requires `algosdk` (v3+) as a peer dependency.

```bash
npm install @txnlab/haystack-router algosdk
```

## Core Flow

```typescript
import { RouterClient } from '@txnlab/haystack-router'

const router = new RouterClient({
  apiKey: '1b72df7e-1131-4449-8ce1-29b79dd3f51e', // Free tier (60 requests/min)
  autoOptIn: true,
})

const quote = await router.newQuote({
  fromASAID: 0,          // ALGO
  toASAID: 3160000000,   // HAY
  amount: 1_000_000,     // 1 ALGO (base units)
  address: activeAddress,
})

const swap = await router.newSwap({
  quote,
  address: activeAddress,
  signer: transactionSigner,
  slippage: 1,
})
const result = await swap.execute()
```

The SDK is the **only** supported integration path. Do not call the API directly.

## Key Concepts

- **Amounts** are always in base units (microAlgos for ALGO, smallest unit for ASAs)
- **ASA IDs**: 0 = ALGO, 3160000000 = HAY, 31566704 = USDC — see [assets.md](references/assets.md) for full list
- **Quote types**: `fixed-input` (default) or `fixed-output`
- **Slippage**: Percentage tolerance on output (e.g., 1 = 1%)
- **Routing**: Multi-hop and parallel (combo) swaps for optimal pricing

## References

| Task                                        | File                                               |
| ------------------------------------------- | -------------------------------------------------- |
| Client config, networks, slippage, fees     | [configuration.md](references/configuration.md)    |
| Common ASA IDs, asset lookup                | [assets.md](references/assets.md)                  |
| Get swap quotes, display pricing            | [quotes.md](references/quotes.md)                  |
| Execute swaps, signers, batch, composition  | [swaps.md](references/swaps.md)                    |
| Build React swap UI with use-wallet         | [react-integration.md](references/react-integration.md) |
| Full API surface and types                  | [api-reference.md](references/api-reference.md)    |
