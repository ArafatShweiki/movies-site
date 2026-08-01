import { Link } from 'react-router-dom'
import type { MovieDetails, MovieSummary } from '../../types/movie'
import { formatMovieType } from '../../utils/movieHelpers'
import { FavouriteButton } from '../FavouriteButton/FavouriteButton'

interface HeroBannerProps {
  movie: MovieSummary
  details?: MovieDetails | null
}

export function HeroBanner({ movie, details }: HeroBannerProps) {
  const plot = details?.plot ?? 'Explore the full cast, ratings, and story details.'
  const typeLabel = formatMovieType(movie.type)

  return (
    <section className="hero" aria-labelledby="hero-title">
      {movie.poster && (
        <div
          className="hero__backdrop"
          style={{ backgroundImage: `url("${movie.poster.replaceAll('"', '%22')}")` }}
          aria-hidden="true"
        />
      )}
      <div className="hero__veil" aria-hidden="true" />
      <div className="hero__content page-width">
        <p className="eyebrow"><span /> This week’s feature</p>
        <h2 id="hero-title">{movie.title}</h2>
        <div className="hero__meta" aria-label="Title information">
          {movie.year && <span>{movie.year}</span>}
          <span>{typeLabel}</span>
          {details?.imdbRating && (
            <span className="rating-pill">
              <span aria-hidden="true">★</span> {details.imdbRating} IMDb
            </span>
          )}
        </div>
        <p className="hero__plot">{plot}</p>
        <div className="hero__actions">
          <Link className="button button--accent" to={`/movie/${movie.imdbID}`}>
            View details <span aria-hidden="true">→</span>
          </Link>
          <FavouriteButton movie={movie} showLabel />
        </div>
      </div>
    </section>
  )
}
