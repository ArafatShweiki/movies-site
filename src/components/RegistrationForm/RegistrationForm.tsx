import { FormEvent, useId, useRef, useState } from 'react'
import {
  hasFieldErrors,
  readableError,
  validateRegistrationFields,
  type FieldErrors,
} from '../../utils/validation'
import type { RegistrationDetails } from '../../types/auth'

interface RegistrationFormProps {
  onSubmit: (details: RegistrationDetails) => Promise<void>
}

export function RegistrationForm({ onSubmit }: RegistrationFormProps) {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const firstNameId = useId()
  const lastNameId = useId()
  const emailId = useId()
  const passwordId = useId()
  const confirmId = useId()
  const formErrorRef = useRef<HTMLDivElement>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isSubmitting) return

    const nextErrors = validateRegistrationFields(
      firstName,
      lastName,
      email,
      password,
      confirmPassword,
    )
    setErrors(nextErrors)
    setFormError('')

    if (hasFieldErrors(nextErrors)) return

    setIsSubmitting(true)
    try {
      await onSubmit({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        password,
      })
    } catch (error) {
      setFormError(readableError(error, 'Unable to create your account. Please try again.'))
      requestAnimationFrame(() => formErrorRef.current?.focus())
    } finally {
      setIsSubmitting(false)
    }
  }

  function resetForm() {
    setFirstName('')
    setLastName('')
    setEmail('')
    setPassword('')
    setConfirmPassword('')
    setErrors({})
    setFormError('')
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit} onReset={resetForm} noValidate>
      {formError && (
        <div
          className="form-alert"
          ref={formErrorRef}
          role="alert"
          tabIndex={-1}
        >
          {formError}
        </div>
      )}
      <fieldset disabled={isSubmitting}>
        <legend>Create account credentials</legend>
        <div className="field-group">
          <label htmlFor={firstNameId}>First name</label>
          <input
            id={firstNameId}
            name="firstName"
            type="text"
            value={firstName}
            onChange={(event) => {
              setFirstName(event.target.value)
              if (errors.firstName) {
                setErrors((current) => ({ ...current, firstName: undefined }))
              }
            }}
            autoComplete="given-name"
            aria-invalid={Boolean(errors.firstName)}
            aria-describedby={errors.firstName ? `${firstNameId}-error` : undefined}
          />
          {errors.firstName && (
            <p className="field-error" id={`${firstNameId}-error`}>
              {errors.firstName}
            </p>
          )}
        </div>
        <div className="field-group">
          <label htmlFor={lastNameId}>Last name</label>
          <input
            id={lastNameId}
            name="lastName"
            type="text"
            value={lastName}
            onChange={(event) => {
              setLastName(event.target.value)
              if (errors.lastName) {
                setErrors((current) => ({ ...current, lastName: undefined }))
              }
            }}
            autoComplete="family-name"
            aria-invalid={Boolean(errors.lastName)}
            aria-describedby={errors.lastName ? `${lastNameId}-error` : undefined}
          />
          {errors.lastName && (
            <p className="field-error" id={`${lastNameId}-error`}>
              {errors.lastName}
            </p>
          )}
        </div>
        <div className="field-group">
          <label htmlFor={emailId}>Email address</label>
          <input
            id={emailId}
            name="email"
            type="email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value)
              if (errors.email) setErrors((current) => ({ ...current, email: undefined }))
            }}
            autoComplete="email"
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? `${emailId}-error` : undefined}
          />
          {errors.email && (
            <p className="field-error" id={`${emailId}-error`}>
              {errors.email}
            </p>
          )}
        </div>
        <div className="field-group">
          <label htmlFor={passwordId}>Password</label>
          <input
            id={passwordId}
            name="password"
            type="password"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value)
              if (errors.password) setErrors((current) => ({ ...current, password: undefined }))
            }}
            autoComplete="new-password"
            aria-invalid={Boolean(errors.password)}
            aria-describedby={
              errors.password
                ? `${passwordId}-hint ${passwordId}-error`
                : `${passwordId}-hint`
            }
          />
          <p className="field-hint" id={`${passwordId}-hint`}>
            Use at least 8 characters.
          </p>
          {errors.password && (
            <p className="field-error" id={`${passwordId}-error`}>
              {errors.password}
            </p>
          )}
        </div>
        <div className="field-group">
          <label htmlFor={confirmId}>Confirm password</label>
          <input
            id={confirmId}
            name="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(event) => {
              setConfirmPassword(event.target.value)
              if (errors.confirmPassword) {
                setErrors((current) => ({ ...current, confirmPassword: undefined }))
              }
            }}
            autoComplete="new-password"
            aria-invalid={Boolean(errors.confirmPassword)}
            aria-describedby={errors.confirmPassword ? `${confirmId}-error` : undefined}
          />
          {errors.confirmPassword && (
            <p className="field-error" id={`${confirmId}-error`}>
              {errors.confirmPassword}
            </p>
          )}
        </div>
        <div className="auth-form__actions">
          <button className="button button--accent" type="submit">
            {isSubmitting ? 'Creating account…' : 'Create account'}
          </button>
          <button className="button button--text" type="reset">
            Clear form
          </button>
        </div>
      </fieldset>
    </form>
  )
}
