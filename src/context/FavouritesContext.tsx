import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import {
  addFavouriteForUser,
  getFavouriteErrorMessage,
  removeFavouriteForUser,
  subscribeToFavourites,
  type FavouriteMap,
} from '../services/favouritesService'
import { firebaseDatabase } from '../services/firebase'
import type { MovieSummary } from '../types/movie'
import { useAuth } from '../hooks/useAuth'
import {
  FavouritesContext,
  type FavouritesContextValue,
} from './favouritesContextValue'

interface FavouritesProviderProps {
  children: ReactNode
}

export function FavouritesProvider({ children }: FavouritesProviderProps) {
  const { user, loading: authLoading } = useAuth()
  const userId = user?.uid ?? null

  return (
    <FavouritesSessionProvider
      key={authLoading ? 'auth-loading' : (userId ?? 'signed-out')}
      authLoading={authLoading}
      userId={userId}
    >
      {children}
    </FavouritesSessionProvider>
  )
}

interface FavouritesSessionProviderProps extends FavouritesProviderProps {
  authLoading: boolean
  userId: string | null
}

function FavouritesSessionProvider({
  authLoading,
  children,
  userId,
}: FavouritesSessionProviderProps) {
  const [favouritesById, setFavouritesById] = useState<FavouriteMap>({})
  const [loading, setLoading] = useState(
    authLoading || Boolean(userId && firebaseDatabase),
  )
  const [error, setError] = useState<string | null>(() =>
    userId && !firebaseDatabase
      ? 'Favourites are unavailable until Firebase is configured in your .env file.'
      : null,
  )
  const [pendingIds, setPendingIds] = useState<ReadonlySet<string>>(new Set())
  const pendingIdsRef = useRef(new Set<string>())

  useEffect(() => {
    if (authLoading || !userId || !firebaseDatabase) {
      return undefined
    }

    return subscribeToFavourites(
      firebaseDatabase,
      userId,
      (nextFavourites) => {
        setFavouritesById(nextFavourites)
        setLoading(false)
      },
      () => {
        setError('Your favourites could not be loaded. Please try again later.')
        setLoading(false)
      },
    )
  }, [authLoading, userId])

  const runPendingOperation = useCallback(
    async (imdbID: string, operation: () => Promise<void>) => {
      if (pendingIdsRef.current.has(imdbID)) {
        return
      }

      pendingIdsRef.current.add(imdbID)
      setPendingIds(new Set(pendingIdsRef.current))
      setError(null)

      try {
        await operation()
      } catch (operationError) {
        setError(getFavouriteErrorMessage(operationError))
        throw operationError
      } finally {
        pendingIdsRef.current.delete(imdbID)
        setPendingIds(new Set(pendingIdsRef.current))
      }
    },
    [],
  )

  const addFavourite = useCallback(
    async (movie: MovieSummary) => {
      await runPendingOperation(movie.imdbID, () =>
        addFavouriteForUser(firebaseDatabase, userId, movie),
      )
    },
    [runPendingOperation, userId],
  )

  const removeFavourite = useCallback(
    async (imdbID: string) => {
      await runPendingOperation(imdbID, () =>
        removeFavouriteForUser(firebaseDatabase, userId, imdbID),
      )
    },
    [runPendingOperation, userId],
  )

  const isFavourite = useCallback(
    (imdbID: string) => Boolean(favouritesById[imdbID]),
    [favouritesById],
  )

  const toggleFavourite = useCallback(
    async (movie: MovieSummary) => {
      if (isFavourite(movie.imdbID)) {
        await removeFavourite(movie.imdbID)
      } else {
        await addFavourite(movie)
      }
    },
    [addFavourite, isFavourite, removeFavourite],
  )

  const clearError = useCallback(() => setError(null), [])

  const value = useMemo<FavouritesContextValue>(
    () => ({
      favourites: Object.values(favouritesById),
      loading,
      isFavourite,
      toggleFavourite,
      addFavourite,
      removeFavourite,
      pendingIds,
      error,
      clearError,
    }),
    [
      addFavourite,
      clearError,
      error,
      favouritesById,
      isFavourite,
      loading,
      pendingIds,
      removeFavourite,
      toggleFavourite,
    ],
  )

  return (
    <FavouritesContext.Provider value={value}>
      {children}
    </FavouritesContext.Provider>
  )
}

