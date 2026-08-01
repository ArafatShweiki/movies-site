import { get, ref, type Database } from 'firebase/database'
import type { FeaturedSeriesSlide, MovieDetails } from '../types/movie'
import { deduplicateMovies, normalizeOptionalText, normalizePoster } from '../utils/movieHelpers'
import { getMovieDetails, searchMovies } from './omdbService'

const FEATURED_SERIES_LIMIT = 5
const FALLBACK_SERIES_QUERIES = [
  'Sherlock',
  'Stranger Things',
  'The Crown',
  'Breaking Bad',
  'The Mandalorian',
] as const
let featuredSeriesCache: readonly FeaturedSeriesSlide[] | null = null

interface FeaturedSeriesOptions {
  readonly signal?: AbortSignal
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function normalizeGenres(value: unknown): readonly string[] {
  if (Array.isArray(value)) {
    return value.flatMap((genre) => {
      const normalized = normalizeOptionalText(genre)
      return normalized ? [normalized] : []
    })
  }

  const normalized = normalizeOptionalText(value)
  return normalized
    ? normalized.split(',').map((genre) => genre.trim()).filter(Boolean)
    : []
}

function normalizeRating(value: unknown): string | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value)
  }

  return normalizeOptionalText(value)
}

export function normalizeCatalogSeries(value: unknown): FeaturedSeriesSlide | null {
  if (!isRecord(value)) return null

  const imdbID = normalizeOptionalText(value.imdbID)?.toLowerCase() ?? null
  const title = normalizeOptionalText(value.title)
  const year = normalizeOptionalText(value.year)
  const type = normalizeOptionalText(value.type)?.toLowerCase()
  const poster = normalizePoster(value.poster)
  const plot = normalizeOptionalText(value.plot)

  if (!imdbID || !/^tt\d{5,12}$/.test(imdbID) || !title || type !== 'series' || !poster || !plot) {
    return null
  }

  return {
    imdbID,
    title,
    year,
    type: 'series',
    poster,
    plot,
    genres: normalizeGenres(value.genres),
    imdbRating: normalizeRating(value.imdbRating),
  }
}

function detailsToFeaturedSeries(details: MovieDetails): FeaturedSeriesSlide | null {
  if (details.type !== 'series' || !details.poster || !details.plot) return null

  return {
    imdbID: details.imdbID,
    title: details.title,
    year: details.year,
    type: 'series',
    poster: details.poster,
    plot: details.plot,
    genres: details.genres,
    imdbRating: details.imdbRating,
  }
}

async function loadCatalogueSeries(
  database: Database | null,
  signal?: AbortSignal,
): Promise<FeaturedSeriesSlide[]> {
  if (!database) return []
  if (signal?.aborted) throw signal.reason

  const snapshot = await get(ref(database, 'catalog'))
  if (signal?.aborted) throw signal.reason

  const value: unknown = snapshot.val()
  if (!isRecord(value)) return []

  return Object.values(value)
    .flatMap((record) => {
      const series = normalizeCatalogSeries(record)
      return series ? [series] : []
    })
    .slice(0, FEATURED_SERIES_LIMIT)
}

async function loadFallbackSeries(
  maxResults: number,
  excludedIds: ReadonlySet<string>,
  signal?: AbortSignal,
): Promise<FeaturedSeriesSlide[]> {
  if (maxResults < 1) return []

  const searchResults = await Promise.allSettled(
    FALLBACK_SERIES_QUERIES.map((query) =>
      searchMovies(query, { type: 'series', signal }),
    ),
  )

  const successfulSearches = searchResults.filter(
    (result): result is PromiseFulfilledResult<Awaited<ReturnType<typeof searchMovies>>> =>
      result.status === 'fulfilled',
  )
  if (successfulSearches.length === 0) {
    const firstFailure = searchResults.find(
      (result): result is PromiseRejectedResult => result.status === 'rejected',
    )
    if (firstFailure) throw firstFailure.reason
  }

  const candidates = deduplicateMovies(
    successfulSearches.flatMap((result) => result.value.movies.slice(0, 1)),
  ).filter((candidate) => !excludedIds.has(candidate.imdbID.toLowerCase()))

  const featuredSeries: FeaturedSeriesSlide[] = []
  let firstFailure: unknown = null
  let successfulDetailRequests = 0

  // Resolve only as many detail records as the carousel still needs, while
  // continuing to the next candidate when one OMDb title fails.
  for (const candidate of candidates) {
    try {
      const details = await getMovieDetails(candidate.imdbID, { signal })
      successfulDetailRequests += 1
      const series = detailsToFeaturedSeries(details)
      if (series) featuredSeries.push(series)
      if (featuredSeries.length >= maxResults) break
    } catch (error: unknown) {
      if (signal?.aborted) throw error
      firstFailure ??= error
    }
  }

  if (
    featuredSeries.length === 0 &&
    candidates.length > 0 &&
    successfulDetailRequests === 0 &&
    firstFailure
  ) {
    throw firstFailure
  }

  return featuredSeries
}

function deduplicateFeaturedSeries(
  series: readonly FeaturedSeriesSlide[],
): FeaturedSeriesSlide[] {
  const seenIds = new Set<string>()
  return series.filter((item) => {
    const normalizedId = item.imdbID.toLowerCase()
    if (seenIds.has(normalizedId)) return false
    seenIds.add(normalizedId)
    return true
  })
}

export async function loadFeaturedSeries(
  database: Database | null,
  options: FeaturedSeriesOptions = {},
): Promise<readonly FeaturedSeriesSlide[]> {
  if (featuredSeriesCache) return featuredSeriesCache

  let catalogueSeries: FeaturedSeriesSlide[] = []
  let catalogueFailure: unknown = null

  try {
    catalogueSeries = await loadCatalogueSeries(database, options.signal)
  } catch (error: unknown) {
    catalogueFailure = error
  }

  if (catalogueSeries.length >= FEATURED_SERIES_LIMIT) {
    featuredSeriesCache = catalogueSeries.slice(0, FEATURED_SERIES_LIMIT)
    return featuredSeriesCache
  }

  try {
    const excludedIds = new Set(
      catalogueSeries.map((series) => series.imdbID.toLowerCase()),
    )
    const fallbackSeries = await loadFallbackSeries(
      FEATURED_SERIES_LIMIT - catalogueSeries.length,
      excludedIds,
      options.signal,
    )
    const combined = deduplicateFeaturedSeries([
      ...catalogueSeries,
      ...fallbackSeries,
    ])

    const result = combined.slice(0, FEATURED_SERIES_LIMIT)
    if (result.length > 0) featuredSeriesCache = result
    return result
  } catch (fallbackFailure: unknown) {
    if (catalogueSeries.length > 0) return catalogueSeries
    throw fallbackFailure ?? catalogueFailure
  }
}

export function clearFeaturedSeriesCache(): void {
  featuredSeriesCache = null
}
