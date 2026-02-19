# Trading Strategies

Run autonomous trading strategies with `scripts/strategy.mjs`. The script takes a JSON config file defining the strategy type, parameters, and safety limits, then runs a continuous loop.

```bash
node scripts/strategy.mjs --config <path.json> [--dry-run]
```

## Strategy Types

### `accumulate` — Swing Trading / Mean Reversion

Trade between two assets to accumulate more of a target asset. Tracks a simple moving average (SMA) of the exchange rate and:
- **Buys** target when the rate is above the SMA (target is cheap relative to base)
- **Sells** target when the rate is below the SMA (target is expensive relative to base)

Best for: "trade between ALGO and USDC to try to gain more ALGO", "accumulate HAY by swing trading against ALGO"

**Config:**
```json
{
  "name": "accumulate-hay",
  "type": "accumulate",
  "network": "mainnet",
  "tickInterval": 300,
  "slippage": 1,
  "safety": {
    "maxTrades": 100,
    "maxLossPct": 5,
    "timeLimitMinutes": 4320,
    "minAlgoReserve": 0.5,
    "cooldownTicks": 2
  },
  "journal": "accumulate-hay-journal.jsonl",
  "accumulate": {
    "baseAsset": 0,
    "targetAsset": 3160000000,
    "windowSize": 20,
    "buyThreshold": 2,
    "sellThreshold": 2,
    "tradePercent": 25
  }
}
```

**Parameters:**

| Field | Description | Default |
|-------|-------------|---------|
| `baseAsset` | ASA ID of the base asset to trade against (0 for ALGO) | 0 |
| `targetAsset` | ASA ID of the asset to accumulate | required |
| `windowSize` | Number of ticks for the SMA window | 20 |
| `buyThreshold` | % above SMA to trigger a buy | 2 |
| `sellThreshold` | % below SMA to trigger a sell | 2 |
| `tradePercent` | % of holdings to trade per signal | 25 |

**How the SMA works:** Each tick, the script quotes the exchange rate (how much target you get per unit of base). It keeps a sliding window of rates. When the current rate deviates from the average by more than the threshold, it triggers a trade.

**Tuning tips:**
- Short `windowSize` (5-10) = more responsive, more trades, more fees
- Long `windowSize` (30-50) = smoother, fewer trades, needs longer `tickInterval`
- Small `tradePercent` (10-15) = conservative, spreads risk
- Large `tradePercent` (40-50) = aggressive, bigger swings

### `dca` — Dollar Cost Averaging

Buy a fixed amount of a target asset at regular intervals. Simple and predictable.

Best for: "buy $1 of USDC every hour", "DCA into HAY from ALGO every 5 minutes"

**Config:**
```json
{
  "name": "dca-into-usdc",
  "type": "dca",
  "network": "mainnet",
  "tickInterval": 3600,
  "slippage": 1,
  "safety": {
    "maxTrades": 24,
    "timeLimitMinutes": 1440,
    "minAlgoReserve": 0.5,
    "cooldownTicks": 1
  },
  "journal": "dca-usdc-journal.jsonl",
  "dca": {
    "fromAsset": 0,
    "toAsset": 31566704,
    "amountPerTick": 500000
  }
}
```

**Parameters:**

| Field | Description | Default |
|-------|-------------|---------|
| `fromAsset` | ASA ID to spend (0 for ALGO) | 0 |
| `toAsset` | ASA ID to buy | required |
| `amountPerTick` | Base units to spend each tick | required |

**Tuning tips:**
- Set `tickInterval` to your desired buy frequency (3600 = hourly, 86400 = daily)
- Set `maxTrades` to the total number of buys you want
- `amountPerTick` is in base units (1000000 = 1 ALGO, 1000000 = 1 USDC)

## Common Config Fields

These fields apply to all strategy types:

```json
{
  "name": "my-strategy",
  "type": "accumulate",
  "network": "mainnet",
  "tickInterval": 60,
  "slippage": 1,
  "dryRun": false,
  "safety": { ... },
  "journal": "journal.jsonl"
}
```

| Field | Description | Default |
|-------|-------------|---------|
| `name` | Human-readable name for logging | strategy type |
| `type` | Strategy type: `accumulate` or `dca` | required |
| `network` | `mainnet` or `testnet` | `mainnet` |
| `tickInterval` | Seconds between evaluation ticks | 60 |
| `slippage` | Slippage tolerance % for swaps | 1 |
| `dryRun` | If true, get quotes but don't execute | false |
| `journal` | Path to JSONL trade journal file | `<name>-journal.jsonl` |

## Safety Rails

Every strategy enforces these limits:

```json
{
  "safety": {
    "maxTrades": 50,
    "maxLossPct": 10,
    "timeLimitMinutes": 1440,
    "minAlgoReserve": 0.5,
    "cooldownTicks": 1
  }
}
```

| Field | Description | Default |
|-------|-------------|---------|
| `maxTrades` | Stop after this many trades | 50 |
| `maxLossPct` | Stop if portfolio drops by this % from start | 10 |
| `timeLimitMinutes` | Stop after this many minutes | 1440 (24h) |
| `minAlgoReserve` | Skip trades if ALGO balance would drop below this | 0.5 |
| `cooldownTicks` | Minimum ticks between trades | 1 |

When a limit is hit, the strategy logs a `stop` event and exits cleanly.

## Translating User Requests to Config

When a user describes a strategy in natural language, map it to config like this:

**"Trade between ALGO and HAY to gain more HAY"**
→ `accumulate` with `baseAsset: 0`, `targetAsset: 3160000000`

**"Try to accumulate more ALGO by trading USDC"**
→ `accumulate` with `baseAsset: 31566704`, `targetAsset: 0`

**"Buy 0.5 ALGO worth of USDC every hour"**
→ `dca` with `fromAsset: 0`, `toAsset: 31566704`, `amountPerTick: 500000`, `tickInterval: 3600`

**"DCA $1 into HAY daily"**
→ `dca` — estimate base units from current price, set `tickInterval: 86400`

## Dry Run

Always test with `--dry-run` first:

```bash
node scripts/strategy.mjs --config my-strategy.json --dry-run
```

This fetches real quotes but does not submit transactions. The journal will contain `dry_run_trade` events instead of `trade` events. Use this to verify the strategy triggers trades at the right times.

## Monitoring

While the strategy runs, it prints tick-by-tick output to stdout. You can also tail the journal:

```bash
tail -f accumulate-hay-journal.jsonl
```

See [trade-journal.md](trade-journal.md) for journal format and analysis.

## Common ASA IDs

| Token | ASA ID | Decimals |
|-------|--------|----------|
| ALGO | 0 | 6 |
| USDC | 31566704 | 6 |
| HAY | 3160000000 | 6 |
| USDt | 312769 | 6 |
| tALGO | 2537013734 | 6 |

For a full list, see the **haystack-router** skill → assets.md. To look up an asset by name:

```bash
curl 'https://api.hay.app/api/assets?q=HAY'
```
