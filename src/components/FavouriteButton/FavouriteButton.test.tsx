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
import type { FavouritesContextValue } from '../../context/favouritesContextValue'
import { useAuth } from '../../hooks/useAuth'
import { useFavourites } from '../../hooks/useFavourites'
import type { MovieSummary } from '../../types/movie'
import { FavouriteButton } from './FavouriteButton'

vi.mock('../../hooks/useAuth', () => ({
  useAuth: vi.fn(),
}))

vi.mock('../../hooks/useFavourites', () => ({
  useFavourites: vi.fn(),
}))

const movie: MovieSummary = {
  imdbID: 'tt0133093',
  title: 'The Matrix',
  year: '1999',
  type: 'movie',
  poster: null,
}

function authValue(user: User | null) {
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

function favouritesValue(
  overrides: Partial<FavouritesContextValue> = {},
): FavouritesContextValue {
  return {
    favourites: [],
    loading: false,
    isFavourite: () => false,
    toggleFavourite: vi.fn(() => Promise.resolve()),
    addFavourite: vi.fn(() => Promise.resolve()),
    removeFavourite: vi.fn(() => Promise.resolve()),
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
          element={<FavouriteButton movie={movie} showLabel />}
        />
        <Route path="/auth" element={<AuthDestination />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('FavouriteButton', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useAuth).mockReturnValue(authValue(null))
    vi.mocked(useFavourites).mockReturnValue(favouritesValue())
  })

  it('sends a logged-out user to authentication and preserves the movie URL', async () => {
    const user = userEvent.setup()
    const toggleFavourite = vi.fn(() => Promise.resolve())
    vi.mocked(useFavourites).mockReturnValue(
      favouritesValue({ toggleFavourite }),
    )

    renderButton(`/movie/${movie.imdbID}?from=featured`)
    await user.click(
      screen.getByRole('button', { name: /add to favourites: the matrix/i }),
    )

    expect(
      screen.getByRole('heading', { name: /authentication/i }),
    ).toBeInTheDocument()
    expect(screen.getByTestId('return-path')).toHaveTextContent(
      `/movie/${movie.imdbID}?from=featured`,
    )
    expect(
      screen.getByText(/sign in to save titles to your favourites/i),
    ).toBeInTheDocument()
    expect(toggleFavourite).not.toHaveBeenCalled()
  })

  it('toggles a favourite for an authenticated user and announces success', async () => {
    const user = userEvent.setup()
    const toggleFavourite = vi.fn(() => Promise.resolve())
    vi.mocked(useAuth).mockReturnValue(authValue({ uid: 'viewer-1' } as User))
    vi.mocked(useFavourites).mockReturnValue(
      favouritesValue({ toggleFavourite }),
    )

    renderButton()
    const button = screen.getByRole('button', {
      name: /add to favourites: the matrix/i,
    })
    expect(button).toHaveAttribute('aria-pressed', 'false')

    await user.click(button)

    expect(toggleFavourite).toHaveBeenCalledOnce()
    expect(toggleFavourite).toHaveBeenCalledWith(movie)
    expect(screen.getByText('The Matrix saved.')).toBeInTheDocument()
  })

  it('disables duplicate input while this title is being updated', () => {
    vi.mocked(useAuth).mockReturnValue(authValue({ uid: 'viewer-1' } as User))
    vi.mocked(useFavourites).mockReturnValue(
      favouritesValue({ pendingIds: new Set([movie.imdbID]) }),
    )

    renderButton()

    expect(
      screen.getByRole('button', { name: /updating favourite: the matrix/i }),
    ).toBeDisabled()
    expect(screen.getByText(/updating/i)).toBeInTheDocument()
  })
})
