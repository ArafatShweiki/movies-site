import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth'
import {
  firebaseAuth,
  firebaseConfigurationError,
  getFirebaseAuthErrorMessage,
} from '../services/firebase'
import type { AuthContextValue } from '../types/auth'
import { AuthContext } from './authContextValue'

interface AuthProviderProps {
  children: ReactNode
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

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(Boolean(firebaseAuth))

  useEffect(() => {
    if (!firebaseAuth) {
      return undefined
    }

    return onAuthStateChanged(
      firebaseAuth,
      (nextUser) => {
        setUser(nextUser)
        setLoading(false)
      },
      () => {
        setUser(null)
        setLoading(false)
      },
    )
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      configurationError: firebaseConfigurationError,
      login: async (email, password) => {
        const auth = requireConfiguredAuth()

        try {
          await signInWithEmailAndPassword(auth, email.trim(), password)
        } catch (error) {
          throw new Error(getFirebaseAuthErrorMessage(error), { cause: error })
        }
      },
      register: async (email, password) => {
        const auth = requireConfiguredAuth()

        try {
          await createUserWithEmailAndPassword(auth, email.trim(), password)
        } catch (error) {
          throw new Error(getFirebaseAuthErrorMessage(error), { cause: error })
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
    [loading, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
