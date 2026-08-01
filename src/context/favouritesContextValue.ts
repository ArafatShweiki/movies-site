import { createContext } from 'react'
import type { MovieSummary } from '../types/movie'

export interface FavouritesContextValue {
  favourites: MovieSummary[]
  loading: boolean
  isFavourite: (imdbID: string) => boolean
  toggleFavourite: (movie: MovieSummary) => Promise<void>
  addFavourite: (movie: MovieSummary) => Promise<void>
  removeFavourite: (imdbID: string) => Promise<void>
  pendingIds: ReadonlySet<string>
  error: string | null
  clearError: () => void
}

export const FavouritesContext = createContext<
  FavouritesContextValue | undefined
>(undefined)

