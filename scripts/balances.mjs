#!/usr/bin/env node

/**
 * balances.mjs — Check all balances for the agent's Algorand account
 *
 * Usage:
 *   node scripts/balances.mjs [--network mainnet|testnet]
 */

import algosdk from 'algosdk'
import { readFileSync, existsSync } from 'fs'

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

const env = loadEnv()
const network = process.argv.includes('--network')
  ? process.argv[process.argv.indexOf('--network') + 1]
  : env.NETWORK || 'testnet'

const addr = env.AGENT_ADDRESS || algosdk.mnemonicToSecretKey(env.AGENT_MNEMONIC).addr.toString()

const ALGOD_URLS = {
  mainnet: 'https://mainnet-api.algonode.cloud',
  testnet: 'https://testnet-api.algonode.cloud',
}

async function main() {
  const algod = new algosdk.Algodv2('', ALGOD_URLS[network], '')

  console.log(`\nAccount Balances`)
  console.log(`Address:  ${addr}`)
  console.log(`Network:  ${network}\n`)

  try {
    const info = await algod.accountInformation(addr).do()

    // algosdk v3 returns BigInt values — convert with Number() for display
    const balance = Number(info.amount) / 1e6
    const minBal = Number(info.minBalance) / 1e6
    const avail = balance - minBal

    console.log(`ALGO:     ${balance.toFixed(6)} ALGO`)
    console.log(`Min bal:  ${minBal.toFixed(6)} ALGO`)
    console.log(`Avail:    ${avail.toFixed(6)} ALGO`)

    // algosdk v3 uses camelCase field names (assetId, not asset-id)
    const assets = info.assets || []
    if (assets.length > 0) {
      console.log(`\n--- ASA Holdings (${assets.length}) ---`)
      for (const asset of assets) {
        const assetId = Number(asset.assetId)
        try {
          const assetInfo = await algod.getAssetByID(assetId).do()
          const decimals = assetInfo.params.decimals
          const name = assetInfo.params.unitName || assetInfo.params.name || 'Unknown'
          const displayAmount = Number(asset.amount) / Math.pow(10, decimals)
          console.log(`  ASA ${assetId} (${name}): ${displayAmount} (${asset.amount} base)`)
        } catch {
          console.log(`  ASA ${assetId}: ${asset.amount} base units`)
        }
      }
    } else {
      console.log('\nNo ASA holdings.')
    }

    const apps = info.appsLocalState || []
    if (apps.length > 0) {
      console.log(`\n--- App Opt-ins (${apps.length}) ---`)
      for (const app of apps) {
        console.log(`  App ID: ${app.id}`)
      }
    }

    console.log(`\n--- Summary ---`)
    console.log(`Total ASAs:       ${assets.length}`)
    console.log(`Total app optins: ${apps.length}`)
    console.log(`Explorer: https://${network === 'testnet' ? 'testnet.' : ''}explorer.perawallet.app/address/${addr}`)
  } catch (err) {
    if (err.message?.includes('no accounts found')) {
      console.log('Account not found on chain — needs initial funding.')
      if (network === 'testnet') {
        console.log(`Fund via: https://bank.testnet.algorand.network`)
      }
    } else {
      console.error('Error:', err.message)
    }
  }
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
