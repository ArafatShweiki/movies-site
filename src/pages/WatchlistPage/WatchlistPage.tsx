import { Link } from 'react-router-dom'
import { EmptyState } from '../../components/EmptyState/EmptyState'
import { CardSkeletons } from '../../components/LoadingSkeleton/LoadingSkeleton'
import { MovieGrid } from '../../components/MovieGrid/MovieGrid'
import { useWatchlist } from '../../hooks/useWatchlist'

export default function WatchlistPage() {
  const { watchlist, loading, error, clearError } = useWatchlist()

  return (
    <div className="standard-page page-width">
      <header className="page-heading">
        <p className="eyebrow">Saved for later</p>
        <h1>Watchlist</h1>
        <p>Keep a separate queue of movies and series you want to explore next.</p>
      </header>

      {error && (
        <div className="partial-notice" role="alert">
          <span>{error}</span>
          <button className="button button--text" onClick={clearError} type="button">
            Dismiss
          </button>
        </div>
      )}

      {loading ? (
        <div role="status">
          <span className="visually-hidden">Loading your watchlist…</span>
          <CardSkeletons count={6} />
        </div>
      ) : watchlist.length > 0 ? (
        <section aria-labelledby="watchlist-grid-title">
          <h2 className="visually-hidden" id="watchlist-grid-title">
            Movies and series in your watchlist
          </h2>
          <MovieGrid movies={watchlist} label="Your movie and series watchlist" />
        </section>
      ) : (
        <EmptyState
          action={<Link className="button button--accent" to="/">Explore the catalogue</Link>}
          message="Use the bookmark button on a title to build a queue for later."
          title="Your watchlist is ready"
        />
      )}
    </div>
  )
}
