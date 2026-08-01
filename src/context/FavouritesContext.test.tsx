import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { MovieSummary } from '../types/movie'
import type { FavouriteMap } from '../services/favouritesService'

const stateMocks = vi.hoisted(() => ({
  addFavouriteForUser: vi.fn(() => Promise.resolve()),
  removeFavouriteForUser: vi.fn(() => Promise.resolve()),
  subscribeToFavourites: vi.fn(),
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

vi.mock('../services/favouritesService', () => ({
  addFavouriteForUser: stateMocks.addFavouriteForUser,
  getFavouriteErrorMessage: () => 'The favourite update failed.',
  removeFavouriteForUser: stateMocks.removeFavouriteForUser,
  subscribeToFavourites: stateMocks.subscribeToFavourites,
}))

import { FavouritesProvider } from './FavouritesContext'
import { useFavourites } from '../hooks/useFavourites'

const movie: MovieSummary = {
  imdbID: 'tt0133093',
  title: 'The Matrix',
  year: '1999',
  type: 'movie',
  poster: null,
}

function FavouritesConsumer() {
  const {
    favourites,
    loading,
    toggleFavourite,
    isFavourite,
    pendingIds,
  } = useFavourites()

  return (
    <div>
      <span>{loading ? 'Loading' : 'Ready'}</span>
      <span>{favourites.map((favourite) => favourite.title).join(', ')}</span>
      <span>{isFavourite(movie.imdbID) ? 'Saved' : 'Not saved'}</span>
      <span>{pendingIds.has(movie.imdbID) ? 'Updating' : 'Idle'}</span>
      <button type="button" onClick={() => void toggleFavourite(movie)}>
        Toggle
      </button>
    </div>
  )
}

describe('FavouritesProvider', () => {
  let publishFavourites: ((favourites: FavouriteMap) => void) | undefined

  beforeEach(() => {
    vi.clearAllMocks()
    publishFavourites = undefined
    stateMocks.subscribeToFavourites.mockImplementation(
      (
        _database: unknown,
        _userId: string,
        handleValue: (favourites: FavouriteMap) => void,
      ) => {
        publishFavourites = handleValue
        return stateMocks.unsubscribe
      },
    )
  })

  it('subscribes once for the active UID, publishes state, and cleans up', () => {
    const view = render(
      <FavouritesProvider>
        <FavouritesConsumer />
      </FavouritesProvider>,
    )

    expect(stateMocks.subscribeToFavourites).toHaveBeenCalledTimes(1)
    expect(stateMocks.subscribeToFavourites).toHaveBeenCalledWith(
      { name: 'test-database' },
      'user-123',
      expect.any(Function),
      expect.any(Function),
    )
    expect(screen.getByText('Loading')).toBeInTheDocument()

    act(() => {
      publishFavourites?.({ [movie.imdbID]: movie })
    })

    expect(screen.getByText('Ready')).toBeInTheDocument()
    expect(screen.getByText('The Matrix')).toBeInTheDocument()
    expect(screen.getByText('Saved')).toBeInTheDocument()

    view.unmount()
    expect(stateMocks.unsubscribe).toHaveBeenCalledOnce()
  })

  it('adds and removes through the same toggle state', async () => {
    const user = userEvent.setup()
    render(
      <FavouritesProvider>
        <FavouritesConsumer />
      </FavouritesProvider>,
    )

    await user.click(screen.getByRole('button', { name: 'Toggle' }))
    expect(stateMocks.addFavouriteForUser).toHaveBeenCalledWith(
      { name: 'test-database' },
      'user-123',
      movie,
    )

    act(() => {
      publishFavourites?.({ [movie.imdbID]: movie })
    })

    await user.click(screen.getByRole('button', { name: 'Toggle' }))
    expect(stateMocks.removeFavouriteForUser).toHaveBeenCalledWith(
      { name: 'test-database' },
      'user-123',
      movie.imdbID,
    )
  })
})

