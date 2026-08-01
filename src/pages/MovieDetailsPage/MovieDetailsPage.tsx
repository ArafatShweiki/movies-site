import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ErrorState } from '../../components/ErrorState/ErrorState'
import { FavouriteButton } from '../../components/FavouriteButton/FavouriteButton'
import { DetailsSkeleton } from '../../components/LoadingSkeleton/LoadingSkeleton'
import { PosterArtwork } from '../../components/PosterArtwork/PosterArtwork'
import { getMovieDetails, OmdbError } from '../../services/omdbService'
import type { MovieDetails } from '../../types/movie'
import { formatMovieType, isValidImdbId } from '../../utils/movieHelpers'
import { readableError } from '../../utils/validation'

type DetailsRequestState =
  | { imdbID: string; status: 'loading' }
  | { imdbID: string; status: 'success'; movie: MovieDetails }
  | { imdbID: string; status: 'not-found' }
  | { imdbID: string; status: 'error'; message: string }

interface DetailItemProps {
  label: string
  value: string | readonly string[] | null
}

function DetailItem({ label, value }: DetailItemProps) {
  const displayValue = Array.isArray(value) ? value.join(', ') : value
  if (!displayValue) return null

  return (
    <div className="detail-item">
      <dt>{label}</dt>
      <dd>{displayValue}</dd>
    </div>
  )
}

export default function MovieDetailsPage() {
  const { imdbID = '' } = useParams()
  const navigate = useNavigate()
  const [requestState, setRequestState] = useState<DetailsRequestState>({
    imdbID,
    status: 'loading',
  })
  const [attempt, setAttempt] = useState(0)
  const validId = isValidImdbId(imdbID)
  const currentState: DetailsRequestState = requestState.imdbID === imdbID
    ? requestState
    : { imdbID, status: 'loading' }

  function loadMovie() {
    setRequestState({ imdbID, status: 'loading' })
    setAttempt((current) => current + 1)
  }

  useEffect(() => {
    if (!validId) return

    const controller = new AbortController()
    let isActive = true

    void getMovieDetails(imdbID, { signal: controller.signal })
      .then((movie) => {
        if (isActive && !controller.signal.aborted) {
          setRequestState({ imdbID, status: 'success', movie })
        }
      })
      .catch((requestError: unknown) => {
        if (!isActive || controller.signal.aborted) return
        if (requestError instanceof OmdbError && requestError.code === 'NOT_FOUND') {
          setRequestState({ imdbID, status: 'not-found' })
          return
        }
        setRequestState({
          imdbID,
          status: 'error',
          message: readableError(requestError, 'Unable to load this title right now.'),
        })
      })

    return () => {
      isActive = false
      controller.abort()
    }
  }, [attempt, imdbID, validId])

  function goBack() {
    if (window.history.length > 1) navigate(-1)
    else navigate('/')
  }

  if (!validId) {
    return (
      <div className="standard-page page-width">
        <ErrorState
          headingLevel="h1"
          title="That title ID is not valid"
          message="ReelVault uses IMDb title IDs such as tt0133093. Check the link and try again."
        />
        <Link className="button button--ghost" to="/">Browse titles</Link>
      </div>
    )
  }

  if (currentState.status === 'loading') {
    return <div className="details-page page-width"><DetailsSkeleton /></div>
  }

  if (currentState.status === 'not-found') {
    return (
      <div className="standard-page page-width">
        <ErrorState
          headingLevel="h1"
          title="Title not found"
          message="OMDb could not find a movie or series for this IMDb ID."
          onRetry={loadMovie}
        />
      </div>
    )
  }

  if (currentState.status === 'error') {
    return (
      <div className="standard-page page-width">
        <ErrorState
          headingLevel="h1"
          message={currentState.message}
          onRetry={loadMovie}
        />
      </div>
    )
  }

  const { movie } = currentState

  return (
    <article className="details-page">
      <header className="details-hero">
        {movie.poster && (
          <div
            className="details-hero__backdrop"
            style={{ backgroundImage: `url("${movie.poster.replaceAll('"', '%22')}")` }}
            aria-hidden="true"
          />
        )}
        <div className="details-hero__veil" aria-hidden="true" />
        <div className="details-hero__inner page-width">
          <button className="back-button" type="button" onClick={goBack}>
            <span aria-hidden="true">←</span> Back
          </button>
          <div className="details-hero__layout">
            <div className="details-poster-wrap">
              <PosterArtwork
                className="details-poster"
                poster={movie.poster}
                title={movie.title}
                eager
              />
            </div>
            <div className="details-hero__copy">
              <p className="eyebrow">{formatMovieType(movie.type)}</p>
              <h1>{movie.title}</h1>
              <div className="details-hero__meta">
                {movie.year && <span>{movie.year}</span>}
                {movie.contentRating && <span>{movie.contentRating}</span>}
                {movie.runtime && <span>{movie.runtime}</span>}
                {movie.genres.map((genre) => <span key={genre}>{genre}</span>)}
              </div>
              {movie.imdbRating && (
                <p className="details-rating"><span aria-hidden="true">★</span> <strong>{movie.imdbRating}</strong><span>/10 IMDb</span></p>
              )}
              {movie.plot && <p className="details-plot">{movie.plot}</p>}
              <FavouriteButton movie={movie} showLabel />
            </div>
          </div>
        </div>
      </header>
      <div className="details-content page-width">
        <section aria-labelledby="credits-title">
          <div className="section-heading section-heading--compact">
            <div><p className="eyebrow">Behind the story</p><h2 id="credits-title">Credits & details</h2></div>
          </div>
          <dl className="details-list">
            <DetailItem label="Director" value={movie.directors} />
            <DetailItem label="Writer" value={movie.writers} />
            <DetailItem label="Cast" value={movie.actors} />
            <DetailItem label="Language" value={movie.languages} />
            <DetailItem label="Country" value={movie.countries} />
            <DetailItem label="Awards" value={movie.awards} />
            <DetailItem label="Released" value={movie.released} />
            <DetailItem label="Seasons" value={movie.totalSeasons} />
          </dl>
        </section>
        {movie.ratings.length > 0 && (
          <section aria-labelledby="ratings-title">
            <div className="section-heading section-heading--compact">
              <div><p className="eyebrow">At a glance</p><h2 id="ratings-title">Available ratings</h2></div>
            </div>
            <div className="ratings-grid">
              {movie.ratings.map((rating) => (
                <div className="rating-card" key={rating.source}>
                  <span>{rating.source}</span>
                  <strong>{rating.value}</strong>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </article>
  )
}
