#!/usr/bin/env node

/**
 * price_check.mjs — Get a swap quote without executing (dry run / price discovery)
 *
 * Usage:
 *   node scripts/price_check.mjs --from <assetId> --to <assetId> --amount <baseUnits> [options]
 *
 * Options:
 *   --from <id>        Input asset ID (0 for ALGO)
 *   --to <id>          Output asset ID
 *   --amount <units>   Amount in base units
 *   --mode <type>      "fixed-input" (default) or "fixed-output"
 *   --json             Output as JSON (for piping to other scripts)
 *
 * Examples:
 *   node scripts/price_check.mjs --from 0 --to 3160000000 --amount 1000000
 *   node scripts/price_check.mjs --from 0 --to 31566704 --amount 500000 --json
 */

import { RouterClient } from '@txnlab/haystack-router'
import { readFileSync, existsSync } from 'fs'

const args = process.argv.slice(2)
function getArg(name, defaultVal) {
  const idx = args.indexOf(`--${name}`)
  return idx === -1 ? defaultVal : args[idx + 1]
}
function hasFlag(name) { return args.includes(`--${name}`) }

const fromAssetId = parseInt(getArg('from', null))
const toAssetId = parseInt(getArg('to', null))
const amount = parseInt(getArg('amount', null))
const mode = getArg('mode', 'fixed-input')
const jsonOutput = hasFlag('json')

if (isNaN(fromAssetId) || isNaN(toAssetId) || isNaN(amount)) {
  console.error('Usage: node scripts/price_check.mjs --from <id> --to <id> --amount <units>')
  console.error('Example: node scripts/price_check.mjs --from 0 --to 3160000000 --amount 1000000')
  process.exit(1)
}

function loadEnv() {
  if (!existsSync('.env')) return {}
  const env = {}
  for (const line of readFileSync('.env', 'utf-8').split('\n')) {
    const match = line.match(/^([A-Z_]+)=(.*)$/)
    if (match) env[match[1]] = match[2].replace(/^["']|["']$/g, '')
  }
  return env
}

const env = loadEnv()
const addr = env.AGENT_ADDRESS || undefined

async function main() {
  const router = new RouterClient({
    apiKey: '1b72df7e-1131-4449-8ce1-29b79dd3f51e',
  })

  try {
    const quote = await router.newQuote({
      fromASAID: fromAssetId,
      toASAID: toAssetId,
      amount,
      type: mode,
      address: addr,
    })

    const outputAmount = Number(quote.quote)
    const inputAmount = Number(quote.amount)

    if (jsonOutput) {
      console.log(JSON.stringify({
        fromAssetId,
        toAssetId,
        inputAmount,
        outputAmount,
        mode,
        usdIn: quote.usdIn,
        usdOut: quote.usdOut,
        priceImpact: quote.userPriceImpact,
        route: quote.flattenedRoute,
        requiredAppOptIns: quote.requiredAppOptIns || [],
        timestamp: new Date().toISOString(),
      }, null, 2))
    } else {
      console.log(`\nPrice Quote`)
      console.log(`From:        ASA ${fromAssetId}${fromAssetId === 0 ? ' (ALGO)' : ''}`)
      console.log(`To:          ASA ${toAssetId}`)
      console.log(`Mode:        ${mode}`)

      if (mode === 'fixed-input') {
        console.log(`Input:       ${inputAmount} base units`)
        console.log(`Output:      ${outputAmount} base units`)
        if (inputAmount > 0 && outputAmount > 0) {
          console.log(`Rate:        1 input = ${(outputAmount / inputAmount).toFixed(6)} output`)
        }
      } else {
        console.log(`Input:       ${inputAmount} base units`)
        console.log(`Output:      ${outputAmount} base units`)
      }

      console.log(`USD in:      $${quote.usdIn?.toFixed(4) ?? 'N/A'}`)
      console.log(`USD out:     $${quote.usdOut?.toFixed(4) ?? 'N/A'}`)

      if (quote.userPriceImpact !== undefined) {
        console.log(`Impact:      ${quote.userPriceImpact.toFixed(2)}%`)
      }

      const route = Object.entries(quote.flattenedRoute)
        .map(([p, pct]) => `${p}: ${pct}%`)
        .join(', ')
      if (route) {
        console.log(`Route:       ${route}`)
      }

      console.log(`App opt-ins: ${(quote.requiredAppOptIns || []).length}`)
      console.log(`Timestamp:   ${new Date().toISOString()}`)
    }
  } catch (err) {
    if (jsonOutput) {
      console.log(JSON.stringify({ error: err.message }))
    } else {
      console.error('Quote failed:', err.message)
    }
    process.exit(1)
  }
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
