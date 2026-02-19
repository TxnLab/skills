# Trade Journal

The strategy runner writes all activity to a JSONL (JSON Lines) file — one JSON object per line. This provides a complete audit trail of every tick, trade, and lifecycle event.

## Event Types

### `start` — Strategy launched

```json
{"ts":"2026-02-19T10:00:00.000Z","event":"start","config":{...},"address":"ALGO...","startUsdValue":1.5}
```

### `tick` — Evaluation cycle

```json
{"ts":"2026-02-19T10:01:00.000Z","event":"tick","tick":1,"balances":{"0":1500000,"31566704":45211},"trades":0}
```

- `balances`: Map of ASA ID → base unit amount (0 = ALGO)
- `trades`: Cumulative trade count at this tick

### `quote` / `dry_run_trade` — Quote fetched (dry run mode)

```json
{"ts":"2026-02-19T10:02:00.000Z","event":"dry_run_trade","from":0,"to":31566704,"amountIn":500000,"expectedOut":45000,"usdIn":0.045,"usdOut":0.045,"route":{"tinyman-V2":"0.75","pact-stable":"0.25"}}
```

### `trade` — Swap executed

```json
{"ts":"2026-02-19T10:02:00.000Z","event":"trade","from":0,"to":31566704,"amountIn":500000,"amountOut":45211,"usdIn":0.045,"usdOut":0.0452,"fees":41000,"txIds":["ABC..."],"confirmedRound":58539266}
```

- `fees`: Total transaction fees in microALGO
- `txIds`: Array of transaction IDs (first one is the group leader)
- `confirmedRound`: Algorand round the trade was confirmed in

### `error` — Non-fatal error during a tick

```json
{"ts":"2026-02-19T10:03:00.000Z","event":"error","tick":3,"error":"network timeout"}
```

### `stop` — Strategy stopped

```json
{"ts":"2026-02-19T10:30:00.000Z","event":"stop","reason":"max_trades","ticks":30,"trades":50,"elapsedMinutes":30.0}
```

Stop reasons: `max_trades`, `max_loss`, `time_limit`, `user_interrupt`, `config_error`, `terminated`

## Reading the Journal

### With Node.js

```javascript
import { readFileSync } from 'fs'

const entries = readFileSync('journal.jsonl', 'utf-8')
  .trim()
  .split('\n')
  .map(JSON.parse)

const trades = entries.filter(e => e.event === 'trade')
console.log(`Total trades: ${trades.length}`)
```

### With command line

```bash
# Count trades
grep '"event":"trade"' journal.jsonl | wc -l

# Show last 5 entries
tail -5 journal.jsonl | python -m json.tool

# Extract all trade amounts
grep '"event":"trade"' journal.jsonl | node -e "
  const lines = require('fs').readFileSync('/dev/stdin','utf-8').trim().split('\n');
  lines.forEach(l => { const e = JSON.parse(l); console.log(e.amountIn, '->', e.amountOut) });
"
```

## Calculating P&L

To calculate profit/loss from a journal:

1. Find the `start` event for `startUsdValue`
2. Find the last `tick` event for final balances
3. Quote the final balances to get current USD value
4. P&L = current value - start value

```javascript
const start = entries.find(e => e.event === 'start')
const lastTick = entries.filter(e => e.event === 'tick').pop()

console.log(`Start USD: $${start.startUsdValue}`)
console.log(`Final balances:`, lastTick.balances)
// Quote final balances using price_check.mjs or RouterClient to get current USD value
```

### Trade-level P&L

For each trade, compare `usdIn` vs `usdOut`:
- `usdOut > usdIn`: Gained value on this trade
- `usdOut < usdIn`: Lost value (slippage, fees, price movement)

```javascript
const trades = entries.filter(e => e.event === 'trade')
let totalIn = 0, totalOut = 0
for (const t of trades) {
  totalIn += t.usdIn || 0
  totalOut += t.usdOut || 0
}
console.log(`Total USD in:  $${totalIn.toFixed(4)}`)
console.log(`Total USD out: $${totalOut.toFixed(4)}`)
console.log(`Net:           $${(totalOut - totalIn).toFixed(4)}`)
```

## Summarizing for Users

When a user asks "how did my strategy do?", read the journal and report:

1. **Duration**: Time between `start` and `stop` events
2. **Trade count**: Number of `trade` events
3. **Total fees**: Sum of `fees` fields across trades
4. **Net P&L**: USD value change from start to finish
5. **Error count**: Number of `error` events
6. **Stop reason**: Why the strategy ended
