import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { LoginForm } from '../../components/LoginForm/LoginForm'
import { RegistrationForm } from '../../components/RegistrationForm/RegistrationForm'
import { useAuth } from '../../hooks/useAuth'

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
    const baseUrl = 'https://reelvault.local'
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
  const { user, loading, configurationError, login, register } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const routeState = location.state as AuthRouteState | null
  const destination = safeDestination(routeState?.from)

  if (loading) {
    return <div className="route-loading" role="status"><span className="spinner" /> Loading account…</div>
  }

  if (user) {
    return <Navigate to={destination} replace />
  }

  async function handleLogin(email: string, password: string) {
    await login(email, password)
    navigate(destination, { replace: true })
  }

  async function handleRegistration(email: string, password: string) {
    await register(email, password)
    navigate(destination, { replace: true })
  }

  return (
    <div className="auth-page page-width">
      <section className="auth-intro" aria-labelledby="auth-heading">
        <p className="eyebrow">Your personal screening room</p>
        <h1 id="auth-heading">Keep the stories you want to remember.</h1>
        <p>
          Create a private vault of films and series, then carry it across your devices.
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
          <p className="eyebrow">{mode === 'login' ? 'Welcome back' : 'Start your vault'}</p>
          <h2 id="auth-form-heading">
            {mode === 'login' ? 'Log in to ReelVault' : 'Create your account'}
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
          {mode === 'login' ? (
            <LoginForm key="login" onSubmit={handleLogin} />
          ) : (
            <RegistrationForm key="register" onSubmit={handleRegistration} />
          )}
        </div>
        <p className="auth-panel__privacy">Passwords are handled securely by Firebase Authentication and are never stored by ReelVault.</p>
      </section>
    </div>
  )
}
