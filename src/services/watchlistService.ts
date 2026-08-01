import {
  onValue,
  ref,
  remove,
  set,
  type Database,
  type Unsubscribe,
} from 'firebase/database'
import type { MovieSummary, MovieType } from '../types/movie'
import type { WatchlistItem } from '../types/watchlist'
import {
  isValidImdbId,
  normalizeOptionalText,
  normalizePoster,
} from '../utils/movieHelpers'
import {
  requireAuthenticatedUserId,
  requireRealtimeDatabase,
  userCollectionPath,
} from './userCollectionService'

interface WatchlistDatabaseRecord {
  imdbID: string
  title: string
  year: string
  type: MovieType
  poster: string
  addedAt: number
}

export type WatchlistMap = Record<string, WatchlistItem>

export class WatchlistAuthenticationRequiredError extends Error {
  constructor() {
    super('Sign in to add titles to your watchlist.')
    this.name = 'WatchlistAuthenticationRequiredError'
  }
}

export class WatchlistConfigurationError extends Error {
  constructor() {
    super(
      'Your watchlist is unavailable until Firebase is configured in your .env file.',
    )
    this.name = 'WatchlistConfigurationError'
  }
}

export class InvalidWatchlistItemError extends Error {
  constructor() {
    super('This title could not be added because its IMDb ID is invalid.')
    this.name = 'InvalidWatchlistItemError'
  }
}

function canonicalImdbId(value: unknown): string | null {
  if (typeof value !== 'string') return null

  const normalizedId = value.trim().toLowerCase()
  return isValidImdbId(normalizedId) ? normalizedId : null
}

function requireCanonicalImdbId(value: unknown): string {
  const imdbID = canonicalImdbId(value)
  if (!imdbID) throw new InvalidWatchlistItemError()
  return imdbID
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
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

function normalizeAddedAt(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? value
    : 0
}

function toDatabaseRecord(
  movie: MovieSummary,
  imdbID: string,
  addedAt: number,
): WatchlistDatabaseRecord {
  return {
    imdbID,
    title: movie.title,
    year: movie.year ?? '',
    type: movie.type,
    poster: movie.poster ?? '',
    addedAt,
  }
}

function fromDatabaseRecord(
  fallbackImdbID: string,
  value: unknown,
): WatchlistItem | null {
  if (!isRecord(value)) return null

  const imdbID = canonicalImdbId(value.imdbID) ?? canonicalImdbId(fallbackImdbID)
  const title = normalizeOptionalText(value.title)
  const type = isMovieType(value.type) ? value.type : null

  if (!imdbID || !title || !type) return null

  return {
    imdbID,
    title,
    year: normalizeOptionalText(value.year) ?? '',
    type,
    poster: normalizePoster(value.poster) ?? '',
    addedAt: normalizeAddedAt(value.addedAt),
  }
}

export function normalizeWatchlistSnapshot(value: unknown): WatchlistMap {
  if (!isRecord(value)) return {}

  return Object.entries(value).reduce<WatchlistMap>(
    (watchlist, [key, item]) => {
      const normalizedItem = fromDatabaseRecord(key, item)
      if (normalizedItem) {
        watchlist[normalizedItem.imdbID] = normalizedItem
      }
      return watchlist
    },
    {},
  )
}

export function subscribeToWatchlist(
  database: Database | null,
  userId: string | null | undefined,
  handleValue: (watchlist: WatchlistMap) => void,
  handleError: (error: Error) => void,
): Unsubscribe {
  const activeUserId = requireAuthenticatedUserId(
    userId,
    () => new WatchlistAuthenticationRequiredError(),
  )
  const activeDatabase = requireRealtimeDatabase(
    database,
    () => new WatchlistConfigurationError(),
  )

  return onValue(
    ref(activeDatabase, userCollectionPath(activeUserId, 'watchlist')),
    (snapshot) => {
      const snapshotValue: unknown = snapshot.val()
      handleValue(normalizeWatchlistSnapshot(snapshotValue))
    },
    handleError,
  )
}

export async function addWatchlistItemForUser(
  database: Database | null,
  userId: string | null | undefined,
  movie: MovieSummary,
  addedAt = Date.now(),
): Promise<void> {
  const activeUserId = requireAuthenticatedUserId(
    userId,
    () => new WatchlistAuthenticationRequiredError(),
  )
  const activeDatabase = requireRealtimeDatabase(
    database,
    () => new WatchlistConfigurationError(),
  )
  const imdbID = requireCanonicalImdbId(movie.imdbID)

  if (!Number.isFinite(addedAt) || addedAt < 0) {
    throw new InvalidWatchlistItemError()
  }

  await set(
    ref(
      activeDatabase,
      userCollectionPath(activeUserId, 'watchlist', imdbID),
    ),
    toDatabaseRecord(movie, imdbID, addedAt),
  )
}

export async function removeWatchlistItemForUser(
  database: Database | null,
  userId: string | null | undefined,
  imdbID: string,
): Promise<void> {
  const activeUserId = requireAuthenticatedUserId(
    userId,
    () => new WatchlistAuthenticationRequiredError(),
  )
  const activeDatabase = requireRealtimeDatabase(
    database,
    () => new WatchlistConfigurationError(),
  )
  const normalizedId = requireCanonicalImdbId(imdbID)

  await remove(
    ref(
      activeDatabase,
      userCollectionPath(activeUserId, 'watchlist', normalizedId),
    ),
  )
}

export function getWatchlistErrorMessage(error: unknown): string {
  if (
    error instanceof WatchlistAuthenticationRequiredError ||
    error instanceof WatchlistConfigurationError ||
    error instanceof InvalidWatchlistItemError
  ) {
    return error.message
  }

  return 'Your watchlist could not be updated. Please try again.'
}
