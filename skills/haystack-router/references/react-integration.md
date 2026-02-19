# React Integration

## Setup

```bash
npm install @txnlab/haystack-router @txnlab/use-wallet-react algosdk
```

Wrap your app with `WalletProvider`:

```tsx
import { WalletProvider, WalletId } from '@txnlab/use-wallet-react'

function App() {
  return (
    <WalletProvider wallets={[
      { id: WalletId.PERA },
      { id: WalletId.DEFLY },
      { id: WalletId.LUTE },
    ]}>
      <SwapInterface />
    </WalletProvider>
  )
}
```

## Basic Swap Component

```tsx
import { useState, useMemo } from 'react'
import { useWallet } from '@txnlab/use-wallet-react'
import { RouterClient, type SwapQuote } from '@txnlab/haystack-router'

function SwapInterface() {
  const { activeAddress, transactionSigner } = useWallet()
  const [amount, setAmount] = useState('')
  const [quote, setQuote] = useState<SwapQuote | null>(null)

  const router = useMemo(
    () => new RouterClient({
      apiKey: import.meta.env.VITE_HAYSTACK_API_KEY,
      autoOptIn: true,
    }),
    [],
  )

  const getQuote = async () => {
    const result = await router.newQuote({
      fromASAID: 0,
      toASAID: 31566704,
      amount: BigInt(Math.floor(parseFloat(amount) * 1_000_000)),
      address: activeAddress!,
    })
    setQuote(result)
  }

  const executeSwap = async () => {
    if (!quote || !activeAddress) return

    const swap = await router.newSwap({
      quote,
      address: activeAddress,
      signer: transactionSigner,
      slippage: 1,
    })

    const result = await swap.execute()
    console.log(`Confirmed in round ${result.confirmedRound}`)
    setQuote(null)
  }

  return (
    <div>
      <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount" />
      <button onClick={getQuote} disabled={!activeAddress || !amount}>Get Quote</button>
      {quote && (
        <div>
          <p>Output: {(Number(quote.quote) / 1e6).toFixed(4)} USDC</p>
          <p>Route: {Object.entries(quote.flattenedRoute).map(([p, pct]) => `${p}: ${pct}%`).join(', ')}</p>
          <button onClick={executeSwap}>Execute Swap</button>
        </div>
      )}
    </div>
  )
}
```

## TanStack Query Integration

For production UIs with auto-refreshing quotes:

```bash
npm install @tanstack/react-query
```

```tsx
import { useState, useEffect, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useWallet } from '@txnlab/use-wallet-react'
import { RouterClient } from '@txnlab/haystack-router'

function SwapWithAutoRefresh() {
  const { activeAddress, transactionSigner } = useWallet()
  const queryClient = useQueryClient()
  const [amount, setAmount] = useState('')
  const [debouncedAmount, setDebouncedAmount] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedAmount(amount), 500)
    return () => clearTimeout(timer)
  }, [amount])

  const router = useMemo(
    () => new RouterClient({
      apiKey: import.meta.env.VITE_HAYSTACK_API_KEY,
      autoOptIn: true,
    }),
    [],
  )

  const { data: quote, isLoading } = useQuery({
    queryKey: ['quote', debouncedAmount, activeAddress],
    queryFn: () => router.newQuote({
      fromASAID: 0,
      toASAID: 31566704,
      amount: BigInt(Math.floor(parseFloat(debouncedAmount) * 1_000_000)),
      address: activeAddress!,
    }),
    enabled: !!activeAddress && !!debouncedAmount && parseFloat(debouncedAmount) > 0,
    refetchInterval: 15_000,
  })

  const swapMutation = useMutation({
    mutationFn: async () => {
      if (!quote || !activeAddress) throw new Error('Missing quote or address')
      const swap = await router.newSwap({
        quote, address: activeAddress, signer: transactionSigner, slippage: 1,
      })
      return swap.execute()
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['quote'] }),
  })

  return (
    <div>
      <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
      {isLoading && <p>Fetching quote...</p>}
      {quote && (
        <div>
          <p>Output: {(Number(quote.quote) / 1e6).toFixed(4)} USDC</p>
          <button onClick={() => swapMutation.mutate()} disabled={swapMutation.isPending}>
            {swapMutation.isPending ? 'Swapping...' : 'Swap'}
          </button>
        </div>
      )}
    </div>
  )
}
```

Key patterns: debounced input (500ms), auto-refresh quotes (15s), invalidate after swap.
