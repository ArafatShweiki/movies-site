import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { WatchlistContextValue } from '../../context/watchlistContextValue'
import { useWatchlist } from '../../hooks/useWatchlist'
import type { MovieSummary } from '../../types/movie'
import type { WatchlistItem } from '../../types/watchlist'
import WatchlistPage from './WatchlistPage'

vi.mock('../../hooks/useWatchlist', () => ({
  useWatchlist: vi.fn(),
}))

vi.mock('../../components/WatchlistButton/WatchlistButton', () => ({
  WatchlistButton: ({ movie }: { movie: MovieSummary }) => (
    <button type="button" aria-label={`Remove from watchlist: ${movie.title}`}>
      Remove
    </button>
  ),
}))

vi.mock('../../components/FavouriteButton/FavouriteButton', () => ({
  FavouriteButton: ({ movie }: { movie: MovieSummary }) => (
    <button type="button" aria-label={`Add to favourites: ${movie.title}`}>
      Favourite
    </button>
  ),
}))

const item: WatchlistItem = {
  imdbID: 'tt0133093',
  title: 'The Matrix',
  year: '1999',
  type: 'movie',
  poster: '',
  addedAt: 100,
}

function watchlistValue(
  overrides: Partial<WatchlistContextValue> = {},
): WatchlistContextValue {
  return {
    watchlist: [],
    loading: false,
    isWatchlisted: () => false,
    toggleWatchlist: vi.fn(() => Promise.resolve()),
    addToWatchlist: vi.fn(() => Promise.resolve()),
    removeFromWatchlist: vi.fn(() => Promise.resolve()),
    pendingIds: new Set<string>(),
    error: null,
    clearError: vi.fn(),
    ...overrides,
  }
}

function renderPage() {
  return render(
    <MemoryRouter>
      <WatchlistPage />
    </MemoryRouter>,
  )
}

describe('WatchlistPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useWatchlist).mockReturnValue(watchlistValue())
  })

  it('shows an accessible loading state', () => {
    vi.mocked(useWatchlist).mockReturnValue(watchlistValue({ loading: true }))

    renderPage()

    expect(screen.getByRole('heading', { level: 1, name: 'Watchlist' })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Loading your watchlist')
  })

  it('offers discovery from an empty watchlist', () => {
    renderPage()

    expect(screen.getByRole('heading', { name: /your watchlist is ready/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /explore the catalogue/i })).toHaveAttribute(
      'href',
      '/',
    )
  })

  it('renders saved titles with details and removal controls', () => {
    vi.mocked(useWatchlist).mockReturnValue(
      watchlistValue({ watchlist: [item] }),
    )

    renderPage()

    expect(
      screen.getByRole('region', { name: /movies and series in your watchlist/i }),
    ).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 3, name: item.title })).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /the matrix/i })[0]).toHaveAttribute(
      'href',
      `/movie/${item.imdbID}`,
    )
    expect(
      screen.getByRole('button', { name: /remove from watchlist: the matrix/i }),
    ).toBeInTheDocument()
  })

  it('announces and dismisses a watchlist error', async () => {
    const user = userEvent.setup()
    const clearError = vi.fn()
    vi.mocked(useWatchlist).mockReturnValue(
      watchlistValue({ error: 'The watchlist could not be loaded.', clearError }),
    )

    renderPage()

    expect(screen.getByRole('alert')).toHaveTextContent(
      'The watchlist could not be loaded.',
    )
    await user.click(screen.getByRole('button', { name: /dismiss/i }))
    expect(clearError).toHaveBeenCalledOnce()
  })
})
