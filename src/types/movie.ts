export type MovieType = 'movie' | 'series' | 'episode' | 'game' | 'unknown'

export type SearchableMovieType = Extract<
  MovieType,
  'movie' | 'series' | 'episode'
>

export interface MovieSummary {
  readonly imdbID: string
  readonly title: string
  readonly year: string | null
  readonly type: MovieType
  readonly poster: string | null
}

export interface MovieRating {
  readonly source: string
  readonly value: string
}

export interface MovieDetails extends MovieSummary {
  readonly contentRating: string | null
  readonly runtime: string | null
  readonly genres: readonly string[]
  readonly directors: readonly string[]
  readonly writers: readonly string[]
  readonly actors: readonly string[]
  readonly plot: string | null
  readonly languages: readonly string[]
  readonly countries: readonly string[]
  readonly awards: string | null
  readonly imdbRating: string | null
  readonly ratings: readonly MovieRating[]
  readonly released: string | null
  readonly totalSeasons: string | null
}

export interface MovieSearchResult {
  readonly query: string
  readonly page: number
  readonly movies: readonly MovieSummary[]
  readonly totalResults: number
}

export interface CuratedCollectionDefinition {
  readonly id: string
  readonly title: string
  readonly query: string
  readonly type?: SearchableMovieType
}

export interface CuratedMovieCollection extends CuratedCollectionDefinition {
  readonly movies: readonly MovieSummary[]
}
