import { useEffect, useRef } from 'react'
import { Link, Outlet, useLocation, useNavigationType } from 'react-router-dom'
import { useFavourites } from '../../hooks/useFavourites'
import { useWatchlist } from '../../hooks/useWatchlist'
import { Navbar } from '../Navbar/Navbar'

export function AppShell() {
  const { error: favouritesError, clearError: clearFavouritesError } = useFavourites()
  const { error: watchlistError, clearError: clearWatchlistError } = useWatchlist()
  const location = useLocation()
  const navigationType = useNavigationType()
  const mainRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (navigationType === 'POP') return

    const frame = requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
      mainRef.current?.focus({ preventScroll: true })
    })

    return () => cancelAnimationFrame(frame)
  }, [location.key, navigationType])

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">Skip to content</a>
      <Navbar />
      {favouritesError && (
        <div className="global-alert page-width" role="alert">
          <span>{favouritesError}</span>
          <button type="button" onClick={clearFavouritesError} aria-label="Dismiss favourites error">×</button>
        </div>
      )}
      {watchlistError && (
        <div className="global-alert global-alert--watchlist page-width" role="alert">
          <span>{watchlistError}</span>
          <button type="button" onClick={clearWatchlistError} aria-label="Dismiss watchlist error">×</button>
        </div>
      )}
      <main id="main-content" ref={mainRef} tabIndex={-1}>
        <Outlet />
      </main>
      <footer className="footer page-width">
        <Link className="brand brand--footer" to="/">
          <span className="brand__mark" aria-hidden="true"><span>S</span></span>
          <span>Strex</span>
        </Link>
        <p>Curated discovery for movies and television. No playback, just better finding.</p>
        <p>Title data and artwork supplied by OMDb.</p>
      </footer>
    </div>
  )
}
