import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { MovieSummary } from '../types/movie'
import type { WatchlistItem } from '../types/watchlist'
import type { WatchlistMap } from '../services/watchlistService'

const stateMocks = vi.hoisted(() => ({
  addWatchlistItemForUser: vi.fn(() => Promise.resolve()),
  removeWatchlistItemForUser: vi.fn(() => Promise.resolve()),
  subscribeToWatchlist: vi.fn(),
  unsubscribe: vi.fn(),
  useAuth: vi.fn(() => ({
    user: { uid: 'user-123' },
    loading: false,
  })),
}))

vi.mock('../services/firebase', () => ({
  firebaseDatabase: { name: 'test-database' },
}))

vi.mock('../hooks/useAuth', () => ({
  useAuth: stateMocks.useAuth,
}))

vi.mock('../services/watchlistService', () => ({
  addWatchlistItemForUser: stateMocks.addWatchlistItemForUser,
  getWatchlistErrorMessage: () => 'The watchlist update failed.',
  removeWatchlistItemForUser: stateMocks.removeWatchlistItemForUser,
  subscribeToWatchlist: stateMocks.subscribeToWatchlist,
}))

import { WatchlistProvider } from './WatchlistContext'
import { useWatchlist } from '../hooks/useWatchlist'

const movie: MovieSummary = {
  imdbID: 'tt0133093',
  title: 'The Matrix',
  year: '1999',
  type: 'movie',
  poster: null,
}

const watchlistItem: WatchlistItem = {
  imdbID: movie.imdbID,
  title: movie.title,
  year: movie.year ?? '',
  type: movie.type,
  poster: movie.poster ?? '',
  addedAt: 100,
}

function WatchlistConsumer() {
  const {
    watchlist,
    loading,
    toggleWatchlist,
    isWatchlisted,
    pendingIds,
    error,
  } = useWatchlist()

  return (
    <div>
      <span>{loading ? 'Loading' : 'Ready'}</span>
      <span>{watchlist.map((item) => item.title).join(', ')}</span>
      <span>{isWatchlisted(movie.imdbID) ? 'Watchlisted' : 'Not watchlisted'}</span>
      <span>{pendingIds.has(movie.imdbID) ? 'Updating' : 'Idle'}</span>
      {error && <span>{error}</span>}
      <button type="button" onClick={() => void toggleWatchlist(movie)}>
        Toggle
      </button>
    </div>
  )
}

describe('WatchlistProvider', () => {
  let publishWatchlist: ((watchlist: WatchlistMap) => void) | undefined

  beforeEach(() => {
    vi.clearAllMocks()
    publishWatchlist = undefined
    stateMocks.subscribeToWatchlist.mockImplementation(
      (
        _database: unknown,
        _userId: string,
        handleValue: (watchlist: WatchlistMap) => void,
      ) => {
        publishWatchlist = handleValue
        return stateMocks.unsubscribe
      },
    )
  })

  it('subscribes only to the active UID, publishes state, and cleans up', () => {
    const view = render(
      <WatchlistProvider>
        <WatchlistConsumer />
      </WatchlistProvider>,
    )

    expect(stateMocks.subscribeToWatchlist).toHaveBeenCalledWith(
      { name: 'test-database' },
      'user-123',
      expect.any(Function),
      expect.any(Function),
    )
    expect(screen.getByText('Loading')).toBeInTheDocument()

    act(() => {
      publishWatchlist?.({ [movie.imdbID]: watchlistItem })
    })

    expect(screen.getByText('Ready')).toBeInTheDocument()
    expect(screen.getByText('The Matrix')).toBeInTheDocument()
    expect(screen.getByText('Watchlisted')).toBeInTheDocument()

    view.unmount()
    expect(stateMocks.unsubscribe).toHaveBeenCalledOnce()
  })

  it('adds and removes independently through watchlist state', async () => {
    const user = userEvent.setup()
    render(
      <WatchlistProvider>
        <WatchlistConsumer />
      </WatchlistProvider>,
    )

    await user.click(screen.getByRole('button', { name: 'Toggle' }))
    expect(stateMocks.addWatchlistItemForUser).toHaveBeenCalledWith(
      { name: 'test-database' },
      'user-123',
      movie,
    )

    act(() => {
      publishWatchlist?.({ [movie.imdbID]: watchlistItem })
    })

    await user.click(screen.getByRole('button', { name: 'Toggle' }))
    expect(stateMocks.removeWatchlistItemForUser).toHaveBeenCalledWith(
      { name: 'test-database' },
      'user-123',
      movie.imdbID,
    )
  })

  it('orders the newest watchlist item first', () => {
    render(
      <WatchlistProvider>
        <WatchlistConsumer />
      </WatchlistProvider>,
    )

    act(() => {
      publishWatchlist?.({
        tt0000001: {
          ...watchlistItem,
          imdbID: 'tt0000001',
          title: 'Older title',
          addedAt: 10,
        },
        tt0000002: {
          ...watchlistItem,
          imdbID: 'tt0000002',
          title: 'Newer title',
          addedAt: 20,
        },
      })
    })

    expect(screen.getByText('Newer title, Older title')).toBeInTheDocument()
  })
})
