#!/usr/bin/env node

/**
 * send.mjs — Send ALGO or any ASA from the agent account
 *
 * Usage:
 *   node scripts/send.mjs --to <address> --asset <id> --amount <baseUnits>
 *
 * Examples:
 *   # Send 1 ALGO
 *   node scripts/send.mjs --to ADDR... --asset 0 --amount 1000000
 *
 *   # Send all HAY
 *   node scripts/send.mjs --to ADDR... --asset 3160000000 --all
 *
 *   # Send 0.5 ALGO
 *   node scripts/send.mjs --to ADDR... --amount 500000
 */

import algosdk from 'algosdk'
import { readFileSync, existsSync } from 'fs'

// --- Args ---
const args = process.argv.slice(2)
function getArg(name) {
  const idx = args.indexOf(`--${name}`)
  return idx !== -1 ? args[idx + 1] : undefined
}
const sendAll = args.includes('--all')

const toAddress = getArg('to')
const assetId = parseInt(getArg('asset') ?? '0')
const amount = sendAll ? undefined : parseInt(getArg('amount'))

if (!toAddress || isNaN(assetId) || (!sendAll && isNaN(amount))) {
  console.error('Usage: node scripts/send.mjs --to <address> [--asset <id>] --amount <baseUnits>')
  console.error('       node scripts/send.mjs --to <address> --asset <id> --all')
  process.exit(1)
}

// --- Load env ---
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
const account = algosdk.mnemonicToSecretKey(env.AGENT_MNEMONIC)
const address = account.addr.toString()
const algod = new algosdk.Algodv2('', `https://${env.NETWORK || 'mainnet'}-api.algonode.cloud`, '')

async function main() {
  const info = await algod.accountInformation(address).do()
  const params = await algod.getTransactionParams().do()
  let txn, sendAmount

  if (assetId === 0) {
    // ALGO transfer
    sendAmount = sendAll ? Number(info.amount) - Number(info.minBalance) - 1000 : amount
    console.log(`Sending ${sendAmount / 1e6} ALGO to ${toAddress}`)
    txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
      sender: address,
      receiver: toAddress,
      amount: BigInt(sendAmount),
      suggestedParams: params,
    })
  } else {
    // ASA transfer
    const asset = (info.assets || []).find((a) => Number(a.assetId) === assetId)
    if (!asset) {
      console.error(`Not opted in to ASA ${assetId}`)
      process.exit(1)
    }
    sendAmount = sendAll ? Number(asset.amount) : amount
    console.log(`Sending ${sendAmount} base units of ASA ${assetId} to ${toAddress}`)
    txn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
      sender: address,
      receiver: toAddress,
      assetIndex: assetId,
      amount: BigInt(sendAmount),
      suggestedParams: params,
    })
  }

  const signed = algosdk.signTransaction(txn, account.sk)
  await algod.sendRawTransaction(signed.blob).do()
  const result = await algosdk.waitForConfirmation(algod, signed.txID, 10)

  console.log(`Confirmed in round ${result.confirmedRound}`)
  console.log(`Explorer: https://explorer.perawallet.app/tx/${signed.txID}`)
}

main().catch((err) => {
  console.error('Error:', err.message || err)
  process.exit(1)
})
