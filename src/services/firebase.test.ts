import { describe, expect, it } from 'vitest'
import { getFirebaseAuthErrorMessage } from './firebase'

describe('getFirebaseAuthErrorMessage', () => {
  it.each([
    [
      'auth/popup-closed-by-user',
      'Google sign-in was canceled before it finished.',
    ],
    [
      'auth/popup-blocked',
      'Your browser blocked the Google sign-in window. Allow pop-ups and try again.',
    ],
    [
      'auth/network-request-failed',
      'The authentication service could not be reached. Check your connection and try again.',
    ],
    [
      'auth/account-exists-with-different-credential',
      'An account already exists with this email using a different sign-in method.',
    ],
  ])('maps %s to a useful message', (code, message) => {
    expect(getFirebaseAuthErrorMessage({ code })).toBe(message)
  })
})
