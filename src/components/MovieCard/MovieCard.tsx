import { Link } from 'react-router-dom'
import type { MovieSummary } from '../../types/movie'
import { formatMovieType } from '../../utils/movieHelpers'
import { FavouriteButton } from '../FavouriteButton/FavouriteButton'
import { PosterArtwork } from '../PosterArtwork/PosterArtwork'
import { WatchlistButton } from '../WatchlistButton/WatchlistButton'

interface MovieCardProps {
  movie: MovieSummary
  eager?: boolean
}

export function MovieCard({ movie, eager = false }: MovieCardProps) {
  return (
    <article className="movie-card">
      <div className="movie-card__artwork">
        <Link
          className="movie-card__poster-link"
          to={`/movie/${encodeURIComponent(movie.imdbID)}`}
          aria-label={`View details for ${movie.title}`}
        >
          <PosterArtwork
            className="movie-card__poster"
            poster={movie.poster}
            title={movie.title}
            eager={eager}
          />
          <span className="movie-card__details">View details</span>
        </Link>
        <div className="movie-card__save-actions">
          <FavouriteButton movie={movie} />
          <WatchlistButton movie={movie} />
        </div>
      </div>
      <div className="movie-card__body">
        <h3>
          <Link to={`/movie/${encodeURIComponent(movie.imdbID)}`}>
            {movie.title}
          </Link>
        </h3>
        <p>
          <span>{movie.year || 'Year unknown'}</span>
          <span aria-hidden="true">•</span>
          <span>{formatMovieType(movie.type)}</span>
        </p>
      </div>
    </article>
  )
}
