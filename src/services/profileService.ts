import {
  onValue,
  ref,
  runTransaction,
  set,
  type Database,
  type Unsubscribe,
} from 'firebase/database'
import {
  PROFILE_NAME_MAX_LENGTH,
  type ProfileDetails,
  type ProfileNames,
  type UserProfile,
} from '../types/profile'

interface ProfileDatabaseRecord {
  firstName: string
  lastName: string
  region: string
  phoneNumber: string
  updatedAt: number
}

export class ProfileAuthenticationRequiredError extends Error {
  constructor() {
    super('Sign in to manage your profile.')
    this.name = 'ProfileAuthenticationRequiredError'
  }
}

export class ProfileConfigurationError extends Error {
  constructor() {
    super('Profiles are unavailable until Firebase is configured in your .env file.')
    this.name = 'ProfileConfigurationError'
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function requireDatabase(database: Database | null): Database {
  if (!database) throw new ProfileConfigurationError()
  return database
}

function requireUserId(userId: string | null | undefined): string {
  const normalizedUserId = userId?.trim()
  if (!normalizedUserId) throw new ProfileAuthenticationRequiredError()
  const hasForbiddenCharacter = [...normalizedUserId].some((character) => {
    const characterCode = character.charCodeAt(0)
    return (
      '.#$[]/'.includes(character) ||
      characterCode <= 31 ||
      characterCode === 127
    )
  })
  if (hasForbiddenCharacter) {
    throw new Error('The authenticated user ID cannot be used as a Firebase key.')
  }
  return normalizedUserId
}

export function normalizeProfileText(value: string): string {
  return value.trim().replace(/\s+/g, ' ')
}

export function normalizeProfileName(value: string): string {
  return normalizeProfileText(value)
}

export function formatProfileDisplayName(names: ProfileNames): string {
  return [normalizeProfileName(names.firstName), normalizeProfileName(names.lastName)]
    .filter(Boolean)
    .join(' ')
}

export function namesFromDisplayName(displayName: string | null | undefined): ProfileNames {
  const normalizedDisplayName = normalizeProfileName(displayName ?? '')
  if (!normalizedDisplayName) return { firstName: '', lastName: '' }

  const [firstName = '', ...remainingNames] = normalizedDisplayName.split(' ')
  return { firstName, lastName: remainingNames.join(' ') }
}

function profilePath(userId: string): string {
  return `users/${userId}/profile`
}

function toDatabaseRecord(
  details: ProfileDetails,
  updatedAt: number,
): ProfileDatabaseRecord {
  return {
    firstName: normalizeProfileName(details.firstName),
    lastName: normalizeProfileName(details.lastName),
    region: normalizeProfileText(details.region),
    phoneNumber: details.phoneNumber.trim(),
    updatedAt,
  }
}

export function normalizeProfileSnapshot(value: unknown): UserProfile | null {
  if (!isRecord(value)) return null

  const firstName =
    typeof value.firstName === 'string' ? normalizeProfileName(value.firstName) : null
  const lastName =
    typeof value.lastName === 'string' ? normalizeProfileName(value.lastName) : null
  const region =
    typeof value.region === 'string' ? normalizeProfileText(value.region) : null
  const phoneNumber =
    typeof value.phoneNumber === 'string' ? value.phoneNumber.trim() : null
  const updatedAt =
    typeof value.updatedAt === 'number' && Number.isFinite(value.updatedAt)
      ? value.updatedAt
      : null

  if (
    firstName === null ||
    lastName === null ||
    region === null ||
    phoneNumber === null ||
    updatedAt === null
  ) {
    return null
  }

  return { firstName, lastName, region, phoneNumber, updatedAt }
}

export function subscribeToProfile(
  database: Database | null,
  userId: string | null | undefined,
  handleValue: (profile: UserProfile | null) => void,
  handleError: (error: Error) => void,
): Unsubscribe {
  const activeDatabase = requireDatabase(database)
  const activeUserId = requireUserId(userId)

  return onValue(
    ref(activeDatabase, profilePath(activeUserId)),
    (snapshot) => handleValue(normalizeProfileSnapshot(snapshot.val() as unknown)),
    handleError,
  )
}

export async function createProfileForUser(
  database: Database | null,
  userId: string | null | undefined,
  details: ProfileDetails,
  now: () => number = Date.now,
): Promise<void> {
  const activeDatabase = requireDatabase(database)
  const activeUserId = requireUserId(userId)

  await set(
    ref(activeDatabase, profilePath(activeUserId)),
    toDatabaseRecord(details, now()),
  )
}

export async function ensureProfileForUser(
  database: Database | null,
  userId: string | null | undefined,
  details: ProfileDetails,
  now: () => number = Date.now,
): Promise<void> {
  const activeDatabase = requireDatabase(database)
  const activeUserId = requireUserId(userId)
  const initialRecord = toDatabaseRecord(details, now())

  await runTransaction(
    ref(activeDatabase, profilePath(activeUserId)),
    (currentValue) => currentValue ?? initialRecord,
    { applyLocally: false },
  )
}

export async function updateProfileForUser(
  database: Database | null,
  userId: string | null | undefined,
  details: ProfileDetails,
  now: () => number = Date.now,
): Promise<UserProfile> {
  const activeDatabase = requireDatabase(database)
  const activeUserId = requireUserId(userId)
  const record = toDatabaseRecord(details, now())

  if (!record.firstName || !record.lastName) {
    throw new Error('First and last name are required.')
  }
  if (
    record.firstName.length > PROFILE_NAME_MAX_LENGTH ||
    record.lastName.length > PROFILE_NAME_MAX_LENGTH
  ) {
    throw new Error(`Names must be ${PROFILE_NAME_MAX_LENGTH} characters or fewer.`)
  }

  await set(ref(activeDatabase, profilePath(activeUserId)), record)
  return record
}

export function getProfileErrorMessage(error: unknown): string {
  if (
    error instanceof ProfileAuthenticationRequiredError ||
    error instanceof ProfileConfigurationError
  ) {
    return error.message
  }

  const errorCode = isRecord(error) && typeof error.code === 'string'
    ? error.code.toLowerCase()
    : ''
  const errorMessage = error instanceof Error ? error.message : ''

  if (errorCode.includes('permission') || /permission denied/i.test(errorMessage)) {
    return 'Firebase denied access to your profile. Check the Realtime Database rules and try again.'
  }

  if (
    errorCode.includes('network') ||
    /network|disconnected|offline|connection/i.test(errorMessage)
  ) {
    return 'Your profile could not reach Firebase. Check your connection and try again.'
  }

  return 'Your profile could not be updated. Please try again.'
}
