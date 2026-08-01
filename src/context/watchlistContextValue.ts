import { createContext } from 'react'
import type { MovieSummary } from '../types/movie'
import type { WatchlistItem } from '../types/watchlist'

export interface WatchlistContextValue {
  watchlist: readonly WatchlistItem[]
  loading: boolean
  isWatchlisted: (imdbID: string) => boolean
  toggleWatchlist: (movie: MovieSummary) => Promise<void>
  addToWatchlist: (movie: MovieSummary) => Promise<void>
  removeFromWatchlist: (imdbID: string) => Promise<void>
  pendingIds: ReadonlySet<string>
  error: string | null
  clearError: () => void
}

export const WatchlistContext = createContext<
  WatchlistContextValue | undefined
>(undefined)
