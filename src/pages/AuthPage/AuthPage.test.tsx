import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AuthContextValue } from '../../types/auth'
import { useAuth } from '../../hooks/useAuth'
import AuthPage from './AuthPage'

vi.mock('../../hooks/useAuth', () => ({ useAuth: vi.fn() }))

function deferredPromise() {
  let resolve!: () => void
  const promise = new Promise<void>((promiseResolve) => {
    resolve = promiseResolve
  })
  return { promise, resolve }
}

function authValue(
  overrides: Partial<AuthContextValue> = {},
): AuthContextValue {
  return {
    user: null,
    loading: false,
    configurationError: null,
    profile: null,
    profileLoading: false,
    profileError: null,
    login: vi.fn(() => Promise.resolve()),
    register: vi.fn(() => Promise.resolve()),
    loginWithGoogle: vi.fn(() => Promise.resolve()),
    saveProfile: vi.fn(() => Promise.resolve()),
    logout: vi.fn(() => Promise.resolve()),
    ...overrides,
  }
}

function renderAuthPage(from = '/profile') {
  return render(
    <MemoryRouter
      initialEntries={[
        {
          pathname: '/auth',
          state: { from, message: 'Sign in to continue.' },
        },
      ]}
    >
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/profile" element={<h1>Profile destination</h1>} />
        <Route path="/" element={<h1>Home destination</h1>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('AuthPage Google sign-in', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useAuth).mockReturnValue(authValue())
  })

  it('signs in with Google and returns to the protected destination', async () => {
    const loginWithGoogle = vi.fn(() => Promise.resolve())
    vi.mocked(useAuth).mockReturnValue(authValue({ loginWithGoogle }))
    const user = userEvent.setup()
    renderAuthPage()

    await user.click(
      screen.getByRole('button', { name: /continue with google/i }),
    )

    expect(loginWithGoogle).toHaveBeenCalledOnce()
    expect(
      await screen.findByRole('heading', { name: /profile destination/i }),
    ).toBeInTheDocument()
  })

  it('disables the Google control and prevents duplicate popup requests', async () => {
    const deferred = deferredPromise()
    const loginWithGoogle = vi.fn(() => deferred.promise)
    vi.mocked(useAuth).mockReturnValue(authValue({ loginWithGoogle }))
    const user = userEvent.setup()
    renderAuthPage()

    const button = screen.getByRole('button', { name: /continue with google/i })
    await user.click(button)

    const pendingButton = screen.getByRole('button', {
      name: /connecting to google/i,
    })
    expect(pendingButton).toBeDisabled()
    await user.click(pendingButton)
    expect(loginWithGoogle).toHaveBeenCalledOnce()

    await act(async () => deferred.resolve())
  })

  it('announces a friendly Google error and moves focus to it', async () => {
    vi.mocked(useAuth).mockReturnValue(
      authValue({
        loginWithGoogle: vi
          .fn()
          .mockRejectedValue(new Error('Google sign-in was canceled before it finished.')),
      }),
    )
    const user = userEvent.setup()
    renderAuthPage()

    await user.click(
      screen.getByRole('button', { name: /continue with google/i }),
    )

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Google sign-in was canceled before it finished.')
    await waitFor(() => expect(alert).toHaveFocus())
  })

  it.each([
    ['popup blocked', 'Your browser blocked the Google sign-in window.'],
    ['network failure', 'The authentication service could not be reached.'],
    [
      'different credential',
      'An account already exists with this email using a different sign-in method.',
    ],
  ])('announces a %s error without losing the email/password form', async (_case, message) => {
    vi.mocked(useAuth).mockReturnValue(
      authValue({ loginWithGoogle: vi.fn().mockRejectedValue(new Error(message)) }),
    )
    const user = userEvent.setup()
    renderAuthPage()

    await user.click(screen.getByRole('button', { name: /continue with google/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(message)
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument()
  })

  it('disables Google sign-in when Firebase configuration is missing', () => {
    vi.mocked(useAuth).mockReturnValue(
      authValue({ configurationError: 'Firebase configuration is missing.' }),
    )
    renderAuthPage()

    expect(
      screen.getByRole('button', { name: /continue with google/i }),
    ).toBeDisabled()
  })
})
