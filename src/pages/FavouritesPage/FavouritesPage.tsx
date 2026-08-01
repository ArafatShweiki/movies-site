import { Link } from 'react-router-dom'
import { EmptyState } from '../../components/EmptyState/EmptyState'
import { CardSkeletons } from '../../components/LoadingSkeleton/LoadingSkeleton'
import { MovieGrid } from '../../components/MovieGrid/MovieGrid'
import { useFavourites } from '../../hooks/useFavourites'

export default function FavouritesPage() {
  const { favourites, loading } = useFavourites()

  return (
    <div className="standard-page page-width">
      <header className="page-heading">
        <p className="eyebrow">Your personal collection</p>
        <h1>Favourites</h1>
        <p>Stories you saved for a closer look, all in one place.</p>
      </header>
      {loading ? (
        <div role="status">
          <span className="visually-hidden">Loading your favourites…</span>
          <CardSkeletons count={6} />
        </div>
      ) : favourites.length ? (
        <section aria-labelledby="favourites-grid-title">
          <h2 className="visually-hidden" id="favourites-grid-title">
            Saved movies and series
          </h2>
          <MovieGrid movies={favourites} label="Your favourite movies and series" />
        </section>
      ) : (
        <EmptyState
          title="Your vault is ready"
          message="Save a title with the heart button and it will appear here."
          action={<Link className="button button--accent" to="/">Explore the catalogue</Link>}
        />
      )}
    </div>
  )
}
