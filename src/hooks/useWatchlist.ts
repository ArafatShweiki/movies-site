import { useContext } from 'react'
import { WatchlistContext } from '../context/watchlistContextValue'

export function useWatchlist() {
  const context = useContext(WatchlistContext)

  if (!context) {
    throw new Error('useWatchlist must be used inside a WatchlistProvider.')
  }

  return context
}
