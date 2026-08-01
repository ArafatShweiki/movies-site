import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Database } from 'firebase/database'
import type { ProfileDetails } from '../types/profile'

const databaseMocks = vi.hoisted(() => ({
  onValue: vi.fn(),
  ref: vi.fn((_database: unknown, path: string) => path),
  runTransaction: vi.fn(
    (...args: [unknown, (value: unknown) => unknown]) => {
      void args
      return Promise.resolve()
    },
  ),
  set: vi.fn(() => Promise.resolve()),
  unsubscribe: vi.fn(),
}))

vi.mock('firebase/database', () => databaseMocks)

import {
  createProfileForUser,
  ensureProfileForUser,
  namesFromDisplayName,
  normalizeProfileSnapshot,
  getProfileErrorMessage,
  ProfileAuthenticationRequiredError,
  subscribeToProfile,
  updateProfileForUser,
} from './profileService'

const database = {} as Database
const profile: ProfileDetails = {
  firstName: 'Amina',
  lastName: 'Saleh',
  region: 'West Bank',
  phoneNumber: '+970 59 123 4567',
}

describe('profileService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    databaseMocks.onValue.mockReturnValue(databaseMocks.unsubscribe)
  })

  it('creates the exact UID-scoped profile schema', async () => {
    await createProfileForUser(database, 'user-123', profile, () => 1_785_600_000_000)

    expect(databaseMocks.ref).toHaveBeenCalledWith(
      database,
      'users/user-123/profile',
    )
    expect(databaseMocks.set).toHaveBeenCalledWith('users/user-123/profile', {
      firstName: 'Amina',
      lastName: 'Saleh',
      region: 'West Bank',
      phoneNumber: '+970 59 123 4567',
      updatedAt: 1_785_600_000_000,
    })
  })

  it('uses a transaction to initialize Google profiles without overwriting data', async () => {
    let transactionUpdater: ((value: unknown) => unknown) | undefined
    databaseMocks.runTransaction.mockImplementation(
      async (_path: unknown, updater: (value: unknown) => unknown) => {
        transactionUpdater = updater
      },
    )

    await ensureProfileForUser(
      database,
      'google-user',
      { ...profile, region: '', phoneNumber: '' },
      () => 1_785_600_000_001,
    )

    expect(databaseMocks.runTransaction).toHaveBeenCalledWith(
      'users/google-user/profile',
      expect.any(Function),
      { applyLocally: false },
    )
    const existing = { firstName: 'Existing', custom: 'preserved' }
    expect(transactionUpdater?.(existing)).toBe(existing)
    expect(transactionUpdater?.(null)).toEqual({
      firstName: 'Amina',
      lastName: 'Saleh',
      region: '',
      phoneNumber: '',
      updatedAt: 1_785_600_000_001,
    })
    expect(databaseMocks.set).not.toHaveBeenCalled()
  })

  it('subscribes once at the active profile path and normalizes snapshots', () => {
    const handleValue = vi.fn()
    const handleError = vi.fn()
    databaseMocks.onValue.mockImplementation(
      (_path: unknown, valueHandler: (snapshot: { val: () => unknown }) => void) => {
        valueHandler({
          val: () => ({
            firstName: ' Amina ',
            lastName: ' Saleh ',
            region: ' West   Bank ',
            phoneNumber: ' +970 59 123 4567 ',
            updatedAt: 1_785_600_000_002,
          }),
        })
        return databaseMocks.unsubscribe
      },
    )

    const unsubscribe = subscribeToProfile(
      database,
      'user-123',
      handleValue,
      handleError,
    )

    expect(handleValue).toHaveBeenCalledWith({
      firstName: 'Amina',
      lastName: 'Saleh',
      region: 'West Bank',
      phoneNumber: '+970 59 123 4567',
      updatedAt: 1_785_600_000_002,
    })
    expect(unsubscribe).toBe(databaseMocks.unsubscribe)
  })

  it('replaces a saved profile with the exact validated schema', async () => {
    const savedProfile = await updateProfileForUser(database, 'user-123', profile, () => 42)

    expect(databaseMocks.set).toHaveBeenCalledWith('users/user-123/profile', {
      ...profile,
      updatedAt: 42,
    })
    expect(savedProfile).toEqual({ ...profile, updatedAt: 42 })
  })

  it('rejects unauthenticated writes before touching Firebase', async () => {
    await expect(
      createProfileForUser(database, null, profile),
    ).rejects.toBeInstanceOf(ProfileAuthenticationRequiredError)
    expect(databaseMocks.ref).not.toHaveBeenCalled()
    expect(databaseMocks.set).not.toHaveBeenCalled()
  })

  it('parses names and rejects malformed stored records', () => {
    expect(namesFromDisplayName('  Amina   Noor Saleh ')).toEqual({
      firstName: 'Amina',
      lastName: 'Noor Saleh',
    })
    expect(normalizeProfileSnapshot({ firstName: 'Amina' })).toBeNull()
  })

  it('explains Firebase permission and network failures clearly', () => {
    expect(getProfileErrorMessage({ code: 'PERMISSION_DENIED' })).toMatch(
      /denied access.*database rules/i,
    )
    expect(getProfileErrorMessage(new Error('Client is offline'))).toMatch(
      /check your connection/i,
    )
  })
})
