import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

interface ProtectedRouteProps {
  children: ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="route-loading" role="status">
        <span className="spinner" aria-hidden="true" />
        Checking your vault…
      </div>
    )
  }

  if (!user) {
    return (
      <Navigate
        to="/auth"
        replace
        state={{
          from: `${location.pathname}${location.search}`,
          message: 'Sign in to open your favourites.',
        }}
      />
    )
  }

  return children
}
