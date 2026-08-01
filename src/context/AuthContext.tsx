import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile as updateFirebaseUserProfile,
  type User,
} from 'firebase/auth'
import {
  firebaseAuth,
  firebaseConfigurationError,
  firebaseDatabase,
  getFirebaseAuthErrorMessage,
} from '../services/firebase'
import {
  createProfileForUser,
  ensureProfileForUser,
  formatProfileDisplayName,
  getProfileErrorMessage,
  namesFromDisplayName,
  normalizeProfileName,
  subscribeToProfile,
  updateProfileForUser,
} from '../services/profileService'
import type { AuthContextValue, RegistrationDetails } from '../types/auth'
import {
  PROFILE_NAME_MAX_LENGTH,
  type ProfileDetails,
  type ProfileNames,
  type UserProfile,
} from '../types/profile'
import { AuthContext } from './authContextValue'

interface AuthProviderProps {
  children: ReactNode
}

interface ProfileSessionState {
  userId: string | null
  profile: UserProfile | null
  loading: boolean
  error: string | null
}

const signedOutProfileState: ProfileSessionState = {
  userId: null,
  profile: null,
  loading: false,
  error: null,
}

function requireConfiguredAuth() {
  if (!firebaseAuth) {
    throw new Error(
      firebaseConfigurationError ??
        'Firebase Authentication is not available. Check the project configuration.',
    )
  }

  return firebaseAuth
}

function requireConfiguredDatabase() {
  if (!firebaseDatabase) {
    throw new Error(
      firebaseConfigurationError ??
        'Firebase Realtime Database is not available. Check the project configuration.',
    )
  }

  return firebaseDatabase
}

function requiredProfileNames(names: ProfileNames): ProfileNames {
  const firstName = normalizeProfileName(names.firstName)
  const lastName = normalizeProfileName(names.lastName)

  if (!firstName || !lastName) {
    throw new Error('First and last name are required.')
  }
  if (
    firstName.length > PROFILE_NAME_MAX_LENGTH ||
    lastName.length > PROFILE_NAME_MAX_LENGTH
  ) {
    throw new Error(`Names must be ${PROFILE_NAME_MAX_LENGTH} characters or fewer.`)
  }

  return { firstName, lastName }
}

function initialProfileFromUser(user: User): ProfileDetails {
  const names = namesFromDisplayName(user.displayName)
  return {
    ...names,
    region: '',
    phoneNumber: '',
  }
}

function profileOperationError(error: unknown): Error {
  return new Error(getProfileErrorMessage(error), { cause: error })
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(Boolean(firebaseAuth))
  const [profileSession, setProfileSession] =
    useState<ProfileSessionState>(signedOutProfileState)
  const userId = user?.uid ?? null

  useEffect(() => {
    if (!firebaseAuth) return undefined

    return onAuthStateChanged(
      firebaseAuth,
      (nextUser) => {
        setUser(nextUser)
        setProfileSession(
          nextUser
            ? {
                userId: nextUser.uid,
                profile: null,
                loading: Boolean(firebaseDatabase),
                error: firebaseDatabase
                  ? null
                  : (firebaseConfigurationError ??
                    'Profiles are unavailable until Firebase is configured.'),
              }
            : signedOutProfileState,
        )
        setLoading(false)
      },
      () => {
        setUser(null)
        setProfileSession(signedOutProfileState)
        setLoading(false)
      },
    )
  }, [])

  useEffect(() => {
    if (!userId || !firebaseDatabase) return undefined

    return subscribeToProfile(
      firebaseDatabase,
      userId,
      (profile) => {
        setProfileSession({ userId, profile, loading: false, error: null })
      },
      (error) => {
        setProfileSession({
          userId,
          profile: null,
          loading: false,
          error: getProfileErrorMessage(error),
        })
      },
    )
  }, [userId])

  const activeProfileSession = useMemo<ProfileSessionState>(
    () =>
      profileSession.userId === userId
        ? profileSession
        : {
            userId,
            profile: null,
            loading: Boolean(userId && firebaseDatabase),
            error:
              userId && !firebaseDatabase
                ? (firebaseConfigurationError ??
                  'Profiles are unavailable until Firebase is configured.')
                : null,
          },
    [profileSession, userId],
  )

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      configurationError: firebaseConfigurationError,
      profile: activeProfileSession.profile,
      profileLoading: activeProfileSession.loading,
      profileError: activeProfileSession.error,
      login: async (email, password) => {
        const auth = requireConfiguredAuth()

        try {
          await signInWithEmailAndPassword(auth, email.trim(), password)
        } catch (error) {
          throw new Error(getFirebaseAuthErrorMessage(error), { cause: error })
        }
      },
      register: async (details: RegistrationDetails) => {
        const auth = requireConfiguredAuth()
        const database = requireConfiguredDatabase()
        const names = requiredProfileNames(details)
        let newUser: User

        try {
          const credential = await createUserWithEmailAndPassword(
            auth,
            details.email.trim(),
            details.password,
          )
          newUser = credential.user
          await updateFirebaseUserProfile(newUser, {
            displayName: formatProfileDisplayName(names),
          })
        } catch (error) {
          throw new Error(getFirebaseAuthErrorMessage(error), { cause: error })
        }

        try {
          await createProfileForUser(database, newUser.uid, {
            ...names,
            region: '',
            phoneNumber: '',
          })
        } catch (error) {
          throw profileOperationError(error)
        }
      },
      loginWithGoogle: async () => {
        const auth = requireConfiguredAuth()
        const database = requireConfiguredDatabase()
        let googleUser: User

        try {
          const credential = await signInWithPopup(auth, new GoogleAuthProvider())
          googleUser = credential.user
        } catch (error) {
          throw new Error(getFirebaseAuthErrorMessage(error), { cause: error })
        }

        try {
          await ensureProfileForUser(
            database,
            googleUser.uid,
            initialProfileFromUser(googleUser),
          )
        } catch (error) {
          throw profileOperationError(error)
        }
      },
      saveProfile: async (profile: ProfileDetails) => {
        const auth = requireConfiguredAuth()
        const database = requireConfiguredDatabase()
        const activeUser = auth.currentUser ?? user

        if (!activeUser) {
          throw new Error('Sign in to manage your profile.')
        }

        const normalizedNames = requiredProfileNames(profile)
        try {
          await updateFirebaseUserProfile(activeUser, {
            displayName: formatProfileDisplayName(normalizedNames),
          })
        } catch (error) {
          throw new Error(getFirebaseAuthErrorMessage(error), { cause: error })
        }

        try {
          const savedProfile = await updateProfileForUser(database, activeUser.uid, {
            ...profile,
            ...normalizedNames,
          })
          setProfileSession({
            userId: activeUser.uid,
            profile: savedProfile,
            loading: false,
            error: null,
          })
        } catch (error) {
          throw profileOperationError(error)
        }
      },
      logout: async () => {
        const auth = requireConfiguredAuth()

        try {
          await signOut(auth)
        } catch (error) {
          throw new Error(getFirebaseAuthErrorMessage(error), { cause: error })
        }
      },
    }),
    [activeProfileSession, loading, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
