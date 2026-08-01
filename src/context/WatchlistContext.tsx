import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useAuth } from '../hooks/useAuth'
import {
  addWatchlistItemForUser,
  getWatchlistErrorMessage,
  removeWatchlistItemForUser,
  subscribeToWatchlist,
  type WatchlistMap,
} from '../services/watchlistService'
import { firebaseDatabase } from '../services/firebase'
import type { MovieSummary } from '../types/movie'
import {
  WatchlistContext,
  type WatchlistContextValue,
} from './watchlistContextValue'

interface WatchlistProviderProps {
  children: ReactNode
}

export function WatchlistProvider({ children }: WatchlistProviderProps) {
  const { user, loading: authLoading } = useAuth()
  const userId = user?.uid ?? null

  return (
    <WatchlistSessionProvider
      key={authLoading ? 'auth-loading' : (userId ?? 'signed-out')}
      authLoading={authLoading}
      userId={userId}
    >
      {children}
    </WatchlistSessionProvider>
  )
}

interface WatchlistSessionProviderProps extends WatchlistProviderProps {
  authLoading: boolean
  userId: string | null
}

function WatchlistSessionProvider({
  authLoading,
  children,
  userId,
}: WatchlistSessionProviderProps) {
  const [watchlistById, setWatchlistById] = useState<WatchlistMap>({})
  const [loading, setLoading] = useState(
    authLoading || Boolean(userId && firebaseDatabase),
  )
  const [error, setError] = useState<string | null>(() =>
    userId && !firebaseDatabase
      ? 'Your watchlist is unavailable until Firebase is configured in your .env file.'
      : null,
  )
  const [pendingIds, setPendingIds] = useState<ReadonlySet<string>>(new Set())
  const pendingIdsRef = useRef(new Set<string>())

  useEffect(() => {
    if (authLoading || !userId || !firebaseDatabase) return undefined

    return subscribeToWatchlist(
      firebaseDatabase,
      userId,
      (nextWatchlist) => {
        setWatchlistById(nextWatchlist)
        setError(null)
        setLoading(false)
      },
      () => {
        setError('Your watchlist could not be loaded. Please try again later.')
        setLoading(false)
      },
    )
  }, [authLoading, userId])

  const runPendingOperation = useCallback(
    async (imdbID: string, operation: () => Promise<void>) => {
      if (pendingIdsRef.current.has(imdbID)) return

      pendingIdsRef.current.add(imdbID)
      setPendingIds(new Set(pendingIdsRef.current))
      setError(null)

      try {
        await operation()
      } catch (operationError) {
        setError(getWatchlistErrorMessage(operationError))
        throw operationError
      } finally {
        pendingIdsRef.current.delete(imdbID)
        setPendingIds(new Set(pendingIdsRef.current))
      }
    },
    [],
  )

  const addToWatchlist = useCallback(
    async (movie: MovieSummary) => {
      await runPendingOperation(movie.imdbID, () =>
        addWatchlistItemForUser(firebaseDatabase, userId, movie),
      )
    },
    [runPendingOperation, userId],
  )

  const removeFromWatchlist = useCallback(
    async (imdbID: string) => {
      await runPendingOperation(imdbID, () =>
        removeWatchlistItemForUser(firebaseDatabase, userId, imdbID),
      )
    },
    [runPendingOperation, userId],
  )

  const isWatchlisted = useCallback(
    (imdbID: string) => Boolean(watchlistById[imdbID.toLowerCase()]),
    [watchlistById],
  )

  const toggleWatchlist = useCallback(
    async (movie: MovieSummary) => {
      if (isWatchlisted(movie.imdbID)) {
        await removeFromWatchlist(movie.imdbID)
      } else {
        await addToWatchlist(movie)
      }
    },
    [addToWatchlist, isWatchlisted, removeFromWatchlist],
  )

  const clearError = useCallback(() => setError(null), [])

  const value = useMemo<WatchlistContextValue>(
    () => ({
      watchlist: Object.values(watchlistById).sort(
        (first, second) => second.addedAt - first.addedAt,
      ),
      loading,
      isWatchlisted,
      toggleWatchlist,
      addToWatchlist,
      removeFromWatchlist,
      pendingIds,
      error,
      clearError,
    }),
    [
      addToWatchlist,
      clearError,
      error,
      isWatchlisted,
      loading,
      pendingIds,
      removeFromWatchlist,
      toggleWatchlist,
      watchlistById,
    ],
  )

  return (
    <WatchlistContext.Provider value={value}>
      {children}
    </WatchlistContext.Provider>
  )
}
