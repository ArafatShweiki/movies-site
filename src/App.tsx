import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell/AppShell'
import { ProtectedRoute } from './components/ProtectedRoute/ProtectedRoute'

const HomePage = lazy(() => import('./pages/HomePage/HomePage'))
const SearchPage = lazy(() => import('./pages/SearchPage/SearchPage'))
const MovieDetailsPage = lazy(() => import('./pages/MovieDetailsPage/MovieDetailsPage'))
const AuthPage = lazy(() => import('./pages/AuthPage/AuthPage'))
const FavouritesPage = lazy(() => import('./pages/FavouritesPage/FavouritesPage'))
const WatchlistPage = lazy(() => import('./pages/WatchlistPage/WatchlistPage'))
const ProfilePage = lazy(() => import('./pages/ProfilePage/ProfilePage'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage/NotFoundPage'))

function RouteFallback() {
  return (
    <div className="route-loading" role="status">
      <span className="spinner" aria-hidden="true" />
      Opening Strex…
    </div>
  )
}

export function App() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<HomePage />} />
          <Route path="search" element={<SearchPage />} />
          <Route path="movie/:imdbID" element={<MovieDetailsPage />} />
          <Route path="auth" element={<AuthPage />} />
          <Route
            path="favourites"
            element={
              <ProtectedRoute message="Sign in to open your favourites.">
                <FavouritesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="watchlist"
            element={
              <ProtectedRoute message="Sign in to open your watchlist.">
                <WatchlistPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="profile"
            element={
              <ProtectedRoute message="Sign in to manage your profile.">
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </Suspense>
  )
}
