import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { User } from 'firebase/auth'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuth } from '../../hooks/useAuth'
import type { AuthContextValue } from '../../types/auth'
import { Navbar } from './Navbar'

vi.mock('../../hooks/useAuth', () => ({
  useAuth: vi.fn(),
}))

function authValue(overrides: Partial<AuthContextValue> = {}): AuthContextValue {
  return {
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
  }
}

function signedInUser(overrides: Partial<User> = {}): User {
  return {
    uid: 'viewer-1',
    email: 'ada@example.com',
    displayName: 'Auth Fallback',
    photoURL: null,
    ...overrides,
  } as User
}

function renderNavbar() {
  return render(
    <MemoryRouter>
      <Navbar />
    </MemoryRouter>,
  )
}

function AuthDestination() {
  const location = useLocation()
  const state = location.state as { from?: string } | null
  return <p data-testid="auth-return-path">{state?.from}</p>
}

describe('Navbar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useAuth).mockReturnValue(authValue())
  })

  it('shows the saved first name instead of the account email', () => {
    vi.mocked(useAuth).mockReturnValue(authValue({
      user: signedInUser(),
      profile: {
        firstName: 'Ada',
        lastName: 'Lovelace',
        region: 'United Kingdom',
        phoneNumber: '',
        updatedAt: 100,
      },
    }))

    renderNavbar()

    expect(screen.getByRole('button', { name: /ada/i })).toBeInTheDocument()
    expect(screen.queryByText('ada@example.com')).not.toBeInTheDocument()
    expect(screen.getByText('AL')).toBeInTheDocument()
  })

  it('uses the Google photo when one is available', () => {
    vi.mocked(useAuth).mockReturnValue(authValue({
      user: signedInUser({
        displayName: 'Grace Hopper',
        photoURL: 'https://images.example/grace.jpg',
      }),
    }))

    renderNavbar()

    expect(screen.getByRole('img', { name: /grace's profile/i })).toHaveAttribute(
      'src',
      'https://images.example/grace.jpg',
    )
  })

  it('falls back to display-name initials, then a generic account label', () => {
    vi.mocked(useAuth).mockReturnValue(authValue({
      user: signedInUser({ displayName: 'Katherine Johnson' }),
    }))

    const view = renderNavbar()
    expect(screen.getByRole('button', { name: /katherine/i })).toBeInTheDocument()
    expect(screen.getByText('KJ')).toBeInTheDocument()

    vi.mocked(useAuth).mockReturnValue(authValue({
      user: signedInUser({ displayName: null }),
    }))
    view.rerender(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>,
    )

    expect(screen.getByRole('button', { name: /account/i })).toBeInTheDocument()
  })

  it('moves focus into the account menu and returns it on Escape', async () => {
    const user = userEvent.setup()
    vi.mocked(useAuth).mockReturnValue(authValue({ user: signedInUser() }))
    renderNavbar()

    const trigger = screen.getByRole('button', { name: /auth/i })
    await user.click(trigger)

    const profileLink = screen.getByRole('link', { name: 'Profile' })
    expect(profileLink).toHaveFocus()
    expect(profileLink).toHaveAttribute('href', '/profile')
    const accountMenu = screen.getByLabelText('Account menu')
    expect(within(accountMenu).getByRole('link', { name: 'My watchlist' })).toHaveAttribute(
      'href',
      '/watchlist',
    )

    await user.keyboard('{Escape}')
    expect(trigger).toHaveFocus()
    expect(screen.queryByLabelText('Account menu')).not.toBeInTheDocument()
  })

  it('preserves the current destination for logged-out visitors', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/search?q=arrival']}>
        <Routes>
          <Route path="/search" element={<Navbar />} />
          <Route path="/auth" element={<AuthDestination />} />
        </Routes>
      </MemoryRouter>,
    )

    await user.click(screen.getByRole('link', { name: /log in/i }))
    expect(screen.getByTestId('auth-return-path')).toHaveTextContent(
      '/search?q=arrival',
    )
  })
})
