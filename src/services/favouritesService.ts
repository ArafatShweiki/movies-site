import {
  onValue,
  ref,
  remove,
  set,
  type Database,
  type Unsubscribe,
} from 'firebase/database'
import type { MovieSummary, MovieType } from '../types/movie'

interface FavouriteDatabaseRecord {
  imdbID: string
  Title: string
  Year: string
  Type: MovieType
  Poster: string
}

export type FavouriteMap = Record<string, MovieSummary>

export class AuthenticationRequiredError extends Error {
  constructor() {
    super('Sign in to add titles to your favourites.')
    this.name = 'AuthenticationRequiredError'
  }
}

export class FavouritesConfigurationError extends Error {
  constructor() {
    super(
      'Favourites are unavailable until Firebase is configured in your .env file.',
    )
    this.name = 'FavouritesConfigurationError'
  }
}

function requireUserId(userId: string | null | undefined): string {
  const normalizedUserId = userId?.trim()

  if (!normalizedUserId) {
    throw new AuthenticationRequiredError()
  }

  return normalizedUserId
}

function requireDatabase(database: Database | null): Database {
  if (!database) {
    throw new FavouritesConfigurationError()
  }

  return database
}

function favouritePath(userId: string, imdbID?: string): string {
  const basePath = `users/${userId}/favourites`
  return imdbID ? `${basePath}/${imdbID}` : basePath
}

function toDatabaseRecord(movie: MovieSummary): FavouriteDatabaseRecord {
  return {
    imdbID: movie.imdbID,
    Title: movie.title,
    Year: movie.year ?? 'N/A',
    Type: movie.type,
    Poster: movie.poster ?? 'N/A',
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isMovieType(value: unknown): value is MovieType {
  return (
    value === 'movie' ||
    value === 'series' ||
    value === 'episode' ||
    value === 'game' ||
    value === 'unknown'
  )
}

function fromDatabaseRecord(
  fallbackImdbID: string,
  value: unknown,
): MovieSummary | null {
  if (!isRecord(value)) {
    return null
  }

  const imdbID =
    typeof value.imdbID === 'string' && value.imdbID.trim()
      ? value.imdbID
      : fallbackImdbID
  const title = typeof value.Title === 'string' ? value.Title : ''
  const year =
    typeof value.Year === 'string' && value.Year !== 'N/A'
      ? value.Year
      : null
  const type = isMovieType(value.Type) ? value.Type : null
  const poster =
    typeof value.Poster === 'string' && value.Poster !== 'N/A'
      ? value.Poster
      : null

  if (!imdbID || !title || !type) {
    return null
  }

  return { imdbID, title, year, type, poster }
}

export function normalizeFavouriteSnapshot(value: unknown): FavouriteMap {
  if (!isRecord(value)) {
    return {}
  }

  return Object.entries(value).reduce<FavouriteMap>((favourites, [key, item]) => {
    const movie = fromDatabaseRecord(key, item)

    if (movie) {
      favourites[movie.imdbID] = movie
    }

    return favourites
  }, {})
}

export function subscribeToFavourites(
  database: Database | null,
  userId: string | null | undefined,
  handleValue: (favourites: FavouriteMap) => void,
  handleError: (error: Error) => void,
): Unsubscribe {
  const activeUserId = requireUserId(userId)
  const activeDatabase = requireDatabase(database)

  return onValue(
    ref(activeDatabase, favouritePath(activeUserId)),
    (snapshot) => {
      const snapshotValue: unknown = snapshot.val()
      handleValue(normalizeFavouriteSnapshot(snapshotValue))
    },
    handleError,
  )
}

export async function addFavouriteForUser(
  database: Database | null,
  userId: string | null | undefined,
  movie: MovieSummary,
): Promise<void> {
  const activeUserId = requireUserId(userId)
  const activeDatabase = requireDatabase(database)

  await set(
    ref(activeDatabase, favouritePath(activeUserId, movie.imdbID)),
    toDatabaseRecord(movie),
  )
}

export async function removeFavouriteForUser(
  database: Database | null,
  userId: string | null | undefined,
  imdbID: string,
): Promise<void> {
  const activeUserId = requireUserId(userId)
  const activeDatabase = requireDatabase(database)

  await remove(ref(activeDatabase, favouritePath(activeUserId, imdbID)))
}

export function getFavouriteErrorMessage(error: unknown): string {
  if (error instanceof AuthenticationRequiredError) {
    return error.message
  }

  if (error instanceof FavouritesConfigurationError) {
    return error.message
  }

  return 'Your favourites could not be updated. Please try again.'
}
