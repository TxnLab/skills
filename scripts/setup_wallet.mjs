#!/usr/bin/env node

/**
 * setup_wallet.mjs — Generate an Algorand account for autonomous agent trading
 *
 * Usage:
 *   node scripts/setup_wallet.mjs [--network mainnet|testnet] [--check]
 *
 * This script:
 *   1. Generates a new Algorand keypair
 *   2. Saves the mnemonic and address to .env
 *   3. Optionally checks if the account is funded
 *
 * If .env already contains AGENT_MNEMONIC, it will load that account instead of
 * generating a new one (use --force to override).
 */

import algosdk from 'algosdk'
import { writeFileSync, readFileSync, existsSync } from 'fs'

const args = process.argv.slice(2)
const network = args.includes('--network')
  ? args[args.indexOf('--network') + 1] || 'testnet'
  : 'testnet'
const checkOnly = args.includes('--check')
const force = args.includes('--force')

const ALGOD_URLS = {
  mainnet: 'https://mainnet-api.algonode.cloud',
  testnet: 'https://testnet-api.algonode.cloud',
}

function loadEnv() {
  if (!existsSync('.env')) return {}
  const env = {}
  const lines = readFileSync('.env', 'utf-8').split('\n')
  for (const line of lines) {
    const match = line.match(/^([A-Z_]+)=(.*)$/)
    if (match) {
      env[match[1]] = match[2].replace(/^["']|["']$/g, '')
    }
  }
  return env
}

function saveEnv(env) {
  const lines = Object.entries(env).map(([k, v]) => `${k}="${v}"`)
  writeFileSync('.env', lines.join('\n') + '\n')
}

async function main() {
  let env = loadEnv()
  let addr, sk

  // Load existing or generate new
  if (env.AGENT_MNEMONIC && !force && !checkOnly) {
    console.log('Found existing AGENT_MNEMONIC in .env, loading account...')
    const restored = algosdk.mnemonicToSecretKey(env.AGENT_MNEMONIC)
    addr = restored.addr
    sk = restored.sk
    console.log(`Address: ${addr}`)
  } else if (checkOnly && env.AGENT_ADDRESS) {
    addr = env.AGENT_ADDRESS
    console.log(`Checking account: ${addr}`)
  } else {
    console.log('Generating new Algorand account...')
    const account = algosdk.generateAccount()
    const mnemonic = algosdk.secretKeyToMnemonic(account.sk)
    addr = account.addr
    sk = account.sk

    env.AGENT_MNEMONIC = mnemonic
    env.AGENT_ADDRESS = addr
    env.NETWORK = network
    saveEnv(env)

    console.log(`\n✅ Account created`)
    console.log(`Address:  ${addr}`)
    console.log(`Network:  ${network}`)
    console.log(`Saved to: .env`)
    console.log(`\n⚠️  Add .env to .gitignore immediately!`)
  }

  // Check balance
  const algodUrl = ALGOD_URLS[env.NETWORK || network]
  if (!algodUrl) {
    console.error(`Unknown network: ${env.NETWORK || network}`)
    process.exit(1)
  }

  const algod = new algosdk.Algodv2('', algodUrl, '')
  try {
    const info = await algod.accountInformation(addr).do()
    // algosdk v3 returns BigInt values — convert with Number() for arithmetic
    const algoBalance = Number(info.amount) / 1e6
    const assetCount = (info.assets || []).length
    const appCount = (info.appsLocalState || []).length

    console.log(`\n--- Account Status ---`)
    console.log(`ALGO balance: ${algoBalance} ALGO`)
    console.log(`Assets opted in: ${assetCount}`)
    console.log(`Apps opted in: ${appCount}`)
    console.log(`Min balance required: ${(0.1 + assetCount * 0.1 + appCount * 0.1).toFixed(1)} ALGO (approx)`)

    if (algoBalance < 1) {
      console.log(`\n⚠️  Account needs funding!`)
      if ((env.NETWORK || network) === 'testnet') {
        console.log(`Fund via testnet dispenser: https://bank.testnet.algorand.network`)
        console.log(`Address to fund: ${addr}`)
      } else {
        console.log(`Transfer ALGO to: ${addr}`)
      }
    } else {
      console.log(`\n✅ Account is funded and ready to trade`)
    }
  } catch (err) {
    if (err.message?.includes('no accounts found')) {
      console.log(`\n⚠️  Account not yet on chain (needs initial funding)`)
      if ((env.NETWORK || network) === 'testnet') {
        console.log(`Fund via: https://bank.testnet.algorand.network`)
        console.log(`Address: ${addr}`)
      } else {
        console.log(`Transfer ALGO to: ${addr}`)
      }
    } else {
      console.error('Error checking account:', err.message)
    }
  }
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
