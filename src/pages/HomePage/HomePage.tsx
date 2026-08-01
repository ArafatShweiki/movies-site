import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { EmptyState } from '../../components/EmptyState/EmptyState'
import { ErrorState } from '../../components/ErrorState/ErrorState'
import { HeroBanner } from '../../components/HeroBanner/HeroBanner'
import { CardSkeletons, HeroSkeleton } from '../../components/LoadingSkeleton/LoadingSkeleton'
import { MovieRow } from '../../components/MovieRow/MovieRow'
import { RankedMovieRow } from '../../components/RankedMovieRow/RankedMovieRow'
import {
  DEFAULT_CURATED_COLLECTIONS,
  getMovieDetails,
  loadCuratedCollections,
  type CuratedMovieCollection,
} from '../../services/omdbService'
import type { MovieDetails } from '../../types/movie'
import { deduplicateMovies } from '../../utils/movieHelpers'
import { readableError } from '../../utils/validation'

const COLLECTION_DESCRIPTIONS: Record<string, string> = {
  featured: 'A rotating shelf of enduring blockbusters and bold crowd-pleasers.',
  action: 'Kinetic missions, daring escapes, and heroes under pressure.',
  'science-fiction': 'Visions of distant galaxies, strange futures, and the unknown.',
  series: 'Character-rich television worlds worth settling into.',
  comedy: 'Warm, sharp, and wonderfully chaotic picks for a lighter night.',
  animation: 'Inventive worlds shaped one frame at a time.',
}

function HomeLoadingState() {
  return (
    <div className="home-loading" role="status">
      <span className="visually-hidden">Loading curated movie collections…</span>
      <HeroSkeleton />
      <div className="page-width home-loading__rows">
        {[0, 1, 2].map((row) => (
          <section key={row} className="movie-section" aria-label="Loading collection">
            <span className="skeleton-block home-loading__heading" />
            <CardSkeletons />
          </section>
        ))}
      </div>
    </div>
  )
}

export default function HomePage() {
  const [collections, setCollections] = useState<readonly CuratedMovieCollection[]>([])
  const [heroDetailsState, setHeroDetailsState] = useState<{
    imdbID: string
    details: MovieDetails
  } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [hasPartialFailure, setHasPartialFailure] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    let isActive = true

    void loadCuratedCollections(undefined, { signal: controller.signal })
      .then((result) => {
        if (!isActive || controller.signal.aborted) return
        setCollections(result)
        setHasPartialFailure(result.length < DEFAULT_CURATED_COLLECTIONS.length)
      })
      .catch((requestError: unknown) => {
        if (isActive && !controller.signal.aborted) {
          setCollections([])
          setError(readableError(requestError, 'Unable to open the curated catalogue.'))
        }
      })
      .finally(() => {
        if (isActive && !controller.signal.aborted) setIsLoading(false)
      })

    return () => {
      isActive = false
      controller.abort()
    }
  }, [attempt])

  const allMovies = useMemo(
    () => deduplicateMovies(collections.flatMap((collection) => collection.movies)),
    [collections],
  )
  const heroMovie = collections[0]?.movies[0] ?? allMovies[0] ?? null
  const heroDetails = heroDetailsState && heroMovie && heroDetailsState.imdbID === heroMovie.imdbID
    ? heroDetailsState.details
    : null
  const rankedCollection = collections.find((collection) => collection.id === 'top-ten')
  const rankedMovies = deduplicateMovies([
    ...(rankedCollection?.movies ?? []),
    ...allMovies,
  ]).slice(0, 10)
  const standardCollections = collections.filter((collection) => collection.id !== 'top-ten')

  useEffect(() => {
    if (!heroMovie) return

    const controller = new AbortController()
    let isActive = true
    void getMovieDetails(heroMovie.imdbID, { signal: controller.signal })
      .then((details) => {
        if (isActive && !controller.signal.aborted) {
          setHeroDetailsState({ imdbID: heroMovie.imdbID, details })
        }
      })
      .catch(() => {
        // Summary data still provides a complete, useful hero if details fail.
      })

    return () => {
      isActive = false
      controller.abort()
    }
  }, [heroMovie])

  if (isLoading) return <HomeLoadingState />

  if (error) {
    return (
      <div className="standard-page page-width">
        <ErrorState
          headingLevel="h1"
          title="The catalogue could not be loaded"
          message={error}
          onRetry={() => {
            setIsLoading(true)
            setError('')
            setHasPartialFailure(false)
            setAttempt((current) => current + 1)
          }}
        />
        <p className="configuration-hint">
          If this is your first visit, copy <code>.env.example</code> to <code>.env</code> and add your OMDb API key.
        </p>
      </div>
    )
  }

  if (!heroMovie || !allMovies.length) {
    return (
      <div className="standard-page page-width">
        <EmptyState
          headingLevel="h1"
          title="The shelves are quiet"
          message="No titles were returned for the curated collections. Try again or search for a specific story."
          action={<Link className="button button--accent" to="/search">Search the catalogue</Link>}
        />
      </div>
    )
  }

  return (
    <div className="home-page">
      <HeroBanner movie={heroMovie} details={heroDetails} />
      <div className="page-width discovery-sections">
        <div className="curation-note">
          <span aria-hidden="true">✦</span>
          <p><strong>Chosen, not charted.</strong> These shelves are curated from themed OMDb searches and do not represent live trends.</p>
        </div>
        {hasPartialFailure && (
          <div className="partial-notice" role="status">
            <span>Some curated shelves could not be loaded.</span>
            <button
              className="button button--text"
              type="button"
              onClick={() => {
                setIsLoading(true)
                setHasPartialFailure(false)
                setAttempt((current) => current + 1)
              }}
            >
              Retry all shelves
            </button>
          </div>
        )}
        {standardCollections.map((collection) => (
          <MovieRow
            key={collection.id}
            id={collection.id}
            title={collection.title}
            description={COLLECTION_DESCRIPTIONS[collection.id]}
            movies={[...collection.movies]}
          />
        ))}
        <RankedMovieRow movies={[...rankedMovies]} />
      </div>
    </div>
  )
}
