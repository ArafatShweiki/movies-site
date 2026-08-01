export interface FieldErrors {
  email?: string
  password?: string
  confirmPassword?: string
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const PASSWORD_MIN_LENGTH = 8

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
  email: string,
  password: string,
  confirmPassword: string,
): FieldErrors {
  const errors: FieldErrors = {
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
