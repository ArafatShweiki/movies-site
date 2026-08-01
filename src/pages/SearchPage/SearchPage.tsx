import { useNavigate, useSearchParams } from 'react-router-dom'
import { EmptyState } from '../../components/EmptyState/EmptyState'
import { ErrorState } from '../../components/ErrorState/ErrorState'
import { CardSkeletons } from '../../components/LoadingSkeleton/LoadingSkeleton'
import { MovieGrid } from '../../components/MovieGrid/MovieGrid'
import { SearchForm } from '../../components/SearchForm/SearchForm'
import { useMovieSearch } from '../../hooks/useMovieSearch'

export default function SearchPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const query = (searchParams.get('q') ?? '').trim()
  const { movies, totalResults, status, error, isLoading, retry } = useMovieSearch(query, {
    enabled: Boolean(query),
  })

  function runSearch(nextQuery: string) {
    navigate(`/search?q=${encodeURIComponent(nextQuery)}`)
  }

  return (
    <div className="search-page page-width">
      <header className="page-heading page-heading--search">
        <p className="eyebrow">Search the catalogue</p>
        <h1>Find a story for tonight.</h1>
        <p>Search OMDb by the title of a movie or television series.</p>
        <SearchForm
          key={query}
          initialQuery={query}
          isLoading={isLoading}
          onSearch={runSearch}
          onClear={() => navigate('/search', { replace: true })}
          autoFocus={!query}
        />
      </header>

      <div className="search-results" aria-live="polite" aria-busy={isLoading}>
        {isLoading && <CardSkeletons count={8} />}
        {!query && status === 'idle' && (
          <EmptyState
            title="What are you in the mood for?"
            message="Try a title such as Arrival, The Bear, Casablanca, or Spider-Man."
          />
        )}
        {status === 'error' && (
          <ErrorState
            title="Search unavailable"
            message={error?.message ?? 'Unable to search right now.'}
            onRetry={retry}
          />
        )}
        {status === 'empty' && (
          <EmptyState
            title="No results found"
            message={`We couldn't find a movie or series matching “${query}”. Check the spelling or try another title.`}
          />
        )}
        {status === 'success' && movies.length > 0 && (
          <section aria-labelledby="results-title">
            <div className="results-summary">
              <h2 id="results-title">Results for “{query}”</h2>
              <p>{totalResults.toLocaleString()} {totalResults === 1 ? 'title' : 'titles'} found</p>
            </div>
            <MovieGrid movies={[...movies]} label={`Search results for ${query}`} />
          </section>
        )}
      </div>
    </div>
  )
}
