import { Link } from 'react-router-dom'
import type { FeaturedSeriesSlide as FeaturedSeriesSlideData } from '../../types/movie'
import { FavouriteButton } from '../FavouriteButton/FavouriteButton'
import { PosterArtwork } from '../PosterArtwork/PosterArtwork'
import { WatchlistButton } from '../WatchlistButton/WatchlistButton'

interface FeaturedSeriesSlideProps {
  readonly active: boolean
  readonly index: number
  readonly series: FeaturedSeriesSlideData
  readonly total: number
}

export function FeaturedSeriesSlide({
  active,
  index,
  series,
  total,
}: FeaturedSeriesSlideProps) {
  const safePoster = series.poster.replaceAll('"', '%22')

  return (
    <article
      className="featured-series-slide"
      aria-hidden={!active}
      aria-label={`${index + 1} of ${total}: ${series.title}`}
      aria-roledescription="slide"
      inert={!active}
    >
      <div
        className="featured-series-slide__backdrop"
        style={{ backgroundImage: `url("${safePoster}")` }}
        aria-hidden="true"
      />
      <div className="featured-series-slide__veil" aria-hidden="true" />
      <div className="featured-series-slide__inner">
        <div className="featured-series-slide__poster-wrap">
          <PosterArtwork
            className="featured-series-slide__poster"
            poster={series.poster}
            title={series.title}
            eager={active}
          />
        </div>
        <div className="featured-series-slide__copy">
          <p className="eyebrow">Strex series feature</p>
          <h3>{series.title}</h3>
          <div className="featured-series-slide__meta" aria-label="Series information">
            {series.year && <span>{series.year}</span>}
            {series.genres.length > 0 && <span>{series.genres.slice(0, 3).join(' · ')}</span>}
            {series.imdbRating && (
              <span className="rating-pill">
                <span aria-hidden="true">★</span> {series.imdbRating} IMDb
              </span>
            )}
          </div>
          <p className="featured-series-slide__plot">{series.plot}</p>
          <div className="featured-series-slide__actions">
            <Link className="button button--accent" to={`/movie/${series.imdbID}`}>
              View details <span aria-hidden="true">→</span>
            </Link>
            <FavouriteButton movie={series} showLabel />
            <WatchlistButton movie={series} showLabel />
          </div>
        </div>
      </div>
    </article>
  )
}
