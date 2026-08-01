import { PROFILE_NAME_MAX_LENGTH } from '../types/profile'

export interface FieldErrors {
  firstName?: string
  lastName?: string
  region?: string
  phoneNumber?: string
  email?: string
  password?: string
  confirmPassword?: string
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const PASSWORD_MIN_LENGTH = 8
export const PROFILE_REGION_MAX_LENGTH = 80
export const PROFILE_PHONE_MAX_LENGTH = 30
const PHONE_PATTERN = /^\+?[0-9()\-\s]+$/
const PHONE_DIGIT_PATTERN = /[0-9]/

export function validateProfileName(
  value: string,
  label: 'First name' | 'Last name',
): string | undefined {
  const normalizedValue = value.trim()

  if (!normalizedValue) {
    return `${label} is required.`
  }

  if (normalizedValue.length > PROFILE_NAME_MAX_LENGTH) {
    return `${label} must be ${PROFILE_NAME_MAX_LENGTH} characters or fewer.`
  }

  return undefined
}

export function validateProfileFields(
  firstName: string,
  lastName: string,
  region = '',
  phoneNumber = '',
): FieldErrors {
  const normalizedRegion = region.trim()
  const normalizedPhoneNumber = phoneNumber.trim()

  return {
    firstName: validateProfileName(firstName, 'First name'),
    lastName: validateProfileName(lastName, 'Last name'),
    region:
      normalizedRegion.length > PROFILE_REGION_MAX_LENGTH
        ? `Region must be ${PROFILE_REGION_MAX_LENGTH} characters or fewer.`
        : undefined,
    phoneNumber:
      normalizedPhoneNumber.length > PROFILE_PHONE_MAX_LENGTH
        ? `Phone number must be ${PROFILE_PHONE_MAX_LENGTH} characters or fewer.`
        : normalizedPhoneNumber && (
            !PHONE_PATTERN.test(normalizedPhoneNumber) ||
            !PHONE_DIGIT_PATTERN.test(normalizedPhoneNumber)
          )
          ? 'Enter a valid phone number using digits and common phone symbols.'
          : undefined,
  }
}

export function validateEmail(email: string): string | undefined {
  const normalizedEmail = email.trim()

  if (!normalizedEmail) {
    return 'Email is required.'
  }

  if (!EMAIL_PATTERN.test(normalizedEmail)) {
    return 'Enter a valid email address.'
  }

  return undefined
}

export function validatePassword(password: string): string | undefined {
  if (!password) {
    return 'Password is required.'
  }

  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Use at least ${PASSWORD_MIN_LENGTH} characters.`
  }

  return undefined
}

export function validateLoginFields(
  email: string,
  password: string,
): FieldErrors {
  return {
    email: validateEmail(email),
    password: password ? undefined : 'Password is required.',
  }
}

export function validateRegistrationFields(
  firstName: string,
  lastName: string,
  email: string,
  password: string,
  confirmPassword: string,
): FieldErrors {
  const errors: FieldErrors = {
    firstName: validateProfileName(firstName, 'First name'),
    lastName: validateProfileName(lastName, 'Last name'),
    email: validateEmail(email),
    password: validatePassword(password),
  }

  if (!confirmPassword) {
    errors.confirmPassword = 'Confirm your password.'
  } else if (password !== confirmPassword) {
    errors.confirmPassword = 'Passwords do not match.'
  }

  return errors
}

export function hasFieldErrors(errors: FieldErrors): boolean {
  return Object.values(errors).some(Boolean)
}

export function readableError(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback
}
