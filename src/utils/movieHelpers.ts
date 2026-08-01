import type {
  MovieDetails,
  MovieRating,
  MovieSummary,
  MovieType,
} from '../types/movie'

const unavailableValue = /^n\/a$/i
const imdbIdPattern = /^tt\d{5,12}$/i
const supportedMovieTypes = new Set<MovieType>([
  'movie',
  'series',
  'episode',
  'game',
])

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readProperty(
  source: Record<string, unknown>,
  property: string,
): unknown {
  return source[property]
}

export function normalizeOptionalText(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null
  }

  const normalized = value.trim()
  return normalized.length === 0 || unavailableValue.test(normalized)
    ? null
    : normalized
}

export function normalizeTextList(value: unknown): readonly string[] {
  const text = normalizeOptionalText(value)
  if (!text) {
    return []
  }

  return text
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0 && !unavailableValue.test(item))
}

export function normalizeMovieType(value: unknown): MovieType {
  const normalized = normalizeOptionalText(value)?.toLowerCase()

  return normalized && supportedMovieTypes.has(normalized as MovieType)
    ? (normalized as MovieType)
    : 'unknown'
}

export function formatMovieType(type: MovieType): string {
  switch (type) {
    case 'series':
      return 'Series'
    case 'episode':
      return 'Episode'
    case 'game':
      return 'Game'
    case 'movie':
      return 'Movie'
    default:
      return 'Title'
  }
}

export function normalizePoster(value: unknown): string | null {
  const poster = normalizeOptionalText(value)
  if (!poster) return null

  try {
    const url = new URL(poster)
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null
  } catch {
    return null
  }
}

export function isValidImdbId(value: string): boolean {
  return imdbIdPattern.test(value.trim())
}

export function normalizeMovieSummary(value: unknown): MovieSummary | null {
  if (!isRecord(value)) {
    return null
  }

  const imdbID = normalizeOptionalText(readProperty(value, 'imdbID'))
  const title = normalizeOptionalText(readProperty(value, 'Title'))

  if (!imdbID || !isValidImdbId(imdbID) || !title) {
    return null
  }

  return {
    imdbID,
    title,
    year: normalizeOptionalText(readProperty(value, 'Year')),
    type: normalizeMovieType(readProperty(value, 'Type')),
    poster: normalizePoster(readProperty(value, 'Poster')),
  }
}

function normalizeRatings(value: unknown): readonly MovieRating[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value.flatMap((rating): readonly MovieRating[] => {
    if (!isRecord(rating)) {
      return []
    }

    const source = normalizeOptionalText(readProperty(rating, 'Source'))
    const ratingValue = normalizeOptionalText(readProperty(rating, 'Value'))

    return source && ratingValue ? [{ source, value: ratingValue }] : []
  })
}

export function normalizeMovieDetails(value: unknown): MovieDetails | null {
  if (!isRecord(value)) {
    return null
  }

  const summary = normalizeMovieSummary(value)
  if (!summary) {
    return null
  }

  return {
    ...summary,
    contentRating: normalizeOptionalText(readProperty(value, 'Rated')),
    runtime: normalizeOptionalText(readProperty(value, 'Runtime')),
    genres: normalizeTextList(readProperty(value, 'Genre')),
    directors: normalizeTextList(readProperty(value, 'Director')),
    writers: normalizeTextList(readProperty(value, 'Writer')),
    actors: normalizeTextList(readProperty(value, 'Actors')),
    plot: normalizeOptionalText(readProperty(value, 'Plot')),
    languages: normalizeTextList(readProperty(value, 'Language')),
    countries: normalizeTextList(readProperty(value, 'Country')),
    awards: normalizeOptionalText(readProperty(value, 'Awards')),
    imdbRating: normalizeOptionalText(readProperty(value, 'imdbRating')),
    ratings: normalizeRatings(readProperty(value, 'Ratings')),
    released: normalizeOptionalText(readProperty(value, 'Released')),
    totalSeasons: normalizeOptionalText(readProperty(value, 'totalSeasons')),
  }
}

export function deduplicateMovies(
  movies: readonly MovieSummary[],
): MovieSummary[] {
  const seenIds = new Set<string>()

  return movies.filter((movie) => {
    const normalizedId = movie.imdbID.toLowerCase()
    if (seenIds.has(normalizedId)) {
      return false
    }

    seenIds.add(normalizedId)
    return true
  })
}

export function hasUsablePoster(
  movie: Pick<MovieSummary, 'poster'>,
): movie is Pick<MovieSummary, 'poster'> & { readonly poster: string } {
  return normalizePoster(movie.poster) !== null
}
