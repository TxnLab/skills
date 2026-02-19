#!/usr/bin/env node

/**
 * swap.mjs — Execute a token swap through the Haystack Router (@txnlab/haystack-router)
 *
 * Usage:
 *   node swap.mjs --from <assetId> --to <assetId> --amount <baseUnits> [options]
 *
 * Options:
 *   --from <id>        Input asset ID (0 for ALGO)
 *   --to <id>          Output asset ID
 *   --amount <units>   Amount in base units (e.g., 1000000 = 1 ALGO)
 *   --slippage <pct>   Slippage tolerance percentage (default: 1)
 *   --dry-run          Get quote only, don't execute
 *
 * Examples:
 *   # Swap 0.5 ALGO for HAY on mainnet
 *   node swap.mjs --from 0 --to 3160000000 --amount 500000
 *
 *   # Dry run — just get a quote
 *   node swap.mjs --from 0 --to 3160000000 --amount 500000 --dry-run
 */

import algosdk from 'algosdk'
import { RouterClient } from '@txnlab/haystack-router'
import { readFileSync, existsSync } from 'fs'

// --- Parse arguments ---
const args = process.argv.slice(2)
function getArg(name, defaultVal) {
  const idx = args.indexOf(`--${name}`)
  if (idx === -1) return defaultVal
  return args[idx + 1]
}
function hasFlag(name) {
  return args.includes(`--${name}`)
}

const fromAssetId = parseInt(getArg('from', null))
const toAssetId = parseInt(getArg('to', null))
const amount = parseInt(getArg('amount', null))
const slippage = parseFloat(getArg('slippage', '1'))
const dryRun = hasFlag('dry-run')

if (isNaN(fromAssetId) || isNaN(toAssetId) || isNaN(amount)) {
  console.error('Usage: node swap.mjs --from <assetId> --to <assetId> --amount <baseUnits>')
  console.error('Example: node swap.mjs --from 0 --to 3160000000 --amount 500000')
  process.exit(1)
}

// --- Load .env ---
function loadEnv() {
  if (!existsSync('.env')) {
    console.error('No .env file found. Run setup_wallet.mjs first.')
    process.exit(1)
  }
  const env = {}
  const lines = readFileSync('.env', 'utf-8').split('\n')
  for (const line of lines) {
    const match = line.match(/^([A-Z_]+)=(.*)$/)
    if (match) env[match[1]] = match[2].replace(/^["']|["']$/g, '')
  }
  return env
}

const env = loadEnv()
if (!env.AGENT_MNEMONIC) {
  console.error('AGENT_MNEMONIC not found in .env. Run setup_wallet.mjs first.')
  process.exit(1)
}

// --- Setup account and signer ---
const account = algosdk.mnemonicToSecretKey(env.AGENT_MNEMONIC)
const address = account.addr.toString()

const signer = async (txnGroup, indexesToSign) => {
  return indexesToSign.map(
    (index) => algosdk.signTransaction(txnGroup[index], account.sk).blob,
  )
}

// --- Main swap logic ---
async function main() {
  console.log(`\nHaystack Swap`)
  console.log(`From:       ASA ${fromAssetId}${fromAssetId === 0 ? ' (ALGO)' : ''}`)
  console.log(`To:         ASA ${toAssetId}`)
  console.log(`Amount:     ${amount} base units`)
  console.log(`Slippage:   ${slippage}%`)
  console.log(`Address:    ${address}`)
  console.log(`Dry run:    ${dryRun}`)
  console.log()

  // Initialize router with auto opt-in
  const router = new RouterClient({
    apiKey: '1b72df7e-1131-4449-8ce1-29b79dd3f51e',
    autoOptIn: true,
    debugLevel: 'info',
  })

  // Step 1: Get quote
  console.log('Fetching quote...')
  const quote = await router.newQuote({
    fromASAID: fromAssetId,
    toASAID: toAssetId,
    amount: amount,
    address: address,
  })

  console.log(`   Expected output: ${quote.quote} base units`)
  console.log(`   USD in:  $${quote.usdIn?.toFixed(4) ?? 'N/A'}`)
  console.log(`   USD out: $${quote.usdOut?.toFixed(4) ?? 'N/A'}`)
  console.log(`   Route: ${Object.entries(quote.flattenedRoute).map(([p, pct]) => `${p}: ${pct}%`).join(', ')}`)

  if (dryRun) {
    console.log('\nDry run complete — no transactions submitted.')
    return
  }

  // Step 2: Execute swap
  console.log('\nExecuting swap...')
  const swap = await router.newSwap({
    quote,
    address,
    signer,
    slippage,
  })

  const result = await swap.execute()
  console.log(`\nSwap confirmed in round ${result.confirmedRound}`)
  console.log(`Transaction IDs: ${result.txIds.join(', ')}`)

  // Step 3: Show summary
  const summary = swap.getSummary()
  if (summary) {
    console.log(`\n--- Swap Summary ---`)
    console.log(`Input:  ${summary.inputAmount} base units (ASA ${summary.inputAssetId})`)
    console.log(`Output: ${summary.outputAmount} base units (ASA ${summary.outputAssetId})`)
    console.log(`Fees:   ${summary.totalFees} microALGO`)
    console.log(`Txns:   ${summary.transactionCount}`)
  }

  // Step 4: Show explorer link
  const txId = result.txIds[0]
  console.log(`\nExplorer: https://explorer.perawallet.app/tx/${txId}`)
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
