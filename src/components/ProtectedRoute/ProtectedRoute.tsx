import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

interface ProtectedRouteProps {
  children: ReactNode
  message?: string
}

export function ProtectedRoute({
  children,
  message = 'Sign in to access this page.',
}: ProtectedRouteProps) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="route-loading" role="status">
        <span className="spinner" aria-hidden="true" />
        Checking your account…
      </div>
    )
  }

  if (!user) {
    return (
      <Navigate
        to="/auth"
        replace
        state={{
          from: `${location.pathname}${location.search}${location.hash}`,
          message,
        }}
      />
    )
  }

  return children
}
