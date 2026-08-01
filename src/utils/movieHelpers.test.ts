import { describe, expect, it } from 'vitest'
import type { MovieSummary } from '../types/movie'
import {
  deduplicateMovies,
  formatMovieType,
  hasUsablePoster,
  normalizeMovieDetails,
  normalizeMovieSummary,
  normalizeOptionalText,
} from './movieHelpers'

describe('movie helpers', () => {
  it('normalizes a search result and removes an unavailable poster', () => {
    expect(
      normalizeMovieSummary({
        imdbID: 'tt0372784',
        Title: ' Batman Begins ',
        Year: '2005',
        Type: 'movie',
        Poster: 'N/A',
      }),
    ).toEqual({
      imdbID: 'tt0372784',
      title: 'Batman Begins',
      year: '2005',
      type: 'movie',
      poster: null,
    })
  })

  it('rejects summaries without a usable title or IMDb ID', () => {
    expect(normalizeMovieSummary({ Title: 'No ID' })).toBeNull()
    expect(
      normalizeMovieSummary({ imdbID: 'not-an-id', Title: 'Invalid ID' }),
    ).toBeNull()
    expect(
      normalizeMovieSummary({ imdbID: 'tt1234567', Title: 'N/A' }),
    ).toBeNull()
  })

  it('normalizes detailed fields and removes N/A values', () => {
    const details = normalizeMovieDetails({
      imdbID: 'tt0372784',
      Title: 'Batman Begins',
      Year: '2005',
      Type: 'movie',
      Poster: 'https://images.example/batman.jpg',
      Rated: 'PG-13',
      Runtime: '140 min',
      Genre: 'Action, Crime, Drama',
      Director: 'Christopher Nolan',
      Writer: 'Bob Kane, David S. Goyer',
      Actors: 'Christian Bale, Michael Caine',
      Plot: 'A hero finds his purpose.',
      Language: 'English, Mandarin',
      Country: 'United States, United Kingdom',
      Awards: 'N/A',
      imdbRating: '8.2',
      Released: '15 Jun 2005',
      totalSeasons: 'N/A',
      Ratings: [
        { Source: 'Internet Movie Database', Value: '8.2/10' },
        { Source: 'N/A', Value: '90%' },
      ],
    })

    expect(details).toMatchObject({
      genres: ['Action', 'Crime', 'Drama'],
      directors: ['Christopher Nolan'],
      writers: ['Bob Kane', 'David S. Goyer'],
      actors: ['Christian Bale', 'Michael Caine'],
      languages: ['English', 'Mandarin'],
      countries: ['United States', 'United Kingdom'],
      awards: null,
      imdbRating: '8.2',
      totalSeasons: null,
      ratings: [{ source: 'Internet Movie Database', value: '8.2/10' }],
    })
  })

  it('deduplicates titles by IMDb ID while preserving first-seen order', () => {
    const first: MovieSummary = {
      imdbID: 'tt1234567',
      title: 'First',
      year: '2020',
      type: 'movie',
      poster: null,
    }
    const duplicate: MovieSummary = { ...first, title: 'Duplicate' }
    const second: MovieSummary = {
      imdbID: 'tt7654321',
      title: 'Second',
      year: null,
      type: 'series',
      poster: 'https://images.example/second.jpg',
    }

    expect(deduplicateMovies([first, duplicate, second])).toEqual([
      first,
      second,
    ])
  })

  it('recognizes missing text and usable artwork', () => {
    expect(normalizeOptionalText('  n/A ')).toBeNull()
    expect(hasUsablePoster({ poster: null })).toBe(false)
    expect(hasUsablePoster({ poster: 'https://images.example/poster.jpg' })).toBe(
      true,
    )
    expect(hasUsablePoster({ poster: 'javascript:alert(1)' })).toBe(false)
  })

  it('formats every supported content type without mislabelling it', () => {
    expect(formatMovieType('movie')).toBe('Movie')
    expect(formatMovieType('series')).toBe('Series')
    expect(formatMovieType('episode')).toBe('Episode')
    expect(formatMovieType('game')).toBe('Game')
    expect(formatMovieType('unknown')).toBe('Title')
  })
})
