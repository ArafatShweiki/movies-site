import type {
  CuratedCollectionDefinition,
  CuratedMovieCollection,
  MovieDetails,
  MovieSearchResult,
  SearchableMovieType,
} from '../types/movie'
import {
  deduplicateMovies,
  isValidImdbId,
  normalizeMovieDetails,
  normalizeMovieSummary,
  normalizeOptionalText,
} from '../utils/movieHelpers'

export type { CuratedMovieCollection } from '../types/movie'

const OMDB_ENDPOINT = 'https://www.omdbapi.com/'

const searchCache = new Map<string, MovieSearchResult>()
const detailsCache = new Map<string, MovieDetails>()

export const DEFAULT_CURATED_COLLECTIONS: readonly CuratedCollectionDefinition[] = [
  { id: 'featured', title: 'Featured This Week', query: 'Batman' },
  { id: 'action', title: 'Action Picks', query: 'Mission Impossible' },
  { id: 'science-fiction', title: 'Science-Fiction Worlds', query: 'Star Wars' },
  { id: 'series', title: 'Series Spotlight', query: 'detective', type: 'series' },
  { id: 'comedy', title: 'Comedy Night', query: 'comedy' },
  { id: 'top-ten', title: 'Top 10 Picks', query: 'Avengers' },
]

export type OmdbErrorCode =
  | 'CONFIG'
  | 'INVALID_REQUEST'
  | 'NOT_FOUND'
  | 'API'
  | 'NETWORK'
  | 'INVALID_RESPONSE'
  | 'ABORTED'

interface OmdbErrorOptions {
  readonly retryable?: boolean
  readonly cause?: unknown
}

export class OmdbError extends Error {
  readonly code: OmdbErrorCode
  readonly retryable: boolean

  constructor(
    code: OmdbErrorCode,
    message: string,
    options: OmdbErrorOptions = {},
  ) {
    super(message, { cause: options.cause })
    this.name = 'OmdbError'
    this.code = code
    this.retryable = options.retryable ?? false
  }
}

export interface SearchMoviesOptions {
  readonly page?: number
  readonly type?: SearchableMovieType
  readonly signal?: AbortSignal
}

export interface MovieDetailsOptions {
  readonly signal?: AbortSignal
}

interface LoadCollectionsOptions {
  readonly signal?: AbortSignal
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function getApiKey(): string {
  const apiKey = import.meta.env.VITE_OMDB_API_KEY?.trim()
  if (!apiKey) {
    throw new OmdbError(
      'CONFIG',
      'OMDb is not configured. Add VITE_OMDB_API_KEY to a local .env file and restart the app.',
    )
  }

  return apiKey
}

function abortError(cause?: unknown): OmdbError {
  return new OmdbError('ABORTED', 'The OMDb request was cancelled.', { cause })
}

function checkForAbort(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw abortError(signal.reason)
  }
}

function isNativeAbortError(error: unknown): boolean {
  return (
    (typeof DOMException !== 'undefined' &&
      error instanceof DOMException &&
      error.name === 'AbortError') ||
    (error instanceof Error && error.name === 'AbortError')
  )
}

export function isAbortError(error: unknown): boolean {
  return (
    (error instanceof OmdbError && error.code === 'ABORTED') ||
    isNativeAbortError(error)
  )
}

export function isOmdbError(error: unknown): error is OmdbError {
  return error instanceof OmdbError
}

export function isOmdbConfigured(): boolean {
  return Boolean(import.meta.env.VITE_OMDB_API_KEY?.trim())
}

async function requestOmdb(
  parameters: Readonly<Record<string, string>>,
  signal?: AbortSignal,
): Promise<Record<string, unknown>> {
  checkForAbort(signal)

  const url = new URL(OMDB_ENDPOINT)
  url.searchParams.set('apikey', getApiKey())
  Object.entries(parameters).forEach(([key, value]) => {
    url.searchParams.set(key, value)
  })

  let response: Response
  try {
    response = await fetch(url, { signal })
  } catch (error: unknown) {
    if (signal?.aborted || isNativeAbortError(error)) {
      throw abortError(error)
    }

    throw new OmdbError(
      'NETWORK',
      'Could not reach OMDb. Check your connection and try again.',
      { retryable: true, cause: error },
    )
  }

  if (!response.ok) {
    throw new OmdbError(
      'API',
      `OMDb returned an HTTP ${response.status} error. Please try again.`,
      { retryable: response.status === 429 || response.status >= 500 },
    )
  }

  let payload: unknown
  try {
    payload = await response.json()
  } catch (error: unknown) {
    throw new OmdbError(
      'INVALID_RESPONSE',
      'OMDb returned a response that could not be read.',
      { retryable: true, cause: error },
    )
  }

  if (!isRecord(payload)) {
    throw new OmdbError(
      'INVALID_RESPONSE',
      'OMDb returned an unexpected response.',
      { retryable: true },
    )
  }

  return payload
}

function readResponseState(payload: Record<string, unknown>): 'True' | 'False' {
  const response = payload.Response
  if (response === 'True' || response === 'False') {
    return response
  }

  throw new OmdbError(
    'INVALID_RESPONSE',
    'OMDb returned an unexpected response.',
    { retryable: true },
  )
}

function readApiError(payload: Record<string, unknown>): string {
  return normalizeOptionalText(payload.Error) ?? 'OMDb could not complete the request.'
}

function isNoResultsError(message: string): boolean {
  return /movie not found/i.test(message)
}

function errorFromFalseResponse(
  payload: Record<string, unknown>,
  missingTitleIsNotFound: boolean,
): OmdbError {
  const apiMessage = readApiError(payload)

  if (/api key/i.test(apiMessage)) {
    return new OmdbError(
      'CONFIG',
      'The OMDb API key is missing or invalid. Check VITE_OMDB_API_KEY in your local .env file.',
    )
  }

  if (
    missingTitleIsNotFound &&
    (isNoResultsError(apiMessage) || /incorrect imdb id/i.test(apiMessage))
  ) {
    return new OmdbError('NOT_FOUND', 'That title could not be found on OMDb.')
  }

  return new OmdbError('API', apiMessage, {
    retryable: /limit|temporar|try again/i.test(apiMessage),
  })
}

function normalizePage(page: number | undefined): number {
  const normalizedPage = page ?? 1
  if (!Number.isInteger(normalizedPage) || normalizedPage < 1 || normalizedPage > 100) {
    throw new OmdbError(
      'INVALID_REQUEST',
      'Search page must be a whole number between 1 and 100.',
    )
  }

  return normalizedPage
}

function parseTotalResults(
  value: unknown,
  fallback: number,
): number {
  const textValue = normalizeOptionalText(value)
  if (!textValue) {
    return fallback
  }

  const parsed = Number.parseInt(textValue, 10)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback
}

function makeSearchCacheKey(
  query: string,
  page: number,
  type?: SearchableMovieType,
): string {
  return `${query.toLocaleLowerCase()}|${page}|${type ?? 'all'}`
}

export async function searchMovies(
  query: string,
  options: SearchMoviesOptions = {},
): Promise<MovieSearchResult> {
  const normalizedQuery = query.trim()
  if (!normalizedQuery) {
    throw new OmdbError(
      'INVALID_REQUEST',
      'Enter a movie or series title before searching.',
    )
  }

  const page = normalizePage(options.page)
  checkForAbort(options.signal)

  const cacheKey = makeSearchCacheKey(normalizedQuery, page, options.type)
  const cachedResult = searchCache.get(cacheKey)
  if (cachedResult) {
    return cachedResult
  }

  const parameters: Record<string, string> = {
    s: normalizedQuery,
    page: String(page),
  }
  if (options.type) {
    parameters.type = options.type
  }

  const payload = await requestOmdb(parameters, options.signal)
  if (readResponseState(payload) === 'False') {
    const apiMessage = readApiError(payload)
    if (isNoResultsError(apiMessage)) {
      const emptyResult: MovieSearchResult = {
        query: normalizedQuery,
        page,
        movies: [],
        totalResults: 0,
      }
      searchCache.set(cacheKey, emptyResult)
      return emptyResult
    }

    throw errorFromFalseResponse(payload, false)
  }

  const rawMovies = payload.Search
  if (!Array.isArray(rawMovies)) {
    throw new OmdbError(
      'INVALID_RESPONSE',
      'OMDb returned search results in an unexpected format.',
      { retryable: true },
    )
  }

  const movies = deduplicateMovies(
    rawMovies.flatMap((movie) => {
      const normalizedMovie = normalizeMovieSummary(movie)
      return normalizedMovie ? [normalizedMovie] : []
    }),
  )

  if (rawMovies.length > 0 && movies.length === 0) {
    throw new OmdbError(
      'INVALID_RESPONSE',
      'OMDb returned search results without usable title information.',
      { retryable: true },
    )
  }

  const result: MovieSearchResult = {
    query: normalizedQuery,
    page,
    movies,
    totalResults: parseTotalResults(payload.totalResults, movies.length),
  }
  searchCache.set(cacheKey, result)

  return result
}

export async function getMovieDetails(
  imdbID: string,
  options: MovieDetailsOptions = {},
): Promise<MovieDetails> {
  const normalizedId = imdbID.trim()
  if (!isValidImdbId(normalizedId)) {
    throw new OmdbError(
      'INVALID_REQUEST',
      'The IMDb ID is invalid. It should look like tt1234567.',
    )
  }

  checkForAbort(options.signal)

  const cacheKey = normalizedId.toLowerCase()
  const cachedDetails = detailsCache.get(cacheKey)
  if (cachedDetails) {
    return cachedDetails
  }

  const payload = await requestOmdb(
    { i: normalizedId, plot: 'full' },
    options.signal,
  )
  if (readResponseState(payload) === 'False') {
    throw errorFromFalseResponse(payload, true)
  }

  const details = normalizeMovieDetails(payload)
  if (!details) {
    throw new OmdbError(
      'INVALID_RESPONSE',
      'OMDb returned title details in an unexpected format.',
      { retryable: true },
    )
  }

  detailsCache.set(cacheKey, details)
  return details
}

export async function loadCuratedCollections(
  definitions: readonly CuratedCollectionDefinition[] = DEFAULT_CURATED_COLLECTIONS,
  options: LoadCollectionsOptions = {},
): Promise<readonly CuratedMovieCollection[]> {
  const settledResults = await Promise.allSettled(
    definitions.map(async (definition) => {
      const result = await searchMovies(definition.query, {
        signal: options.signal,
        type: definition.type,
      })

      return { definition, movies: result.movies }
    }),
  )

  const results = settledResults.flatMap((result) =>
    result.status === 'fulfilled' ? [result.value] : [],
  )

  if (results.length === 0) {
    const firstFailure = settledResults.find(
      (result): result is PromiseRejectedResult => result.status === 'rejected',
    )
    throw firstFailure?.reason instanceof Error
      ? firstFailure.reason
      : new OmdbError(
          'API',
          'OMDb could not load the curated collections. Please try again.',
          { retryable: true, cause: firstFailure?.reason },
        )
  }

  const usedIds = new Set<string>()
  return results.map(({ definition, movies }) => ({
    ...definition,
    movies: movies.filter((movie) => {
      const normalizedId = movie.imdbID.toLowerCase()
      if (usedIds.has(normalizedId)) {
        return false
      }

      usedIds.add(normalizedId)
      return true
    }),
  }))
}

export function clearOmdbCache(): void {
  searchCache.clear()
  detailsCache.clear()
}
