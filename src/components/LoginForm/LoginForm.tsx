import { FormEvent, useId, useRef, useState } from 'react'
import {
  hasFieldErrors,
  readableError,
  validateLoginFields,
  type FieldErrors,
} from '../../utils/validation'

interface LoginFormProps {
  onSubmit: (email: string, password: string) => Promise<void>
}

export function LoginForm({ onSubmit }: LoginFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const emailId = useId()
  const passwordId = useId()
  const formErrorRef = useRef<HTMLDivElement>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isSubmitting) return

    const nextErrors = validateLoginFields(email, password)
    setErrors(nextErrors)
    setFormError('')

    if (hasFieldErrors(nextErrors)) return

    setIsSubmitting(true)
    try {
      await onSubmit(email.trim(), password)
    } catch (error) {
      setFormError(readableError(error, 'Unable to sign in. Please try again.'))
      requestAnimationFrame(() => formErrorRef.current?.focus())
    } finally {
      setIsSubmitting(false)
    }
  }

  function resetForm() {
    setEmail('')
    setPassword('')
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
        <legend>Login credentials</legend>
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
            autoComplete="current-password"
            aria-invalid={Boolean(errors.password)}
            aria-describedby={errors.password ? `${passwordId}-error` : undefined}
          />
          {errors.password && (
            <p className="field-error" id={`${passwordId}-error`}>
              {errors.password}
            </p>
          )}
        </div>
        <div className="auth-form__actions">
          <button className="button button--accent" type="submit">
            {isSubmitting ? 'Signing in…' : 'Sign in'}
          </button>
          <button className="button button--text" type="reset">
            Clear form
          </button>
        </div>
      </fieldset>
    </form>
  )
}
