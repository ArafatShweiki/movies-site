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
  addWatchlistItemForUser,
  InvalidWatchlistItemError,
  normalizeWatchlistSnapshot,
  removeWatchlistItemForUser,
  subscribeToWatchlist,
  WatchlistAuthenticationRequiredError,
} from './watchlistService'

const database = {} as Database
const movie: MovieSummary = {
  imdbID: 'tt0133093',
  title: 'The Matrix',
  year: '1999',
  type: 'movie',
  poster: 'https://example.com/matrix.jpg',
}

describe('watchlistService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('adds a timestamped item under the active user and IMDb ID', async () => {
    await addWatchlistItemForUser(database, 'user-123', movie, 1_700_000_000_000)

    expect(databaseMocks.ref).toHaveBeenCalledWith(
      database,
      'users/user-123/watchlist/tt0133093',
    )
    expect(databaseMocks.set).toHaveBeenCalledWith(
      'users/user-123/watchlist/tt0133093',
      {
        imdbID: 'tt0133093',
        title: 'The Matrix',
        year: '1999',
        type: 'movie',
        poster: 'https://example.com/matrix.jpg',
        addedAt: 1_700_000_000_000,
      },
    )
  })

  it('uses one canonical database key for repeated adds', async () => {
    const uppercaseMovie = { ...movie, imdbID: 'TT0133093' }

    await addWatchlistItemForUser(database, 'user-123', movie, 1)
    await addWatchlistItemForUser(database, 'user-123', uppercaseMovie, 2)

    expect(databaseMocks.ref).toHaveBeenNthCalledWith(
      1,
      database,
      'users/user-123/watchlist/tt0133093',
    )
    expect(databaseMocks.ref).toHaveBeenNthCalledWith(
      2,
      database,
      'users/user-123/watchlist/tt0133093',
    )
  })

  it('removes an item from the watchlist without touching favourites', async () => {
    await removeWatchlistItemForUser(database, 'user-123', movie.imdbID)

    expect(databaseMocks.remove).toHaveBeenCalledWith(
      'users/user-123/watchlist/tt0133093',
    )
    expect(databaseMocks.ref).not.toHaveBeenCalledWith(
      database,
      expect.stringContaining('/favourites/'),
    )
  })

  it('subscribes only to the active user watchlist and returns cleanup', () => {
    const unsubscribe = vi.fn()
    const handleValue = vi.fn()
    const handleError = vi.fn()
    databaseMocks.onValue.mockReturnValue(unsubscribe)

    const cleanup = subscribeToWatchlist(
      database,
      'user-123',
      handleValue,
      handleError,
    )

    expect(databaseMocks.ref).toHaveBeenCalledWith(
      database,
      'users/user-123/watchlist',
    )
    expect(databaseMocks.onValue).toHaveBeenCalledWith(
      'users/user-123/watchlist',
      expect.any(Function),
      handleError,
    )
    expect(cleanup).toBe(unsubscribe)
  })

  it.each([
    ['add', () => addWatchlistItemForUser(null, null, movie)],
    ['remove', () => removeWatchlistItemForUser(null, undefined, movie.imdbID)],
  ])('rejects an unauthenticated %s operation', async (_name, operation) => {
    await expect(operation()).rejects.toBeInstanceOf(
      WatchlistAuthenticationRequiredError,
    )
    expect(databaseMocks.set).not.toHaveBeenCalled()
    expect(databaseMocks.remove).not.toHaveBeenCalled()
  })

  it('rejects a malformed IMDb ID before constructing a database path', async () => {
    await expect(
      addWatchlistItemForUser(
        database,
        'user-123',
        { ...movie, imdbID: '../favourites/tt0133093' },
        1,
      ),
    ).rejects.toBeInstanceOf(InvalidWatchlistItemError)

    expect(databaseMocks.ref).not.toHaveBeenCalled()
  })

  it('normalizes saved records and ignores malformed entries', () => {
    expect(
      normalizeWatchlistSnapshot({
        tt0133093: {
          imdbID: 'TT0133093',
          title: ' The Matrix ',
          year: 'N/A',
          type: 'movie',
          poster: 'N/A',
          addedAt: 42,
        },
        invalid: { title: '' },
      }),
    ).toEqual({
      tt0133093: {
        imdbID: 'tt0133093',
        title: 'The Matrix',
        year: '',
        type: 'movie',
        poster: '',
        addedAt: 42,
      },
    })
  })
})
