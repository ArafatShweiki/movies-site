import type { MovieSummary } from '../../types/movie'
import { MovieCard } from '../MovieCard/MovieCard'

interface MovieRowProps {
  id?: string
  title: string
  description?: string
  movies: MovieSummary[]
}

export function MovieRow({ id, title, description, movies }: MovieRowProps) {
  if (!movies.length) return null

  return (
    <section className="movie-section" aria-labelledby={id ? `${id}-title` : undefined}>
      <div className="section-heading">
        <div>
          <p className="eyebrow">Curated collection</p>
          <h2 id={id ? `${id}-title` : undefined}>{title}</h2>
        </div>
        {description && <p>{description}</p>}
      </div>
      <div className="movie-row" tabIndex={0} aria-label={`${title}, horizontally scrollable`}>
        {movies.map((movie, index) => (
          <MovieCard key={movie.imdbID} movie={movie} eager={index < 3} />
        ))}
      </div>
    </section>
  )
}
