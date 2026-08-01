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
const CATALOG_PATH_PATTERN = /^catalog\/tt\d{5,12}$/
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

function assertMovieLimit(limit) {
  if (
    !Number.isSafeInteger(limit) ||
    limit < 1 ||
    limit > DEFAULT_MAX_MOVIES
  ) {
    throw new Error(
      `--limit=N must be a whole number from 1 to ${DEFAULT_MAX_MOVIES}.`,
    )
  }
}

export function parseImporterArguments(args = process.argv.slice(2)) {
  if (!Array.isArray(args) || args.some((argument) => typeof argument !== 'string')) {
    throw new Error('Importer arguments must be provided as strings.')
  }

  let dryRun = false
  let hasDryRunOption = false
  let hasLimitOption = false
  let maxMovies = DEFAULT_MAX_MOVIES

  for (const argument of args) {
    if (argument === '--dry-run') {
      if (hasDryRunOption) {
        throw new Error('--dry-run may only be provided once.')
      }
      hasDryRunOption = true
      dryRun = true
      continue
    }

    if (argument.startsWith('--limit=')) {
      if (hasLimitOption) {
        throw new Error('--limit=N may only be provided once.')
      }

      const rawLimit = argument.slice('--limit='.length)
      if (!/^[1-9]\d*$/.test(rawLimit)) {
        throw new Error(
          `--limit=N must be a whole number from 1 to ${DEFAULT_MAX_MOVIES}.`,
        )
      }

      maxMovies = Number(rawLimit)
      assertMovieLimit(maxMovies)
      hasLimitOption = true
      continue
    }

    throw new Error(
      `Unknown importer option "${argument}". Use --dry-run and/or --limit=N.`,
    )
  }

  return { dryRun, maxMovies }
}

export function catalogPathForImdbID(imdbID) {
  if (
    typeof imdbID !== 'string' ||
    imdbID !== imdbID.trim() ||
    imdbID !== imdbID.toLowerCase() ||
    !IMDB_ID_PATTERN.test(imdbID)
  ) {
    throw new Error('Refusing unsafe Firebase write: invalid canonical IMDb ID.')
  }

  const path = `catalog/${imdbID}`
  if (!CATALOG_PATH_PATTERN.test(path)) {
    throw new Error('Refusing unsafe Firebase write path.')
  }

  return path
}

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
  assertMovieLimit(limit)

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

export function createFirebaseWriter(database, { logger = console } = {}) {
  if (!database || typeof database.ref !== 'function') {
    throw new Error('A Firebase Admin Realtime Database instance is required.')
  }
  if (!logger || typeof logger.log !== 'function') {
    throw new Error('A logger with a log method is required.')
  }

  return async (movie) => {
    if (!isRecord(movie)) {
      throw new Error('Refusing unsafe Firebase write: movie must be an object.')
    }

    const path = catalogPathForImdbID(movie.imdbID)
    logger.log(`Firebase write path: ${path}`)
    await database.ref(path).set(movie)
  }
}

export function readImporterEnvironment(
  environment = process.env,
  { requireFirebase = true } = {},
) {
  const requiredVariables = requireFirebase
    ? [
        'OMDB_API_KEY',
        'FIREBASE_DATABASE_URL',
        'GOOGLE_APPLICATION_CREDENTIALS',
      ]
    : ['OMDB_API_KEY']
  const missingVariables = requiredVariables.filter(
    (name) => !environment[name]?.trim(),
  )

  if (missingVariables.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVariables.join(', ')}.`,
    )
  }

  const apiKey = environment.OMDB_API_KEY.trim()
  if (!requireFirebase) {
    return { apiKey }
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

  if (
    databaseUrl.username ||
    databaseUrl.password ||
    databaseUrl.search ||
    databaseUrl.hash ||
    databaseUrl.pathname !== '/'
  ) {
    throw new Error(
      'FIREBASE_DATABASE_URL must point to the HTTPS database root without credentials, a path, query, or fragment.',
    )
  }

  return {
    apiKey,
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

function printSummary(logger, stats, { dryRun, maxMovies, planned }) {
  logger.log('Import confirmation summary:')
  logger.log(`Mode: ${dryRun ? 'dry run (no Firebase writes)' : 'live import'}`)
  logger.log(`Limit: ${maxMovies}`)
  if (dryRun) logger.log(`Would import: ${planned}`)
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
  dryRun = false,
}) {
  if (!omdbClient || typeof omdbClient.search !== 'function') {
    throw new Error('An OMDb client is required.')
  }
  if (typeof omdbClient.getDetails !== 'function') {
    throw new Error('The OMDb client must support full-detail requests.')
  }
  if (!dryRun && typeof writeMovie !== 'function') {
    throw new Error('A Firebase catalogue writer is required.')
  }

  const stats = { imported: 0, skipped: 0, failed: 0 }
  let planned = 0

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

        const path = catalogPathForImdbID(movie.imdbID)
        if (dryRun) {
          logger.log(`[dry-run] Would write ${path}`)
          return 'planned'
        }

        await writeMovie(movie)
        logger.log(`Imported ${path}`)
        return 'imported'
      } catch (error) {
        logger.error(`Failed ${imdbID}: ${readableError(error)}`)
        return 'failed'
      }
    },
  )

  for (const outcome of importOutcomes) {
    if (outcome === 'planned') planned += 1
    else stats[outcome] += 1
  }

  printSummary(logger, stats, { dryRun, maxMovies, planned })
  return dryRun ? { ...stats, planned } : stats
}

export async function runImporter({
  options,
  environment = process.env,
  logger = console,
  omdbClientFactory = createOmdbClient,
  databaseInitializer = initializeAdminDatabase,
  writerFactory = createFirebaseWriter,
} = {}) {
  if (
    !isRecord(options) ||
    typeof options.dryRun !== 'boolean'
  ) {
    throw new Error('Parsed importer options are required.')
  }
  assertMovieLimit(options.maxMovies)

  const configuration = readImporterEnvironment(environment, {
    requireFirebase: !options.dryRun,
  })
  const omdbClient = omdbClientFactory({ apiKey: configuration.apiKey })
  let writeMovie

  if (!options.dryRun) {
    const database = databaseInitializer(configuration.databaseUrl)
    writeMovie = writerFactory(database, { logger })
  }

  return importCatalog({
    omdbClient,
    writeMovie,
    maxMovies: options.maxMovies,
    dryRun: options.dryRun,
    logger,
  })
}

export async function main(args = process.argv.slice(2)) {
  const options = parseImporterArguments(args)

  loadEnvironmentFile({
    path: process.env.DOTENV_CONFIG_PATH?.trim() || '.env.seed',
    override: false,
    quiet: true,
  })

  return runImporter({ options, environment: process.env })
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
