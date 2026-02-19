#!/usr/bin/env node

/**
 * strategy.mjs — Run a continuous trading strategy on Algorand via Haystack Router
 *
 * Usage:
 *   node scripts/strategy.mjs --config <path.json> [--dry-run]
 *
 * Strategy types:
 *   accumulate  — Mean-reversion swing between two assets to gain more of one
 *   dca         — Dollar-cost average into a target asset at regular intervals
 *
 * The config JSON defines the strategy type, parameters, safety limits, and
 * tick interval. All actions are logged to a JSONL trade journal.
 *
 * Examples:
 *   node scripts/strategy.mjs --config accumulate-hay.json
 *   node scripts/strategy.mjs --config dca-usdc.json --dry-run
 */

import algosdk from 'algosdk'
import { RouterClient } from '@txnlab/haystack-router'
import { readFileSync, appendFileSync, existsSync } from 'fs'

// --- Parse arguments ---
const args = process.argv.slice(2)
function getArg(name, defaultVal) {
  const idx = args.indexOf(`--${name}`)
  return idx === -1 ? defaultVal : args[idx + 1]
}
function hasFlag(name) {
  return args.includes(`--${name}`)
}

const configPath = getArg('config', null)
const dryRunFlag = hasFlag('dry-run')

if (!configPath) {
  console.error('Usage: node scripts/strategy.mjs --config <path.json> [--dry-run]')
  process.exit(1)
}

// --- Load .env ---
function loadEnv() {
  if (!existsSync('.env')) {
    console.error('No .env file found. Run setup_wallet.mjs first.')
    process.exit(1)
  }
  const env = {}
  for (const line of readFileSync('.env', 'utf-8').split('\n')) {
    const match = line.match(/^([A-Z_]+)=(.*)$/)
    if (match) env[match[1]] = match[2].replace(/^["']|["']$/g, '')
  }
  return env
}

// --- Load config ---
if (!existsSync(configPath)) {
  console.error(`Config file not found: ${configPath}`)
  process.exit(1)
}
const config = JSON.parse(readFileSync(configPath, 'utf-8'))
const dryRun = dryRunFlag || config.dryRun || false
const network = config.network || 'mainnet'
const slippage = config.slippage ?? 1
const tickInterval = (config.tickInterval || 60) * 1000 // convert to ms
const journalPath = config.journal || `${config.name || 'strategy'}-journal.jsonl`
const safety = {
  maxTrades: 50,
  maxLossPct: 10,
  timeLimitMinutes: 1440,
  minAlgoReserve: 0.5,
  cooldownTicks: 1,
  ...config.safety,
}

// --- Setup account, signer, clients ---
const env = loadEnv()
if (!env.AGENT_MNEMONIC) {
  console.error('AGENT_MNEMONIC not found in .env. Run setup_wallet.mjs first.')
  process.exit(1)
}

const ALGOD_URLS = {
  mainnet: 'https://mainnet-api.algonode.cloud',
  testnet: 'https://testnet-api.algonode.cloud',
}

const account = algosdk.mnemonicToSecretKey(env.AGENT_MNEMONIC)
const address = account.addr.toString()

const signer = async (txnGroup, indexesToSign) => {
  return indexesToSign.map(
    (index) => algosdk.signTransaction(txnGroup[index], account.sk).blob,
  )
}

const router = new RouterClient({
  apiKey: '1b72df7e-1131-4449-8ce1-29b79dd3f51e',
  autoOptIn: true,
})

const algod = new algosdk.Algodv2('', ALGOD_URLS[network], '')

// --- Mutable state ---
const state = {
  startTime: Date.now(),
  tickCount: 0,
  tradeCount: 0,
  lastTradeTick: -Infinity,
  startUsdValue: null,
  priceHistory: [],  // for accumulate strategy SMA
  stopping: false,
}

// --- Journal ---
function journal(entry) {
  const line = JSON.stringify({ ts: new Date().toISOString(), ...entry })
  appendFileSync(journalPath, line + '\n')
  return line
}

// --- Helpers ---
async function getBalances() {
  const info = await algod.accountInformation(address).do()
  const balances = { 0: Number(info.amount) }
  for (const asset of info.assets || []) {
    balances[Number(asset.assetId)] = Number(asset.amount)
  }
  return { balances, minBalance: Number(info.minBalance) }
}

async function getQuote(fromId, toId, amount) {
  return router.newQuote({
    fromASAID: fromId,
    toASAID: toId,
    amount,
    address,
  })
}

async function executeTrade(fromId, toId, amount) {
  const quote = await getQuote(fromId, toId, amount)
  const entry = {
    event: 'quote',
    from: fromId,
    to: toId,
    amountIn: Number(quote.amount),
    expectedOut: Number(quote.quote),
    usdIn: quote.usdIn,
    usdOut: quote.usdOut,
    route: quote.flattenedRoute,
  }
  console.log(`  Quote: ${Number(quote.amount)} ASA ${fromId} -> ${Number(quote.quote)} ASA ${toId} ($${quote.usdIn?.toFixed(4) ?? '?'} -> $${quote.usdOut?.toFixed(4) ?? '?'})`)

  if (dryRun) {
    journal({ ...entry, event: 'dry_run_trade' })
    console.log('  [DRY RUN] Trade not executed')
    state.tradeCount++
    state.lastTradeTick = state.tickCount
    return { ...entry, dryRun: true }
  }

  const swap = await router.newSwap({ quote, address, signer, slippage })
  const result = await swap.execute()
  const summary = swap.getSummary()

  const tradeEntry = {
    event: 'trade',
    from: fromId,
    to: toId,
    amountIn: summary ? Number(summary.inputAmount) : Number(quote.amount),
    amountOut: summary ? Number(summary.outputAmount) : Number(quote.quote),
    usdIn: quote.usdIn,
    usdOut: quote.usdOut,
    fees: summary ? Number(summary.totalFees) : 0,
    txIds: result.txIds,
    confirmedRound: Number(result.confirmedRound),
  }
  console.log(`  Confirmed round ${result.confirmedRound} | txn: ${result.txIds[0]}`)

  state.tradeCount++
  state.lastTradeTick = state.tickCount
  journal(tradeEntry)
  return tradeEntry
}

async function getPortfolioUsdValue(balances) {
  // Estimate total USD value by quoting each non-zero asset to ALGO, then ALGO to USDC
  // Shortcut: use the ALGO balance + quote each ASA to ALGO
  let totalAlgo = balances[0] || 0
  for (const [id, amount] of Object.entries(balances)) {
    if (id === '0' || amount === 0) continue
    try {
      const q = await getQuote(Number(id), 0, amount)
      totalAlgo += Number(q.quote)
    } catch {
      // skip assets that can't be quoted
    }
  }
  // Quote total ALGO to USDC for USD value
  if (totalAlgo < 1000) return 0 // too small to quote
  try {
    const q = await getQuote(0, 31566704, totalAlgo)
    return q.usdIn ?? 0
  } catch {
    return 0
  }
}

// --- Safety checks ---
function checkSafety(balances) {
  // Max trades
  if (state.tradeCount >= safety.maxTrades) {
    return { stop: true, reason: 'max_trades', detail: `${state.tradeCount}/${safety.maxTrades} trades` }
  }
  // Time limit
  const elapsedMin = (Date.now() - state.startTime) / 60000
  if (elapsedMin >= safety.timeLimitMinutes) {
    return { stop: true, reason: 'time_limit', detail: `${elapsedMin.toFixed(1)}/${safety.timeLimitMinutes} min` }
  }
  // Cooldown
  if (state.tickCount - state.lastTradeTick < safety.cooldownTicks) {
    return { skip: true, reason: 'cooldown' }
  }
  // Min ALGO reserve
  const algoBalance = (balances[0] || 0) / 1e6
  if (algoBalance < safety.minAlgoReserve) {
    return { skip: true, reason: 'min_algo_reserve', detail: `${algoBalance.toFixed(4)} < ${safety.minAlgoReserve} ALGO` }
  }
  return { ok: true }
}

async function checkLossLimit(balances) {
  if (!state.startUsdValue || state.startUsdValue <= 0) return { ok: true }
  const currentUsd = await getPortfolioUsdValue(balances)
  if (currentUsd <= 0) return { ok: true }
  const lossPct = ((state.startUsdValue - currentUsd) / state.startUsdValue) * 100
  if (lossPct >= safety.maxLossPct) {
    return { stop: true, reason: 'max_loss', detail: `${lossPct.toFixed(2)}% loss (limit: ${safety.maxLossPct}%)` }
  }
  return { ok: true, currentUsd, lossPct }
}

// --- Strategy: accumulate ---
async function tickAccumulate(balances) {
  const cfg = config.accumulate
  if (!cfg) {
    console.error('Missing "accumulate" config block')
    return stop('config_error')
  }

  const baseId = cfg.baseAsset ?? 0
  const targetId = cfg.targetAsset
  const windowSize = cfg.windowSize || 20
  const buyThreshold = cfg.buyThreshold ?? 2   // percent below SMA to buy
  const sellThreshold = cfg.sellThreshold ?? 2  // percent above SMA to sell
  const tradePercent = cfg.tradePercent ?? 25    // percent of holdings to trade

  const baseBalance = balances[baseId] || 0
  const targetBalance = balances[targetId] || 0

  // Get current exchange rate: how much target do we get for 1 unit of base?
  // Use a reference amount to get the rate (1 ALGO = 1000000 base units for ALGO)
  const refAmount = baseId === 0 ? 1000000 : 1000000
  let rate
  try {
    const q = await getQuote(baseId, targetId, refAmount)
    rate = Number(q.quote) / refAmount
  } catch (err) {
    console.log(`  Could not get rate: ${err.message}`)
    return
  }

  state.priceHistory.push(rate)
  if (state.priceHistory.length > windowSize * 2) {
    state.priceHistory = state.priceHistory.slice(-windowSize)
  }

  // Need at least a few data points before trading
  if (state.priceHistory.length < Math.min(windowSize, 3)) {
    console.log(`  Collecting price data (${state.priceHistory.length}/${windowSize})... rate=${rate.toFixed(6)}`)
    return
  }

  const window = state.priceHistory.slice(-windowSize)
  const sma = window.reduce((a, b) => a + b, 0) / window.length
  const deviation = ((rate - sma) / sma) * 100

  console.log(`  Rate: ${rate.toFixed(6)} | SMA(${window.length}): ${sma.toFixed(6)} | Dev: ${deviation.toFixed(2)}%`)

  // Buy target (spend base) when price is low (rate is high — we get more target per base)
  if (deviation >= buyThreshold && baseBalance > 0) {
    const tradeAmount = Math.floor(baseBalance * (tradePercent / 100))
    if (tradeAmount < 1000) {
      console.log(`  Buy signal but amount too small (${tradeAmount})`)
      return
    }
    // Check ALGO reserve
    if (baseId === 0) {
      const afterBalance = (baseBalance - tradeAmount) / 1e6
      if (afterBalance < safety.minAlgoReserve) {
        console.log(`  Buy signal but would breach ALGO reserve`)
        return
      }
    }
    console.log(`  BUY signal: spending ${tradeAmount} base units of ASA ${baseId}`)
    await executeTrade(baseId, targetId, tradeAmount)
    return
  }

  // Sell target (get base) when price is high (rate is low — target is expensive)
  if (deviation <= -sellThreshold && targetBalance > 0) {
    const tradeAmount = Math.floor(targetBalance * (tradePercent / 100))
    if (tradeAmount < 1000) {
      console.log(`  Sell signal but amount too small (${tradeAmount})`)
      return
    }
    console.log(`  SELL signal: selling ${tradeAmount} base units of ASA ${targetId}`)
    await executeTrade(targetId, baseId, tradeAmount)
    return
  }

  console.log(`  No trade signal`)
}

// --- Strategy: dca ---
async function tickDca(balances) {
  const cfg = config.dca
  if (!cfg) {
    console.error('Missing "dca" config block')
    return stop('config_error')
  }

  const fromId = cfg.fromAsset ?? 0
  const toId = cfg.toAsset
  const amountPerTick = cfg.amountPerTick

  const fromBalance = balances[fromId] || 0

  if (fromBalance < amountPerTick) {
    console.log(`  Insufficient balance: ${fromBalance} < ${amountPerTick} (ASA ${fromId})`)
    return
  }

  // Check ALGO reserve
  if (fromId === 0) {
    const afterBalance = (fromBalance - amountPerTick) / 1e6
    if (afterBalance < safety.minAlgoReserve) {
      console.log(`  Would breach ALGO reserve (${afterBalance.toFixed(4)} < ${safety.minAlgoReserve})`)
      return
    }
  }

  console.log(`  DCA: buying ${amountPerTick} base units of ASA ${fromId} -> ASA ${toId}`)
  await executeTrade(fromId, toId, amountPerTick)
}

// --- Tick dispatcher ---
const strategies = {
  accumulate: tickAccumulate,
  dca: tickDca,
}

async function tick() {
  if (state.stopping) return
  state.tickCount++

  const now = new Date().toISOString()
  console.log(`\n--- Tick ${state.tickCount} | ${now} ---`)

  try {
    const { balances, minBalance } = await getBalances()

    // Log balances
    const balanceStr = Object.entries(balances)
      .map(([id, v]) => `${id === '0' ? 'ALGO' : `ASA ${id}`}: ${v}`)
      .join(', ')
    console.log(`  Balances: ${balanceStr || '(empty)'}`)

    // Safety checks
    const safetyResult = checkSafety(balances)
    if (safetyResult.stop) {
      console.log(`  SAFETY STOP: ${safetyResult.reason} (${safetyResult.detail || ''})`)
      return stop(safetyResult.reason)
    }
    if (safetyResult.skip) {
      console.log(`  Skipping: ${safetyResult.reason}`)
      journal({ event: 'tick', tick: state.tickCount, balances, action: 'skip', reason: safetyResult.reason })
      return
    }

    // Check loss limit (less frequently — every 5 ticks to save API calls)
    if (state.tickCount % 5 === 0 && state.startUsdValue) {
      const lossResult = await checkLossLimit(balances)
      if (lossResult.stop) {
        console.log(`  LOSS LIMIT: ${lossResult.detail}`)
        return stop(lossResult.reason)
      }
    }

    // Run strategy
    const strategyFn = strategies[config.type]
    if (!strategyFn) {
      console.error(`Unknown strategy type: ${config.type}`)
      return stop('config_error')
    }
    await strategyFn(balances)

    // Log tick
    journal({ event: 'tick', tick: state.tickCount, balances, trades: state.tradeCount })
  } catch (err) {
    console.error(`  Tick error: ${err.message}`)
    journal({ event: 'error', tick: state.tickCount, error: err.message })
  }
}

// --- Shutdown ---
let intervalId

function stop(reason) {
  if (state.stopping) return
  state.stopping = true
  const elapsed = ((Date.now() - state.startTime) / 60000).toFixed(1)
  console.log(`\n=== Strategy stopped: ${reason} ===`)
  console.log(`  Ticks:   ${state.tickCount}`)
  console.log(`  Trades:  ${state.tradeCount}`)
  console.log(`  Elapsed: ${elapsed} min`)
  console.log(`  Journal: ${journalPath}`)
  journal({ event: 'stop', reason, ticks: state.tickCount, trades: state.tradeCount, elapsedMinutes: parseFloat(elapsed) })
  if (intervalId) clearInterval(intervalId)
}

process.on('SIGINT', () => {
  console.log('\nReceived SIGINT...')
  stop('user_interrupt')
  process.exit(0)
})

process.on('SIGTERM', () => {
  stop('terminated')
  process.exit(0)
})

// --- Main ---
async function main() {
  console.log(`\nHaystack Strategy Runner`)
  console.log(`Strategy:  ${config.name || config.type}`)
  console.log(`Type:      ${config.type}`)
  console.log(`Network:   ${network}`)
  console.log(`Address:   ${address}`)
  console.log(`Tick:      ${config.tickInterval || 60}s`)
  console.log(`Slippage:  ${slippage}%`)
  console.log(`Dry run:   ${dryRun}`)
  console.log(`Journal:   ${journalPath}`)
  console.log(`Safety:    max ${safety.maxTrades} trades, ${safety.maxLossPct}% max loss, ${safety.timeLimitMinutes}min limit, ${safety.minAlgoReserve} ALGO reserve`)
  console.log()

  // Validate strategy type
  if (!strategies[config.type]) {
    console.error(`Unknown strategy type: "${config.type}". Valid types: ${Object.keys(strategies).join(', ')}`)
    process.exit(1)
  }

  // Record starting portfolio value
  try {
    const { balances } = await getBalances()
    state.startUsdValue = await getPortfolioUsdValue(balances)
    console.log(`Starting portfolio: ~$${state.startUsdValue.toFixed(4)} USD`)
  } catch (err) {
    console.log(`Could not estimate starting value: ${err.message}`)
  }

  journal({ event: 'start', config, address, startUsdValue: state.startUsdValue })

  // Run first tick immediately, then on interval
  await tick()
  intervalId = setInterval(tick, tickInterval)
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
