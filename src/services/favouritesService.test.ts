import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Database } from 'firebase/database'
import type { MovieSummary } from '../types/movie'

const databaseMocks = vi.hoisted(() => ({
  onValue: vi.fn(),
  ref: vi.fn((_database: unknown, path: string) => path),
  remove: vi.fn(() => Promise.resolve()),
  set: vi.fn(() => Promise.resolve()),
}))

vi.mock('firebase/database', () => databaseMocks)

import {
  addFavouriteForUser,
  AuthenticationRequiredError,
  normalizeFavouriteSnapshot,
  removeFavouriteForUser,
} from './favouritesService'

const database = {} as Database
const movie: MovieSummary = {
  imdbID: 'tt0133093',
  title: 'The Matrix',
  year: '1999',
  type: 'movie',
  poster: 'https://example.com/matrix.jpg',
}

describe('favouritesService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('adds a favourite under the active user and IMDb ID', async () => {
    await addFavouriteForUser(database, 'user-123', movie)

    expect(databaseMocks.ref).toHaveBeenCalledWith(
      database,
      'users/user-123/favourites/tt0133093',
    )
    expect(databaseMocks.set).toHaveBeenCalledWith(
      'users/user-123/favourites/tt0133093',
      {
        imdbID: 'tt0133093',
        Title: 'The Matrix',
        Year: '1999',
        Type: 'movie',
        Poster: 'https://example.com/matrix.jpg',
      },
    )
  })

  it('uses the same database key for duplicate adds, making them idempotent', async () => {
    await addFavouriteForUser(database, 'user-123', movie)
    await addFavouriteForUser(database, 'user-123', movie)

    expect(databaseMocks.ref).toHaveBeenNthCalledWith(
      1,
      database,
      'users/user-123/favourites/tt0133093',
    )
    expect(databaseMocks.ref).toHaveBeenNthCalledWith(
      2,
      database,
      'users/user-123/favourites/tt0133093',
    )
    expect(databaseMocks.set).toHaveBeenCalledTimes(2)
  })

  it('removes a favourite from the active user only', async () => {
    await removeFavouriteForUser(database, 'user-123', movie.imdbID)

    expect(databaseMocks.remove).toHaveBeenCalledWith(
      'users/user-123/favourites/tt0133093',
    )
  })

  it.each([
    ['add', () => addFavouriteForUser(null, null, movie)],
    ['remove', () => removeFavouriteForUser(null, undefined, movie.imdbID)],
  ])('rejects an unauthenticated %s operation', async (_name, operation) => {
    await expect(operation()).rejects.toBeInstanceOf(AuthenticationRequiredError)
    expect(databaseMocks.set).not.toHaveBeenCalled()
    expect(databaseMocks.remove).not.toHaveBeenCalled()
  })

  it('normalizes saved records and restores missing OMDb values', () => {
    expect(
      normalizeFavouriteSnapshot({
        tt0133093: {
          imdbID: 'tt0133093',
          Title: 'The Matrix',
          Year: 'N/A',
          Type: 'movie',
          Poster: 'N/A',
        },
        invalid: { Title: '' },
      }),
    ).toEqual({
      tt0133093: {
        imdbID: 'tt0133093',
        title: 'The Matrix',
        year: null,
        type: 'movie',
        poster: null,
      },
    })
  })
})
