import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { User } from 'firebase/auth'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AuthContextValue } from '../../types/auth'
import { useAuth } from '../../hooks/useAuth'
import ProfilePage from './ProfilePage'

vi.mock('../../hooks/useAuth', () => ({ useAuth: vi.fn() }))

const firebaseUser = {
  uid: 'user-123',
  email: 'amina@example.com',
  displayName: 'Amina Saleh',
  photoURL: null,
} as User

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
    user: firebaseUser,
    loading: false,
    configurationError: null,
    profile: {
      firstName: 'Amina',
      lastName: 'Saleh',
      region: 'West Bank',
      phoneNumber: '+970 59 123 4567',
      updatedAt: 1,
    },
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

describe('ProfilePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useAuth).mockReturnValue(authValue())
  })

  it('loads the subscribed profile into accessible labelled fields', () => {
    render(<ProfilePage />)

    expect(screen.getByLabelText(/first name/i)).toHaveValue('Amina')
    expect(screen.getByLabelText(/last name/i)).toHaveValue('Saleh')
    expect(screen.getByLabelText(/region/i)).toHaveValue('West Bank')
    expect(screen.getByLabelText(/phone number/i)).toHaveValue(
      '+970 59 123 4567',
    )
    expect(screen.getByText(/amina@example\.com/i)).toBeInTheDocument()
  })

  it('rejects blank names and associates each error with its field', async () => {
    const saveProfile = vi.fn(() => Promise.resolve())
    vi.mocked(useAuth).mockReturnValue(authValue({ saveProfile }))
    const user = userEvent.setup()
    render(<ProfilePage />)

    const firstName = screen.getByLabelText(/first name/i)
    const lastName = screen.getByLabelText(/last name/i)
    await user.clear(firstName)
    await user.type(firstName, '   ')
    await user.clear(lastName)
    await user.click(screen.getByRole('button', { name: /save profile/i }))

    const firstError = screen.getByText('First name is required.')
    const lastError = screen.getByText('Last name is required.')
    expect(firstName).toHaveAttribute('aria-invalid', 'true')
    expect(firstName).toHaveAttribute('aria-describedby', firstError.id)
    expect(lastName).toHaveAttribute('aria-invalid', 'true')
    expect(lastName).toHaveAttribute('aria-describedby', lastError.id)
    expect(saveProfile).not.toHaveBeenCalled()
  })

  it('rejects an invalid optional phone number with an accessible error', async () => {
    const user = userEvent.setup()
    render(<ProfilePage />)

    const phone = screen.getByLabelText(/phone number/i)
    await user.clear(phone)
    await user.type(phone, 'call-me')
    await user.click(screen.getByRole('button', { name: /save profile/i }))

    const error = screen.getByText(/enter a valid phone number/i)
    expect(phone).toHaveAttribute('aria-invalid', 'true')
    expect(phone.getAttribute('aria-describedby')).toContain(error.id)
  })

  it('rejects a phone value made only of punctuation', async () => {
    const user = userEvent.setup()
    render(<ProfilePage />)

    const phone = screen.getByLabelText(/phone number/i)
    await user.clear(phone)
    await user.type(phone, '---')
    await user.click(screen.getByRole('button', { name: /save profile/i }))

    expect(screen.getByText(/enter a valid phone number/i)).toBeInTheDocument()
  })

  it('submits trimmed profile values and announces success', async () => {
    const saveProfile = vi.fn(() => Promise.resolve())
    vi.mocked(useAuth).mockReturnValue(authValue({ saveProfile }))
    const user = userEvent.setup()
    render(<ProfilePage />)

    const region = screen.getByLabelText(/region/i)
    await user.clear(region)
    await user.type(region, '  Ramallah  ')
    await user.click(screen.getByRole('button', { name: /save profile/i }))

    await waitFor(() => {
      expect(saveProfile).toHaveBeenCalledWith({
        firstName: 'Amina',
        lastName: 'Saleh',
        region: 'Ramallah',
        phoneNumber: '+970 59 123 4567',
      })
    })
    expect(await screen.findByText('Your profile was saved.')).toBeInTheDocument()
  })

  it('focuses a useful error when saving fails', async () => {
    vi.mocked(useAuth).mockReturnValue(
      authValue({
        saveProfile: vi
          .fn()
          .mockRejectedValue(new Error('Your profile could not be updated.')),
      }),
    )
    const user = userEvent.setup()
    render(<ProfilePage />)

    await user.click(screen.getByRole('button', { name: /save profile/i }))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Your profile could not be updated.')
    await waitFor(() => expect(alert).toHaveFocus())
  })

  it('disables the complete form and prevents duplicate saves while pending', async () => {
    const deferred = deferredPromise()
    const saveProfile = vi.fn(() => deferred.promise)
    vi.mocked(useAuth).mockReturnValue(authValue({ saveProfile }))
    const user = userEvent.setup()
    render(<ProfilePage />)

    await user.click(screen.getByRole('button', { name: /save profile/i }))

    const pendingButton = screen.getByRole('button', { name: /saving profile/i })
    expect(pendingButton).toBeDisabled()
    expect(screen.getByLabelText(/first name/i)).toBeDisabled()
    expect(screen.getByLabelText(/phone number/i)).toBeDisabled()
    await user.click(pendingButton)
    expect(saveProfile).toHaveBeenCalledOnce()

    await act(async () => deferred.resolve())
  })

  it('resets edited values and validation state to the subscribed profile', async () => {
    const user = userEvent.setup()
    render(<ProfilePage />)
    const firstName = screen.getByLabelText(/first name/i)
    const phone = screen.getByLabelText(/phone number/i)

    await user.clear(firstName)
    await user.clear(phone)
    await user.type(phone, 'invalid')
    await user.click(screen.getByRole('button', { name: /save profile/i }))
    expect(firstName).toHaveAttribute('aria-invalid', 'true')

    await user.click(screen.getByRole('button', { name: /reset/i }))

    expect(firstName).toHaveValue('Amina')
    expect(phone).toHaveValue('+970 59 123 4567')
    expect(firstName).toHaveAttribute('aria-invalid', 'false')
    expect(screen.queryByText('First name is required.')).not.toBeInTheDocument()
  })

  it('shows loading feedback without rendering editable fields', () => {
    vi.mocked(useAuth).mockReturnValue(authValue({ profileLoading: true }))
    render(<ProfilePage />)

    expect(screen.getByRole('status')).toHaveTextContent(/loading your profile/i)
    expect(screen.queryByLabelText(/first name/i)).not.toBeInTheDocument()
  })
})
