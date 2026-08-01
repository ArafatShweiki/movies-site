import type { MovieSummary } from '../../types/movie'
import { MovieCard } from '../MovieCard/MovieCard'

interface MovieGridProps {
  movies: readonly MovieSummary[]
  label: string
}

export function MovieGrid({ movies, label }: MovieGridProps) {
  return (
    <div className="movie-grid" aria-label={label}>
      {movies.map((movie) => (
        <MovieCard key={movie.imdbID} movie={movie} />
      ))}
    </div>
  )
}
