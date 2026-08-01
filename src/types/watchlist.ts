import type { MovieType } from './movie'

export interface WatchlistItem {
  readonly imdbID: string
  readonly title: string
  readonly year: string
  readonly type: MovieType
  readonly poster: string
  readonly addedAt: number
}
