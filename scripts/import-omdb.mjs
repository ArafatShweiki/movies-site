import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { config as loadEnvironmentFile } from 'dotenv'
import {
  applicationDefault,
  getApps,
  initializeApp,
} from 'firebase-admin/app'
import { getDatabase } from 'firebase-admin/database'

const OMDB_ENDPOINT = 'https://www.omdbapi.com/'
const IMDB_ID_PATTERN = /^tt\d{5,12}$/i
const SUPPORTED_TYPES = new Set(['movie', 'series', 'episode', 'game'])
const FIREBASE_APP_NAME = 'reelvault-catalog-importer'

export const SEARCH_TERMS = Object.freeze([
  'Batman',
  'Star Wars',
  'Harry Potter',
  'Spider-Man',
  'Mission Impossible',
  'animation',
  'science fiction',
  'comedy',
])

export const DEFAULT_MAX_MOVIES = 50
export const DEFAULT_CONCURRENCY = 4
export const DEFAULT_REQUEST_TIMEOUT_MS = 15_000

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function normalizeNullableText(value) {
  if (typeof value !== 'string') return null

  const normalized = value.trim()
  return !normalized || /^n\/a$/i.test(normalized) ? null : normalized
}

export function normalizeList(value) {
  const normalized = normalizeNullableText(value)
  if (!normalized) return []

  return normalized
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function normalizePoster(value) {
  const poster = normalizeNullableText(value)
  if (!poster) return null

  try {
    const url = new URL(poster)
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null
  } catch {
    return null
  }
}

function normalizeRating(value) {
  const rating = normalizeNullableText(value)
  if (!rating) return null

  const parsedRating = Number.parseFloat(rating)
  return Number.isFinite(parsedRating) ? parsedRating : null
}

function normalizeType(value) {
  const normalizedType = normalizeNullableText(value)?.toLowerCase()
  return normalizedType && SUPPORTED_TYPES.has(normalizedType)
    ? normalizedType
    : 'unknown'
}

export function normalizeMovieDetails(payload, fetchedAt) {
  if (!isRecord(payload)) return null

  const imdbID = normalizeNullableText(payload.imdbID)?.toLowerCase() ?? null
  const title = normalizeNullableText(payload.Title)
  if (!imdbID || !IMDB_ID_PATTERN.test(imdbID) || !title) return null

  return {
    imdbID,
    title,
    year: normalizeNullableText(payload.Year),
    type: normalizeType(payload.Type),
    poster: normalizePoster(payload.Poster),
    plot: normalizeNullableText(payload.Plot),
    runtime: normalizeNullableText(payload.Runtime),
    genres: normalizeList(payload.Genre),
    director: normalizeNullableText(payload.Director),
    actors: normalizeList(payload.Actors),
    imdbRating: normalizeRating(payload.imdbRating),
    contentRating: normalizeNullableText(payload.Rated),
    country: normalizeNullableText(payload.Country),
    language: normalizeNullableText(payload.Language),
    awards: normalizeNullableText(payload.Awards),
    fetchedAt,
  }
}

export function selectUniqueImdbIds(searchGroups, limit = DEFAULT_MAX_MOVIES) {
  if (!Number.isInteger(limit) || limit < 1) {
    throw new Error('The movie import limit must be a positive whole number.')
  }

  const seenIds = new Set()
  const imdbIDs = []
  let skipped = 0
  const groups = searchGroups.filter(Array.isArray)
  const longestGroupLength = groups.reduce(
    (longest, group) => Math.max(longest, group.length),
    0,
  )

  // Take one result from each query per round so every curated theme can contribute.
  for (let itemIndex = 0; itemIndex < longestGroupLength; itemIndex += 1) {
    for (const searchGroup of groups) {
      const item = searchGroup[itemIndex]
      if (item === undefined) continue
      const imdbID = isRecord(item)
        ? normalizeNullableText(item.imdbID)?.toLowerCase()
        : null

      if (
        !imdbID ||
        !IMDB_ID_PATTERN.test(imdbID) ||
        seenIds.has(imdbID) ||
        imdbIDs.length >= limit
      ) {
        skipped += 1
        continue
      }

      seenIds.add(imdbID)
      imdbIDs.push(imdbID)
    }
  }

  return { imdbIDs, skipped }
}

export async function mapWithConcurrency(items, concurrency, mapper) {
  if (!Number.isInteger(concurrency) || concurrency < 1) {
    throw new Error('OMDb concurrency must be a positive whole number.')
  }

  const results = new Array(items.length)
  let nextIndex = 0

  async function worker() {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex
      nextIndex += 1
      results[currentIndex] = await mapper(items[currentIndex], currentIndex)
    }
  }

  const workerCount = Math.min(concurrency, items.length)
  await Promise.all(Array.from({ length: workerCount }, () => worker()))
  return results
}

function readableError(error) {
  return error instanceof Error && error.message
    ? error.message
    : 'Unknown error'
}

export function createOmdbClient({
  apiKey,
  fetchImpl = globalThis.fetch,
  requestTimeoutMs = DEFAULT_REQUEST_TIMEOUT_MS,
}) {
  if (!apiKey?.trim()) throw new Error('OMDB_API_KEY is required.')
  if (typeof fetchImpl !== 'function') {
    throw new Error('A Fetch implementation is required.')
  }

  async function request(parameters) {
    const url = new URL(OMDB_ENDPOINT)
    url.searchParams.set('apikey', apiKey.trim())
    Object.entries(parameters).forEach(([key, value]) => {
      url.searchParams.set(key, value)
    })

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), requestTimeoutMs)

    try {
      const response = await fetchImpl(url, { signal: controller.signal })
      if (!response.ok) {
        throw new Error(`OMDb returned HTTP ${response.status}.`)
      }

      const payload = await response.json()
      if (!isRecord(payload)) {
        throw new Error('OMDb returned an invalid JSON payload.')
      }

      if (payload.Response === 'False') {
        throw new Error(
          `OMDb rejected the request: ${normalizeNullableText(payload.Error) ?? 'unknown API error'}`,
        )
      }

      if (payload.Response !== 'True') {
        throw new Error('OMDb returned an unexpected response state.')
      }

      return payload
    } catch (error) {
      if (controller.signal.aborted) {
        throw new Error('OMDb request timed out.', { cause: error })
      }
      throw error
    } finally {
      clearTimeout(timeout)
    }
  }

  return {
    async search(term) {
      const payload = await request({
        s: term,
        type: 'movie',
        page: '1',
      })
      if (!Array.isArray(payload.Search)) {
        throw new Error(`OMDb returned invalid search results for "${term}".`)
      }
      return payload.Search
    },

    getDetails(imdbID) {
      return request({ i: imdbID, plot: 'full' })
    },
  }
}

export function createFirebaseWriter(database) {
  if (!database || typeof database.ref !== 'function') {
    throw new Error('A Firebase Admin Realtime Database instance is required.')
  }

  return async (movie) => {
    await database.ref(`catalog/${movie.imdbID}`).set(movie)
  }
}

export function readImporterEnvironment(environment = process.env) {
  const requiredVariables = [
    'OMDB_API_KEY',
    'FIREBASE_DATABASE_URL',
    'GOOGLE_APPLICATION_CREDENTIALS',
  ]
  const missingVariables = requiredVariables.filter(
    (name) => !environment[name]?.trim(),
  )

  if (missingVariables.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVariables.join(', ')}.`,
    )
  }

  let databaseUrl
  try {
    databaseUrl = new URL(environment.FIREBASE_DATABASE_URL.trim())
  } catch {
    throw new Error('FIREBASE_DATABASE_URL must be a valid HTTPS URL.')
  }

  if (databaseUrl.protocol !== 'https:') {
    throw new Error('FIREBASE_DATABASE_URL must use HTTPS.')
  }

  return {
    apiKey: environment.OMDB_API_KEY.trim(),
    databaseUrl: databaseUrl.href,
    credentialsPath: environment.GOOGLE_APPLICATION_CREDENTIALS.trim(),
  }
}

export function initializeAdminDatabase(databaseUrl) {
  const existingApp = getApps().find((app) => app.name === FIREBASE_APP_NAME)
  if (existingApp) {
    if (existingApp.options.databaseURL !== databaseUrl) {
      throw new Error(
        'The catalogue importer is already initialized for a different Firebase database.',
      )
    }

    return getDatabase(existingApp)
  }

  const app = initializeApp(
    {
      // applicationDefault reads the service-account path from GOOGLE_APPLICATION_CREDENTIALS.
      credential: applicationDefault(),
      databaseURL: databaseUrl,
    },
    FIREBASE_APP_NAME,
  )

  return getDatabase(app)
}

function printSummary(logger, stats) {
  logger.log('Import complete.')
  logger.log(`Imported: ${stats.imported}`)
  logger.log(`Skipped: ${stats.skipped}`)
  logger.log(`Failed: ${stats.failed}`)
}

export async function importCatalog({
  omdbClient,
  writeMovie,
  searchTerms = SEARCH_TERMS,
  maxMovies = DEFAULT_MAX_MOVIES,
  concurrency = DEFAULT_CONCURRENCY,
  now = () => new Date(),
  logger = console,
}) {
  if (!omdbClient || typeof omdbClient.search !== 'function') {
    throw new Error('An OMDb client is required.')
  }
  if (typeof omdbClient.getDetails !== 'function') {
    throw new Error('The OMDb client must support full-detail requests.')
  }
  if (typeof writeMovie !== 'function') {
    throw new Error('A Firebase catalogue writer is required.')
  }

  const stats = { imported: 0, skipped: 0, failed: 0 }

  const searchOutcomes = await mapWithConcurrency(
    searchTerms,
    concurrency,
    async (term) => {
      logger.log(`Searching OMDb for "${term}"…`)
      try {
        return { ok: true, movies: await omdbClient.search(term) }
      } catch (error) {
        logger.error(`Search failed for "${term}": ${readableError(error)}`)
        return { ok: false, movies: [] }
      }
    },
  )

  stats.failed += searchOutcomes.filter((outcome) => !outcome.ok).length

  const { imdbIDs, skipped } = selectUniqueImdbIds(
    searchOutcomes.filter((outcome) => outcome.ok).map((outcome) => outcome.movies),
    maxMovies,
  )
  stats.skipped += skipped

  const importOutcomes = await mapWithConcurrency(
    imdbIDs,
    concurrency,
    async (imdbID) => {
      try {
        const details = await omdbClient.getDetails(imdbID)
        const movie = normalizeMovieDetails(details, now().toISOString())

        if (!movie || movie.imdbID !== imdbID) {
          logger.warn(`Skipped ${imdbID}: full details were incomplete or mismatched.`)
          return 'skipped'
        }

        await writeMovie(movie)
        logger.log(`Imported ${movie.imdbID}: ${movie.title}`)
        return 'imported'
      } catch (error) {
        logger.error(`Failed ${imdbID}: ${readableError(error)}`)
        return 'failed'
      }
    },
  )

  for (const outcome of importOutcomes) {
    stats[outcome] += 1
  }

  printSummary(logger, stats)
  return stats
}

export async function main() {
  loadEnvironmentFile({
    path: process.env.DOTENV_CONFIG_PATH?.trim() || '.env.seed',
    override: false,
    quiet: true,
  })

  const configuration = readImporterEnvironment()
  const database = initializeAdminDatabase(configuration.databaseUrl)
  const omdbClient = createOmdbClient({ apiKey: configuration.apiKey })

  return importCatalog({
    omdbClient,
    writeMovie: createFirebaseWriter(database),
  })
}

export function isDirectExecution(metaUrl, argv = process.argv) {
  return Boolean(
    argv[1] && pathToFileURL(resolve(argv[1])).href === metaUrl,
  )
}

if (isDirectExecution(import.meta.url)) {
  main().catch((error) => {
    console.error(`Import aborted: ${readableError(error)}`)
    process.exitCode = 1
  })
}
