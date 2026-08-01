import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { User } from 'firebase/auth'
import { useState } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const authMocks = vi.hoisted(() => ({
  createUserWithEmailAndPassword: vi.fn(),
  onAuthStateChanged: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  signInWithPopup: vi.fn(),
  signOut: vi.fn(),
  updateProfile: vi.fn(),
  unsubscribeAuth: vi.fn(),
  providerCreated: vi.fn(),
}))

const firebaseMocks = vi.hoisted(() => ({
  auth: { currentUser: null as User | null },
  database: { name: 'profile-database' },
  getFirebaseAuthErrorMessage: vi.fn((error: unknown) => {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'auth/popup-closed-by-user'
    ) {
      return 'Google sign-in was canceled before it finished.'
    }
    return 'Authentication was unsuccessful. Please try again.'
  }),
}))

const profileMocks = vi.hoisted(() => ({
  createProfileForUser: vi.fn(() => Promise.resolve()),
  ensureProfileForUser: vi.fn(() => Promise.resolve()),
  subscribeToProfile: vi.fn(),
  unsubscribeProfile: vi.fn(),
  updateProfileForUser: vi.fn(() => Promise.resolve({
    firstName: 'Amina',
    lastName: 'Saleh',
    region: 'West Bank',
    phoneNumber: '+970 59 123 4567',
    updatedAt: 42,
  })),
}))

vi.mock('firebase/auth', () => ({
  GoogleAuthProvider: class MockGoogleAuthProvider {
    constructor() {
      authMocks.providerCreated()
    }
  },
  createUserWithEmailAndPassword: authMocks.createUserWithEmailAndPassword,
  onAuthStateChanged: authMocks.onAuthStateChanged,
  signInWithEmailAndPassword: authMocks.signInWithEmailAndPassword,
  signInWithPopup: authMocks.signInWithPopup,
  signOut: authMocks.signOut,
  updateProfile: authMocks.updateProfile,
}))

vi.mock('../services/firebase', () => ({
  firebaseAuth: firebaseMocks.auth,
  firebaseDatabase: firebaseMocks.database,
  firebaseConfigurationError: null,
  getFirebaseAuthErrorMessage: firebaseMocks.getFirebaseAuthErrorMessage,
}))

vi.mock('../services/profileService', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../services/profileService')>()),
  createProfileForUser: profileMocks.createProfileForUser,
  ensureProfileForUser: profileMocks.ensureProfileForUser,
  getProfileErrorMessage: () => 'Your profile could not be updated. Please try again.',
  subscribeToProfile: profileMocks.subscribeToProfile,
  updateProfileForUser: profileMocks.updateProfileForUser,
}))

import { useAuth } from '../hooks/useAuth'
import { AuthProvider } from './AuthContext'

function AuthConsumer() {
  const auth = useAuth()
  const [operationError, setOperationError] = useState('')

  function report(operation: Promise<void>) {
    void operation.catch((error: unknown) => {
      setOperationError(error instanceof Error ? error.message : 'Unknown error')
    })
  }

  return (
    <div>
      <span data-testid="auth-state">
        {auth.loading ? 'auth loading' : (auth.user?.uid ?? 'signed out')}
      </span>
      <span data-testid="profile-state">
        {auth.profileLoading
          ? 'profile loading'
          : (auth.profile?.firstName ?? 'no profile')}
      </span>
      <span>{operationError}</span>
      <button
        type="button"
        onClick={() =>
          report(
            auth.register({
              firstName: ' Amina ',
              lastName: ' Saleh ',
              email: ' viewer@example.com ',
              password: 'password1',
            }),
          )
        }
      >
        Register
      </button>
      <button type="button" onClick={() => report(auth.loginWithGoogle())}>
        Google
      </button>
      <button
        type="button"
        onClick={() =>
          report(
            auth.saveProfile({
              firstName: 'Amina',
              lastName: 'Saleh',
              region: 'West Bank',
              phoneNumber: '+970 59 123 4567',
            }),
          )
        }
      >
        Save profile
      </button>
    </div>
  )
}

describe('AuthProvider profile and Google behavior', () => {
  let publishAuthUser: ((user: User | null) => void) | undefined
  let publishProfile:
    | ((profile: {
        firstName: string
        lastName: string
        region: string
        phoneNumber: string
        updatedAt: number
      }) => void)
    | undefined

  beforeEach(() => {
    vi.clearAllMocks()
    firebaseMocks.auth.currentUser = null
    publishAuthUser = undefined
    publishProfile = undefined
    authMocks.onAuthStateChanged.mockImplementation(
      (_auth: unknown, handleUser: (user: User | null) => void) => {
        publishAuthUser = handleUser
        return authMocks.unsubscribeAuth
      },
    )
    profileMocks.subscribeToProfile.mockImplementation(
      (
        _database: unknown,
        _userId: string,
        handleProfile: typeof publishProfile,
      ) => {
        publishProfile = handleProfile
        return profileMocks.unsubscribeProfile
      },
    )
    authMocks.createUserWithEmailAndPassword.mockResolvedValue({
      user: {
        uid: 'email-user',
        email: 'viewer@example.com',
        displayName: null,
        photoURL: null,
      } as User,
    })
    authMocks.signInWithPopup.mockResolvedValue({
      user: {
        uid: 'google-user',
        email: 'google@example.com',
        displayName: 'Amina Noor Saleh',
        photoURL: 'https://example.com/avatar.jpg',
      } as User,
    })
    authMocks.updateProfile.mockResolvedValue(undefined)
  })

  it('keeps one active profile subscription and clears it when the UID changes', async () => {
    const view = render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>,
    )
    const firstUser = { uid: 'first-user' } as User
    const secondUser = { uid: 'second-user' } as User

    act(() => publishAuthUser?.(firstUser))
    await waitFor(() => {
      expect(profileMocks.subscribeToProfile).toHaveBeenCalledWith(
        firebaseMocks.database,
        'first-user',
        expect.any(Function),
        expect.any(Function),
      )
    })
    expect(screen.getByTestId('profile-state')).toHaveTextContent('profile loading')

    act(() => {
      publishProfile?.({
        firstName: 'Amina',
        lastName: 'Saleh',
        region: '',
        phoneNumber: '',
        updatedAt: 1,
      })
    })
    expect(screen.getByTestId('profile-state')).toHaveTextContent('Amina')

    act(() => publishAuthUser?.(secondUser))
    await waitFor(() => {
      expect(profileMocks.unsubscribeProfile).toHaveBeenCalledOnce()
      expect(profileMocks.subscribeToProfile).toHaveBeenLastCalledWith(
        firebaseMocks.database,
        'second-user',
        expect.any(Function),
        expect.any(Function),
      )
    })
    expect(screen.getByTestId('profile-state')).toHaveTextContent('profile loading')

    view.unmount()
    expect(profileMocks.unsubscribeProfile).toHaveBeenCalledTimes(2)
    expect(authMocks.unsubscribeAuth).toHaveBeenCalledOnce()
  })

  it('registers with email, updates the Firebase display name, and creates a profile', async () => {
    const user = userEvent.setup()
    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>,
    )

    await user.click(screen.getByRole('button', { name: 'Register' }))

    await waitFor(() => {
      expect(authMocks.createUserWithEmailAndPassword).toHaveBeenCalledWith(
        firebaseMocks.auth,
        'viewer@example.com',
        'password1',
      )
      expect(authMocks.updateProfile).toHaveBeenCalledWith(
        expect.objectContaining({ uid: 'email-user' }),
        { displayName: 'Amina Saleh' },
      )
      expect(profileMocks.createProfileForUser).toHaveBeenCalledWith(
        firebaseMocks.database,
        'email-user',
        {
          firstName: 'Amina',
          lastName: 'Saleh',
          region: '',
          phoneNumber: '',
        },
      )
    })
  })

  it('uses Google popup sign-in and transaction-backed profile initialization', async () => {
    const user = userEvent.setup()
    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>,
    )

    await user.click(screen.getByRole('button', { name: 'Google' }))

    await waitFor(() => {
      expect(authMocks.providerCreated).toHaveBeenCalledOnce()
      expect(authMocks.signInWithPopup).toHaveBeenCalledWith(
        firebaseMocks.auth,
        expect.any(Object),
      )
      expect(profileMocks.ensureProfileForUser).toHaveBeenCalledWith(
        firebaseMocks.database,
        'google-user',
        {
          firstName: 'Amina',
          lastName: 'Noor Saleh',
          region: '',
          phoneNumber: '',
        },
      )
    })
  })

  it('turns popup cancellation into a friendly Google error', async () => {
    authMocks.signInWithPopup.mockRejectedValueOnce({
      code: 'auth/popup-closed-by-user',
    })
    const user = userEvent.setup()
    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>,
    )

    await user.click(screen.getByRole('button', { name: 'Google' }))

    expect(
      await screen.findByText('Google sign-in was canceled before it finished.'),
    ).toBeInTheDocument()
    expect(profileMocks.ensureProfileForUser).not.toHaveBeenCalled()
  })

  it('updates Firebase displayName and the exact RTDB profile together', async () => {
    const activeUser = { uid: 'active-user' } as User
    firebaseMocks.auth.currentUser = activeUser
    const user = userEvent.setup()
    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>,
    )

    act(() => publishAuthUser?.(activeUser))
    await user.click(screen.getByRole('button', { name: 'Save profile' }))

    await waitFor(() => {
      expect(authMocks.updateProfile).toHaveBeenCalledWith(activeUser, {
        displayName: 'Amina Saleh',
      })
      expect(profileMocks.updateProfileForUser).toHaveBeenCalledWith(
        firebaseMocks.database,
        'active-user',
        {
          firstName: 'Amina',
          lastName: 'Saleh',
          region: 'West Bank',
          phoneNumber: '+970 59 123 4567',
        },
      )
      expect(screen.getByTestId('profile-state')).toHaveTextContent('Amina')
    })
  })
})
