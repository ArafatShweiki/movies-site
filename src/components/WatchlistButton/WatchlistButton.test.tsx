import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { User } from 'firebase/auth'
import {
  MemoryRouter,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { WatchlistContextValue } from '../../context/watchlistContextValue'
import { useAuth } from '../../hooks/useAuth'
import { useWatchlist } from '../../hooks/useWatchlist'
import type { AuthContextValue } from '../../types/auth'
import type { MovieSummary } from '../../types/movie'
import { WatchlistButton } from './WatchlistButton'

vi.mock('../../hooks/useAuth', () => ({
  useAuth: vi.fn(),
}))

vi.mock('../../hooks/useWatchlist', () => ({
  useWatchlist: vi.fn(),
}))

const movie: MovieSummary = {
  imdbID: 'tt0133093',
  title: 'The Matrix',
  year: '1999',
  type: 'movie',
  poster: null,
}

function authValue(user: User | null): AuthContextValue {
  return {
    user,
    loading: false,
    configurationError: null,
    profile: null,
    profileLoading: false,
    profileError: null,
    login: vi.fn(),
    register: vi.fn(),
    loginWithGoogle: vi.fn(),
    saveProfile: vi.fn(),
    logout: vi.fn(),
  }
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

function AuthDestination() {
  const location = useLocation()
  const state = location.state as { from?: string; message?: string } | null

  return (
    <main>
      <h1>Authentication</h1>
      <p data-testid="return-path">{state?.from}</p>
      <p>{state?.message}</p>
    </main>
  )
}

function renderButton(initialEntry = `/movie/${movie.imdbID}`) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route
          path="/movie/:imdbID"
          element={<WatchlistButton movie={movie} showLabel />}
        />
        <Route path="/auth" element={<AuthDestination />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('WatchlistButton', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useAuth).mockReturnValue(authValue(null))
    vi.mocked(useWatchlist).mockReturnValue(watchlistValue())
  })

  it('redirects logged-out users and preserves path, query, and hash', async () => {
    const user = userEvent.setup()
    const toggleWatchlist = vi.fn(() => Promise.resolve())
    vi.mocked(useWatchlist).mockReturnValue(watchlistValue({ toggleWatchlist }))

    renderButton(`/movie/${movie.imdbID}?from=series#cast`)
    await user.click(
      screen.getByRole('button', { name: /add to watchlist: the matrix/i }),
    )

    expect(screen.getByRole('heading', { name: /authentication/i })).toBeInTheDocument()
    expect(screen.getByTestId('return-path')).toHaveTextContent(
      `/movie/${movie.imdbID}?from=series#cast`,
    )
    expect(screen.getByText(/sign in to add titles to your watchlist/i)).toBeInTheDocument()
    expect(toggleWatchlist).not.toHaveBeenCalled()
  })

  it('adds a title and announces the completed action', async () => {
    const user = userEvent.setup()
    const toggleWatchlist = vi.fn(() => Promise.resolve())
    vi.mocked(useAuth).mockReturnValue(authValue({ uid: 'viewer-1' } as User))
    vi.mocked(useWatchlist).mockReturnValue(watchlistValue({ toggleWatchlist }))

    renderButton()
    const button = screen.getByRole('button', {
      name: /add to watchlist: the matrix/i,
    })

    expect(button).toHaveAttribute('aria-pressed', 'false')
    await user.click(button)

    expect(toggleWatchlist).toHaveBeenCalledOnce()
    expect(toggleWatchlist).toHaveBeenCalledWith(movie)
    expect(screen.getByText('The Matrix added to your watchlist.')).toBeInTheDocument()
  })

  it('removes a saved title with an accessible pressed state', async () => {
    const user = userEvent.setup()
    const toggleWatchlist = vi.fn(() => Promise.resolve())
    vi.mocked(useAuth).mockReturnValue(authValue({ uid: 'viewer-1' } as User))
    vi.mocked(useWatchlist).mockReturnValue(
      watchlistValue({ isWatchlisted: () => true, toggleWatchlist }),
    )

    renderButton()
    const button = screen.getByRole('button', {
      name: /remove from watchlist: the matrix/i,
    })

    expect(button).toHaveAttribute('aria-pressed', 'true')
    await user.click(button)
    expect(screen.getByText('The Matrix removed from your watchlist.')).toBeInTheDocument()
  })

  it('disables duplicate input while the title is updating', () => {
    vi.mocked(useAuth).mockReturnValue(authValue({ uid: 'viewer-1' } as User))
    vi.mocked(useWatchlist).mockReturnValue(
      watchlistValue({ pendingIds: new Set([movie.imdbID]) }),
    )

    renderButton()

    const button = screen.getByRole('button', {
      name: /updating watchlist: the matrix/i,
    })
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-busy', 'true')
    expect(screen.getByText('Updating…')).toBeInTheDocument()
  })

  it('announces an update failure without changing routes', async () => {
    const user = userEvent.setup()
    vi.mocked(useAuth).mockReturnValue(authValue({ uid: 'viewer-1' } as User))
    vi.mocked(useWatchlist).mockReturnValue(
      watchlistValue({
        toggleWatchlist: vi.fn(() => Promise.reject(new Error('offline'))),
      }),
    )

    renderButton()
    await user.click(
      screen.getByRole('button', { name: /add to watchlist: the matrix/i }),
    )

    expect(
      screen.getByText('Could not update The Matrix in your watchlist.'),
    ).toBeInTheDocument()
  })
})
