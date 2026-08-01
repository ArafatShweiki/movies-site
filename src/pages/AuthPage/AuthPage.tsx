import { useRef, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { LoginForm } from '../../components/LoginForm/LoginForm'
import { RegistrationForm } from '../../components/RegistrationForm/RegistrationForm'
import { useAuth } from '../../hooks/useAuth'
import type { RegistrationDetails } from '../../types/auth'
import { readableError } from '../../utils/validation'

type AuthMode = 'login' | 'register'

interface AuthRouteState {
  from?: string
  message?: string
}

function safeDestination(candidate: string | undefined) {
  if (
    !candidate?.startsWith('/') ||
    candidate.startsWith('//') ||
    candidate.includes('\\')
  ) {
    return '/'
  }

  try {
    const baseUrl = 'https://strex.local'
    const destination = new URL(candidate, baseUrl)
    return destination.origin === baseUrl
      ? `${destination.pathname}${destination.search}${destination.hash}`
      : '/'
  } catch {
    return '/'
  }
}

export default function AuthPage() {
  const [mode, setMode] = useState<AuthMode>('login')
  const [googleError, setGoogleError] = useState('')
  const [googlePending, setGooglePending] = useState(false)
  const [emailAuthPending, setEmailAuthPending] = useState(false)
  const [holdAfterSetupError, setHoldAfterSetupError] = useState(false)
  const googleErrorRef = useRef<HTMLDivElement>(null)
  const {
    user,
    loading,
    configurationError,
    login,
    register,
    loginWithGoogle,
  } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const routeState = location.state as AuthRouteState | null
  const destination = safeDestination(routeState?.from)

  if (loading) {
    return <div className="route-loading" role="status"><span className="spinner" /> Loading account…</div>
  }

  if (
    user &&
    !googlePending &&
    !emailAuthPending &&
    !googleError &&
    !holdAfterSetupError
  ) {
    return <Navigate to={destination} replace />
  }

  async function handleLogin(email: string, password: string) {
    setEmailAuthPending(true)
    setHoldAfterSetupError(false)
    try {
      await login(email, password)
      navigate(destination, { replace: true })
    } catch (error) {
      setHoldAfterSetupError(true)
      throw error
    } finally {
      setEmailAuthPending(false)
    }
  }

  async function handleRegistration(details: RegistrationDetails) {
    setEmailAuthPending(true)
    setHoldAfterSetupError(false)
    try {
      await register(details)
      navigate(destination, { replace: true })
    } catch (error) {
      setHoldAfterSetupError(true)
      throw error
    } finally {
      setEmailAuthPending(false)
    }
  }

  async function handleGoogleLogin() {
    if (googlePending) return

    setGooglePending(true)
    setGoogleError('')
    setHoldAfterSetupError(false)
    try {
      await loginWithGoogle()
      navigate(destination, { replace: true })
    } catch (error) {
      setGoogleError(readableError(error, 'Unable to sign in with Google.'))
      requestAnimationFrame(() => googleErrorRef.current?.focus())
    } finally {
      setGooglePending(false)
    }
  }

  return (
    <div className="auth-page page-width">
      <section className="auth-intro" aria-labelledby="auth-heading">
        <p className="eyebrow">Your personal story shelf</p>
        <h1 id="auth-heading">Keep the stories you want to remember.</h1>
        <p>
          Keep films and series close, then carry your collection across devices.
        </p>
        <div className="auth-intro__feature">
          <span aria-hidden="true">01</span>
          <div><strong>Save instantly</strong><p>One tap adds any title to your collection.</p></div>
        </div>
        <div className="auth-intro__feature">
          <span aria-hidden="true">02</span>
          <div><strong>Pick up anywhere</strong><p>Your favourites follow your account.</p></div>
        </div>
      </section>
      <section className="auth-panel" aria-labelledby="auth-form-heading">
        <fieldset className="auth-tabs">
          <legend className="visually-hidden">Account access mode</legend>
          <button
            type="button"
            aria-pressed={mode === 'login'}
            onClick={() => setMode('login')}
          >
            Log in
          </button>
          <button
            type="button"
            aria-pressed={mode === 'register'}
            onClick={() => setMode('register')}
          >
            Create account
          </button>
        </fieldset>
        <div
          id="auth-form-panel"
        >
          <p className="eyebrow">{mode === 'login' ? 'Welcome back' : 'Start your collection'}</p>
          <h2 id="auth-form-heading">
            {mode === 'login' ? 'Log in to Strex' : 'Create your Strex account'}
          </h2>
          {routeState?.message && (
            <p className="auth-message" role="status">{routeState.message}</p>
          )}
          {configurationError && (
            <div className="form-alert" role="alert">
              <strong>Firebase setup is required.</strong>
              <span>{configurationError}</span>
            </div>
          )}
          {googleError && (
            <div
              className="form-alert"
              ref={googleErrorRef}
              role="alert"
              tabIndex={-1}
            >
              {googleError}
            </div>
          )}
          <div className="auth-form__actions">
            <button
              className="button button--ghost"
              type="button"
              onClick={() => void handleGoogleLogin()}
              disabled={googlePending || Boolean(configurationError)}
            >
              <svg className="auth-google-icon" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M21.6 12.2c0-.7-.1-1.5-.2-2.2H12v4.2h5.4a4.6 4.6 0 0 1-2 3v2.7h3.3c1.9-1.8 2.9-4.4 2.9-7.7Z" fill="#6f86a6" />
                <path d="M12 22c2.7 0 5-.9 6.7-2.3l-3.3-2.7c-.9.6-2.1 1-3.4 1a5.9 5.9 0 0 1-5.5-4.1H3.1v2.8A10 10 0 0 0 12 22Z" fill="#8fab96" />
                <path d="M6.5 13.9a6 6 0 0 1 0-3.8V7.3H3.1a10 10 0 0 0 0 9.4l3.4-2.8Z" fill="#c8aa79" />
                <path d="M12 6c1.5 0 2.8.5 3.9 1.5l2.9-2.9A9.7 9.7 0 0 0 3.1 7.3l3.4 2.8A5.9 5.9 0 0 1 12 6Z" fill="#b8848f" />
              </svg>
              <span>{googlePending ? 'Connecting to Google…' : 'Continue with Google'}</span>
            </button>
          </div>
          <p className="field-hint">Or continue with email.</p>
          {mode === 'login' ? (
            <LoginForm key="login" onSubmit={handleLogin} />
          ) : (
            <RegistrationForm key="register" onSubmit={handleRegistration} />
          )}
        </div>
        <p className="auth-panel__privacy">Passwords are handled securely by Firebase Authentication and are never stored by Strex.</p>
      </section>
    </div>
  )
}
