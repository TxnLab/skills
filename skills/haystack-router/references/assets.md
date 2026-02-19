# Assets

## Looking Up ASA IDs

Search for assets by name or unit name using the Haystack API:

```
GET https://api.hay.app/api/assets?q=<search term>
```

### Example

```bash
curl 'https://api.hay.app/api/assets?q=tALGO'
```

```json
[
  { "id": 2537013734, "unit_name": "TALGO", "decimals": 6 },
  { "id": 2973970000, "unit_name": "vestALGO", "decimals": 6 }
]
```

### Programmatic Lookup

```typescript
async function findAsset(query: string) {
  const resp = await fetch(
    `https://api.hay.app/api/assets?q=${encodeURIComponent(query)}`,
  )
  return (await resp.json()) as { id: number; unit_name: string; name: string; decimals: number }[]
}

const results = await findAsset('HAY')
const hay = results.find((a) => a.unit_name === 'HAY')
console.log(`HAY ASA ID: ${hay.id}`) // 3160000000
```

### Look Up by ID

```typescript
const algod = new algosdk.Algodv2('', 'https://mainnet-api.algonode.cloud', '')
const info = await algod.getAssetByID(3160000000).do()
console.log(info.params) // name, unitName, decimals, total
```

Browse assets on [Allo.info](https://allo.info) or [Pera Explorer](https://explorer.perawallet.app/).

## Common MainNet ASA IDs

| Token   | ASA ID       | Decimals | Notes                          |
| ------- | ------------ | -------- | ------------------------------ |
| ALGO    | 0            | 6        | Native currency                |
| HAY     | 3160000000   | 6        | Haystack utility token         |
| USDC    | 31566704     | 6        | Circle USD Coin                |
| USDt    | 312769       | 6        | Tether USD                     |
| tALGO   | 2537013734   | 6        | Tinyman liquid staking ALGO    |
| hayALGO | 3216000000   | 6        | Haystack liquid staking ALGO   |
| goBTC   | 386192725    | 8        | Wrapped BTC (Wormhole)         |
| goETH   | 386195940    | 8        | Wrapped ETH (Wormhole)         |
| DEFLY   | 470842789    | 6        | Defly                          |
| TINY    | 378382099    | 6        | Tinyman                        |
| VEST    | 700965019    | 6        | Tinyman governance             |
| GORA    | 1138500612   | 6        | Goracle                        |

## TestNet

| Token       | ASA ID   | Decimals |
| ----------- | -------- | -------- |
| ALGO        | 0        | 6        |
| USDC (test) | 10458941 | 6        |

Testnet ASA IDs change frequently. Verify via the Algorand testnet indexer.
