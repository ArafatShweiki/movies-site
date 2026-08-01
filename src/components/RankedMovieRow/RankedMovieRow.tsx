import type { MovieSummary } from '../../types/movie'
import { MovieCard } from '../MovieCard/MovieCard'

interface RankedMovieRowProps {
  movies: MovieSummary[]
}

export function RankedMovieRow({ movies }: RankedMovieRowProps) {
  if (!movies.length) return null

  return (
    <section className="movie-section ranked-section" aria-labelledby="curated-top-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Curated shortlist</p>
          <h2 id="curated-top-title">Top 10 Picks</h2>
        </div>
        <p>A fixed Strex shortlist—not a live popularity chart.</p>
      </div>
      <ol className="ranked-row" aria-label="Strex’s ten curated picks">
        {movies.slice(0, 10).map((movie, index) => (
          <li key={movie.imdbID}>
            <span className="ranked-row__number" aria-hidden="true">
              {index + 1}
            </span>
            <span className="visually-hidden">Rank {index + 1}: </span>
            <MovieCard movie={movie} />
          </li>
        ))}
      </ol>
    </section>
  )
}
