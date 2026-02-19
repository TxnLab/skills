#!/usr/bin/env node

/**
 * close_account.mjs — Opt out of all assets and close account, sending remaining ALGO
 *
 * Usage:
 *   node scripts/close_account.mjs --to <address>
 */

import algosdk from 'algosdk'
import { readFileSync, existsSync } from 'fs'

const args = process.argv.slice(2)
const toIdx = args.indexOf('--to')
const toAddress = toIdx !== -1 ? args[toIdx + 1] : null

if (!toAddress) {
  console.error('Usage: node scripts/close_account.mjs --to <address>')
  process.exit(1)
}

function loadEnv() {
  if (!existsSync('.env')) {
    console.error('No .env file found.')
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
const algod = new algosdk.Algodv2('', 'https://mainnet-api.algonode.cloud', '')

async function main() {
  const info = await algod.accountInformation(address).do()
  const balance = Number(info.amount) / 1e6
  const assets = info.assets || []

  console.log(`Account:  ${address}`)
  console.log(`Balance:  ${balance} ALGO`)
  console.log(`Assets:   ${assets.length}`)
  console.log(`Close to: ${toAddress}`)
  console.log()

  const params = await algod.getTransactionParams().do()
  const txns = []

  // Opt out of each asset (must have 0 balance)
  for (const asset of assets) {
    const assetId = Number(asset.assetId)
    console.log(`Opting out of ASA ${assetId}...`)
    txns.push(
      algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
        sender: address,
        receiver: address,
        assetIndex: assetId,
        amount: BigInt(0),
        closeRemainderTo: address,
        suggestedParams: params,
      }),
    )
  }

  // Close account — send all remaining ALGO
  console.log(`Closing account, sending all ALGO to ${toAddress}...`)
  txns.push(
    algosdk.makePaymentTxnWithSuggestedParamsFromObject({
      sender: address,
      receiver: toAddress,
      amount: BigInt(0),
      closeRemainderTo: toAddress,
      suggestedParams: params,
    }),
  )

  // Assign group ID and sign
  algosdk.assignGroupID(txns)
  const signed = txns.map((txn) => algosdk.signTransaction(txn, account.sk).blob)

  // Submit
  const { txId } = await algod.sendRawTransaction(signed).do()
  console.log(`Submitted group txn: ${txns.map((_, i) => algosdk.signTransaction(txns[i], account.sk).txID).join(', ')}`)

  // Wait for confirmation using first txn ID
  const firstTxId = algosdk.signTransaction(txns[0], account.sk).txID
  const result = await algosdk.waitForConfirmation(algod, firstTxId, 10)
  console.log(`Confirmed in round ${result.confirmedRound}`)
  console.log(`\nAccount closed. ~${balance} ALGO sent to ${toAddress}`)
  console.log(`Explorer: https://explorer.perawallet.app/address/${address}`)
}

main().catch((err) => {
  console.error('Error:', err.message || err)
  process.exit(1)
})
