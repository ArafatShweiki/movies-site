import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app'
import { getAuth, type Auth } from 'firebase/auth'
import { getDatabase, type Database } from 'firebase/database'

const firebaseEnvironment = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY?.trim(),
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN?.trim(),
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL?.trim(),
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID?.trim(),
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET?.trim(),
  messagingSenderId:
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID?.trim(),
  appId: import.meta.env.VITE_FIREBASE_APP_ID?.trim(),
} as const

const environmentVariableNames = {
  apiKey: 'VITE_FIREBASE_API_KEY',
  authDomain: 'VITE_FIREBASE_AUTH_DOMAIN',
  databaseURL: 'VITE_FIREBASE_DATABASE_URL',
  projectId: 'VITE_FIREBASE_PROJECT_ID',
  storageBucket: 'VITE_FIREBASE_STORAGE_BUCKET',
  messagingSenderId: 'VITE_FIREBASE_MESSAGING_SENDER_ID',
  appId: 'VITE_FIREBASE_APP_ID',
} as const

const missingFirebaseVariables = Object.entries(firebaseEnvironment)
  .filter(([, value]) => !value)
  .map(
    ([key]) =>
      environmentVariableNames[key as keyof typeof environmentVariableNames],
  )

export let firebaseConfigurationError: string | null =
  missingFirebaseVariables.length > 0
    ? `Firebase is not configured. Add ${missingFirebaseVariables.join(', ')} to your .env file, then restart the development server.`
    : null

let firebaseApp: FirebaseApp | null = null
let firebaseAuth: Auth | null = null
let firebaseDatabase: Database | null = null

if (!firebaseConfigurationError) {
  try {
    firebaseApp =
      getApps().length > 0 ? getApp() : initializeApp(firebaseEnvironment)
    firebaseAuth = getAuth(firebaseApp)
    firebaseDatabase = getDatabase(firebaseApp)
  } catch {
    firebaseApp = null
    firebaseAuth = null
    firebaseDatabase = null
    firebaseConfigurationError =
      'Firebase could not initialize. Check the Firebase values in your .env file and restart the development server.'
  }
}

export { firebaseApp, firebaseAuth, firebaseDatabase }

const authErrorMessages: Readonly<Record<string, string>> = {
  'auth/account-exists-with-different-credential':
    'An account already exists with this email using a different sign-in method.',
  'auth/email-already-in-use':
    'An account already exists for this email address. Try logging in instead.',
  'auth/invalid-credential':
    'The email address or password is incorrect. Please try again.',
  'auth/invalid-email': 'Enter a valid email address.',
  'auth/invalid-login-credentials':
    'The email address or password is incorrect. Please try again.',
  'auth/missing-password': 'Enter your password.',
  'auth/network-request-failed':
    'The authentication service could not be reached. Check your connection and try again.',
  'auth/operation-not-allowed':
    'This sign-in method is not enabled for this Firebase project.',
  'auth/password-does-not-meet-requirements':
    'Choose a stronger password that meets the account requirements.',
  'auth/popup-blocked':
    'Your browser blocked the Google sign-in window. Allow pop-ups and try again.',
  'auth/popup-closed-by-user':
    'Google sign-in was canceled before it finished.',
  'auth/too-many-requests':
    'Too many attempts were made. Wait a moment before trying again.',
  'auth/user-disabled':
    'This account has been disabled. Contact the project administrator for help.',
  'auth/user-not-found':
    'The email address or password is incorrect. Please try again.',
  'auth/unauthorized-domain':
    'Google sign-in is not enabled for this website domain.',
  'auth/weak-password': 'Choose a stronger password with at least eight characters.',
  'auth/wrong-password':
    'The email address or password is incorrect. Please try again.',
}

function getErrorCode(error: unknown): string | null {
  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof error.code === 'string'
  ) {
    return error.code
  }

  return null
}

export function getFirebaseAuthErrorMessage(error: unknown): string {
  const errorCode = getErrorCode(error)

  if (errorCode && authErrorMessages[errorCode]) {
    return authErrorMessages[errorCode]
  }

  return 'Authentication was unsuccessful. Please try again.'
}
