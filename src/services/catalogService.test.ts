import type { Database } from 'firebase/database'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { MovieDetails, MovieSummary } from '../types/movie'

const databaseMocks = vi.hoisted(() => ({
  get: vi.fn(),
  ref: vi.fn((_database: unknown, path: string) => path),
}))

const omdbMocks = vi.hoisted(() => ({
  getMovieDetails: vi.fn(),
  searchMovies: vi.fn(),
}))

vi.mock('firebase/database', () => databaseMocks)
vi.mock('./omdbService', () => omdbMocks)

import {
  clearFeaturedSeriesCache,
  loadFeaturedSeries,
  normalizeCatalogSeries,
} from './catalogService'

const database = {} as Database

function summary(imdbID: string, title: string): MovieSummary {
  return {
    imdbID,
    title,
    year: '2024',
    type: 'series',
    poster: `https://images.example/${imdbID}.jpg`,
  }
}

function details(movie: MovieSummary): MovieDetails {
  return {
    ...movie,
    contentRating: null,
    runtime: '45 min',
    genres: ['Drama'],
    directors: [],
    writers: [],
    actors: ['One Actor'],
    plot: `A complete plot for ${movie.title}.`,
    languages: ['English'],
    countries: ['United States'],
    awards: null,
    imdbRating: '8.0',
    ratings: [],
    released: null,
    totalSeasons: '2',
  }
}

function catalogRecord(index: number) {
  return {
    imdbID: `tt${String(index).padStart(7, '0')}`,
    title: `Catalog Series ${index}`,
    year: '2020–2024',
    type: 'series',
    poster: `https://images.example/catalog-${index}.jpg`,
    plot: `Plot ${index}`,
    genres: ['Drama', 'Mystery'],
    imdbRating: 8.2,
  }
}

describe('catalogService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clearFeaturedSeriesCache()
    databaseMocks.get.mockResolvedValue({ val: () => null })
  })

  it('normalizes catalogue records and rejects incomplete series', () => {
    expect(normalizeCatalogSeries(catalogRecord(1))).toEqual({
      imdbID: 'tt0000001',
      title: 'Catalog Series 1',
      year: '2020–2024',
      type: 'series',
      poster: 'https://images.example/catalog-1.jpg',
      plot: 'Plot 1',
      genres: ['Drama', 'Mystery'],
      imdbRating: '8.2',
    })
    expect(normalizeCatalogSeries({ ...catalogRecord(2), poster: 'N/A' })).toBeNull()
    expect(normalizeCatalogSeries({ ...catalogRecord(3), plot: 'N/A' })).toBeNull()
    expect(normalizeCatalogSeries({ ...catalogRecord(4), type: 'movie' })).toBeNull()
  })

  it('prefers five usable Firebase catalogue series without calling OMDb', async () => {
    databaseMocks.get.mockResolvedValue({
      val: () => Object.fromEntries(
        Array.from({ length: 5 }, (_, index) => [
          `tt${String(index + 1).padStart(7, '0')}`,
          catalogRecord(index + 1),
        ]),
      ),
    })

    const result = await loadFeaturedSeries(database)

    expect(result).toHaveLength(5)
    expect(databaseMocks.ref).toHaveBeenCalledWith(database, 'catalog')
    expect(omdbMocks.searchMovies).not.toHaveBeenCalled()
    expect(omdbMocks.getMovieDetails).not.toHaveBeenCalled()
  })

  it('fills a short catalogue from OMDb and deduplicates IMDb IDs', async () => {
    databaseMocks.get.mockResolvedValue({
      val: () => ({ tt0000001: catalogRecord(1) }),
    })
    let nextId = 1
    omdbMocks.searchMovies.mockImplementation((query: string) => {
      const movie = summary(`tt${String(nextId++).padStart(7, '0')}`, query)
      return Promise.resolve({ query, page: 1, movies: [movie], totalResults: 1 })
    })
    omdbMocks.getMovieDetails.mockImplementation((imdbID: string) => {
      const movie = summary(imdbID, `Fallback ${imdbID}`)
      return Promise.resolve(details(movie))
    })

    const result = await loadFeaturedSeries(database)

    expect(result).toHaveLength(5)
    expect(new Set(result.map((item) => item.imdbID)).size).toBe(5)
    expect(omdbMocks.searchMovies).toHaveBeenCalledTimes(5)
  })

  it('requests only the detail records needed to complete the carousel', async () => {
    databaseMocks.get.mockResolvedValue({
      val: () => Object.fromEntries(
        Array.from({ length: 4 }, (_, index) => [
          `tt${String(index + 1).padStart(7, '0')}`,
          catalogRecord(index + 1),
        ]),
      ),
    })
    let nextId = 20
    omdbMocks.searchMovies.mockImplementation((query: string) => {
      const movie = summary(`tt${String(nextId++).padStart(7, '0')}`, query)
      return Promise.resolve({ query, page: 1, movies: [movie], totalResults: 1 })
    })
    omdbMocks.getMovieDetails.mockImplementation((imdbID: string) =>
      Promise.resolve(details(summary(imdbID, `Fallback ${imdbID}`))),
    )

    const result = await loadFeaturedSeries(database)

    expect(result).toHaveLength(5)
    expect(omdbMocks.getMovieDetails).toHaveBeenCalledTimes(1)
  })

  it('keeps usable fallback titles when one details request fails', async () => {
    let nextId = 10
    omdbMocks.searchMovies.mockImplementation((query: string) => {
      const movie = summary(`tt${String(nextId++).padStart(7, '0')}`, query)
      return Promise.resolve({ query, page: 1, movies: [movie], totalResults: 1 })
    })
    omdbMocks.getMovieDetails.mockImplementation((imdbID: string) => {
      if (imdbID === 'tt0000010') return Promise.reject(new Error('Title failed'))
      return Promise.resolve(details(summary(imdbID, `Fallback ${imdbID}`)))
    })

    const result = await loadFeaturedSeries(null)

    expect(result).toHaveLength(4)
    expect(result.some((item) => item.imdbID === 'tt0000010')).toBe(false)
  })

  it('rejects when every fallback request fails so the UI can show an error', async () => {
    omdbMocks.searchMovies.mockRejectedValue(new Error('OMDb is unavailable'))

    await expect(loadFeaturedSeries(null)).rejects.toThrow('OMDb is unavailable')
  })
})
