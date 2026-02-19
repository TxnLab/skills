# Configuration

## API Key

| Tier           | Key                                    | Rate Limit      |
| -------------- | -------------------------------------- | --------------- |
| **Free**       | `1b72df7e-1131-4449-8ce1-29b79dd3f51e` | 60 requests/min |
| **Production** | Request from support@txnlab.dev        | Higher limits   |

The free tier key requires no registration and works immediately.

## Installation

```bash
npm install @txnlab/haystack-router algosdk
```

Requires Node.js >= 20 and algosdk 3.x (peer dependency).

## RouterClient Options

```typescript
import { RouterClient } from '@txnlab/haystack-router'

const router = new RouterClient({
  apiKey: '1b72df7e-1131-4449-8ce1-29b79dd3f51e',

  // Optional
  algodUri: undefined,        // Algod node URI (default: MainNet via Nodely)
  algodToken: undefined,      // Algod node token
  algodPort: undefined,       // Algod node port (default: 443)
  autoOptIn: false,           // Auto-detect asset opt-in needs
  referrerAddress: undefined, // Earn 25% of swap fees
  feeBps: undefined,          // Fee in basis points (default: 10, max: 300)
  debugLevel: 'none',         // 'none' | 'info' | 'debug' | 'trace'
  middleware: [],              // SwapMiddleware plugins
})
```

## Network Configuration

MainNet is the default. For TestNet, override `algodUri`:

```typescript
const router = new RouterClient({
  apiKey,
  algodUri: 'https://testnet-api.4160.nodely.dev/',
})
```

## Slippage

Set per-swap, not on the client. Percentage tolerance on the **final output** amount.

```typescript
const swap = await router.newSwap({ quote, address, signer, slippage: 1 })
```

| Pair type       | Recommended |
| --------------- | ----------- |
| Stable (ALGO/USDC) | 0.5–1%  |
| Volatile        | 1–3%        |
| Low liquidity   | 3–5%        |

## Auto Opt-In

When `autoOptIn: true`, the SDK includes asset opt-in transactions in the swap group automatically. Requires `address` in the quote request.

```typescript
const router = new RouterClient({ apiKey, autoOptIn: true })

const quote = await router.newQuote({
  fromASAID: 0,
  toASAID: 31566704,
  amount: 1_000_000,
  address: activeAddress,
})
```

## Fees

- **Default**: 10 bps (0.10%) on the output amount
- **Range**: 10–300 bps
- **Referrer**: Set `referrerAddress` to earn 25% of swap fees
- Network transaction fees are separate (paid by swapper)

## Middleware

```typescript
import { RouterClient, AutoOptOutMiddleware } from '@txnlab/haystack-router'

const router = new RouterClient({
  apiKey,
  middleware: [
    new AutoOptOutMiddleware({ excludedAssets: [31566704] }),
  ],
})
```

See [api-reference.md](api-reference.md) for the `SwapMiddleware` interface.

## Amounts and Units

All amounts are in **base units** (smallest denomination):

| Asset        | Decimals | 1 unit in base | Example              |
| ------------ | -------- | -------------- | -------------------- |
| ALGO (ASA 0) | 6        | 1,000,000      | `1_000_000` = 1 ALGO |
| USDC         | 6        | 1,000,000      | `5_000_000` = 5 USDC |

```typescript
const amount = BigInt(Math.floor(parseFloat(userInput) * 10 ** decimals))
```

See [assets.md](assets.md) for common ASA IDs and lookup methods.
