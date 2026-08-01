import { render, screen } from '@testing-library/react'
import type { User } from 'firebase/auth'
import {
  MemoryRouter,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AuthContextValue } from '../../types/auth'
import { useAuth } from '../../hooks/useAuth'
import { ProtectedRoute } from './ProtectedRoute'

vi.mock('../../hooks/useAuth', () => ({
  useAuth: vi.fn(),
}))

const authenticatedUser = { uid: 'viewer-1' } as User

function setAuthState(overrides: Partial<AuthContextValue> = {}) {
  vi.mocked(useAuth).mockReturnValue({
    user: null,
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
    ...overrides,
  })
}

function AuthenticationDestination() {
  const location = useLocation()
  const state = location.state as
    | { from?: string; message?: string }
    | null

  return (
    <main>
      <h1>Authentication</h1>
      <p data-testid="return-destination">{state?.from}</p>
      <p>{state?.message}</p>
    </main>
  )
}

function renderProtectedRoute(initialEntry = '/favourites') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route
          path="/favourites"
          element={
            <ProtectedRoute message="Sign in to open your favourites.">
              <h1>Your favourites</h1>
            </ProtectedRoute>
          }
        />
        <Route path="/auth" element={<AuthenticationDestination />} />
      </Routes>
    </MemoryRouter>,
  )
}

function renderWatchlistRoute(initialEntry = '/watchlist') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route
          path="/watchlist"
          element={
            <ProtectedRoute message="Sign in to open your watchlist.">
              <h1>Your watchlist</h1>
            </ProtectedRoute>
          }
        />
        <Route path="/auth" element={<AuthenticationDestination />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('ProtectedRoute', () => {
  beforeEach(() => setAuthState())

  it('redirects a logged-out user and preserves the full destination', () => {
    renderProtectedRoute('/favourites?sort=year')

    expect(
      screen.getByRole('heading', { name: /authentication/i }),
    ).toBeInTheDocument()
    expect(screen.getByTestId('return-destination')).toHaveTextContent(
      '/favourites?sort=year',
    )
    expect(
      screen.getByText('Sign in to open your favourites.'),
    ).toBeInTheDocument()
    expect(screen.queryByText('Your favourites')).not.toBeInTheDocument()
  })

  it('renders protected content for an authenticated user', () => {
    setAuthState({ user: authenticatedUser })

    renderProtectedRoute()

    expect(
      screen.getByRole('heading', { name: /your favourites/i }),
    ).toBeInTheDocument()
    expect(screen.queryByText('Authentication')).not.toBeInTheDocument()
  })

  it('protects the watchlist route and preserves its intended destination', () => {
    renderWatchlistRoute('/watchlist?order=recent')

    expect(screen.getByTestId('return-destination')).toHaveTextContent(
      '/watchlist?order=recent',
    )
    expect(screen.getByText('Sign in to open your watchlist.')).toBeInTheDocument()
    expect(screen.queryByText('Your watchlist')).not.toBeInTheDocument()
  })

  it('shows a status message while authentication is loading', () => {
    setAuthState({ loading: true })

    renderProtectedRoute()

    expect(screen.getByRole('status')).toHaveTextContent(
      /checking your account/i,
    )
    expect(screen.queryByText('Your favourites')).not.toBeInTheDocument()
  })
})
