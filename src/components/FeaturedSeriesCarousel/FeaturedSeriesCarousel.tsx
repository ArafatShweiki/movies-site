import {
  useEffect,
  useId,
  useRef,
  useState,
  type FocusEvent,
  type TouchEvent,
} from 'react'
import type { FeaturedSeriesSlide as FeaturedSeriesSlideData } from '../../types/movie'
import { EmptyState } from '../EmptyState/EmptyState'
import { ErrorState } from '../ErrorState/ErrorState'
import { FeaturedSeriesSlide } from './FeaturedSeriesSlide'
import './FeaturedSeriesCarousel.css'

const AUTO_ADVANCE_MS = 7_500
const SWIPE_THRESHOLD_PX = 48

interface FeaturedSeriesCarouselProps {
  readonly error?: string | null
  readonly loading?: boolean
  readonly onRetry?: () => void
  readonly series: readonly FeaturedSeriesSlideData[]
}

function usePrefersReducedMotion() {
  const [reducedMotion, setReducedMotion] = useState(() =>
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false,
  )

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return undefined

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const updatePreference = () => setReducedMotion(mediaQuery.matches)
    mediaQuery.addEventListener('change', updatePreference)
    return () => mediaQuery.removeEventListener('change', updatePreference)
  }, [])

  return reducedMotion
}

export function FeaturedSeriesCarousel({
  error = null,
  loading = false,
  onRetry,
  series,
}: FeaturedSeriesCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [hovered, setHovered] = useState(false)
  const [focusWithin, setFocusWithin] = useState(false)
  const [autoAdvanceEnabled, setAutoAdvanceEnabled] = useState(true)
  const [announcement, setAnnouncement] = useState('')
  const touchStartX = useRef<number | null>(null)
  const headingId = useId()
  const reducedMotion = usePrefersReducedMotion()
  const slideCount = series.length
  const visibleIndex = slideCount > 0
    ? Math.min(activeIndex, slideCount - 1)
    : 0

  useEffect(() => {
    if (
      reducedMotion ||
      !autoAdvanceEnabled ||
      hovered ||
      focusWithin ||
      slideCount < 2
    ) {
      return undefined
    }

    const timer = window.setTimeout(() => {
      setAnnouncement('')
      setActiveIndex((visibleIndex + 1) % slideCount)
    }, AUTO_ADVANCE_MS)

    return () => window.clearTimeout(timer)
  }, [autoAdvanceEnabled, focusWithin, hovered, reducedMotion, slideCount, visibleIndex])

  function selectSlide(nextIndex: number) {
    if (slideCount === 0) return
    const normalizedIndex = (nextIndex + slideCount) % slideCount
    setActiveIndex(normalizedIndex)
    setAnnouncement(
      `${series[normalizedIndex]?.title ?? 'Series'}, slide ${normalizedIndex + 1} of ${slideCount}.`,
    )
  }

  function handleBlur(event: FocusEvent<HTMLElement>) {
    if (!event.currentTarget.contains(event.relatedTarget)) {
      setFocusWithin(false)
    }
  }

  function handleTouchStart(event: TouchEvent<HTMLElement>) {
    touchStartX.current = event.touches[0]?.clientX ?? null
  }

  function handleTouchEnd(event: TouchEvent<HTMLElement>) {
    const startX = touchStartX.current
    const endX = event.changedTouches[0]?.clientX
    touchStartX.current = null
    if (startX === null || endX === undefined) return

    const distance = endX - startX
    if (Math.abs(distance) < SWIPE_THRESHOLD_PX) return
    selectSlide(distance < 0 ? visibleIndex + 1 : visibleIndex - 1)
  }

  if (loading) {
    return (
      <section className="featured-series featured-series--state page-width" aria-label="Featured series">
        <div className="featured-series__skeleton" role="status">
          <span className="visually-hidden">Loading featured series…</span>
          <span className="skeleton-block featured-series__skeleton-poster" />
          <span className="skeleton-block featured-series__skeleton-title" />
          <span className="skeleton-block featured-series__skeleton-copy" />
        </div>
      </section>
    )
  }

  if (error) {
    return (
      <section className="featured-series featured-series--state page-width" aria-label="Featured series">
        <ErrorState
          title="Featured series are unavailable"
          message={error}
          onRetry={onRetry}
          compact
        />
      </section>
    )
  }

  if (slideCount === 0) {
    return (
      <section className="featured-series featured-series--state page-width" aria-label="Featured series">
        <EmptyState
          title="No featured series yet"
          message="We could not find enough series with complete artwork and descriptions."
        />
      </section>
    )
  }

  return (
    <section
      className="featured-series page-width"
      aria-labelledby={headingId}
      aria-roledescription="carousel"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setFocusWithin(true)}
      onBlurCapture={handleBlur}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="featured-series__heading">
        <div>
          <p className="eyebrow">Television, in focus</p>
          <h2 id={headingId}>Featured series</h2>
        </div>
        <p>Character-rich worlds selected for a longer stay.</p>
      </div>

      <div className="featured-series__viewport">
        <div
          className="featured-series__track"
          style={{ transform: `translateX(-${visibleIndex * 100}%)` }}
        >
          {series.map((item, index) => (
            <FeaturedSeriesSlide
              key={item.imdbID}
              active={index === visibleIndex}
              index={index}
              series={item}
              total={slideCount}
            />
          ))}
        </div>
      </div>

      <div className="featured-series__controls">
        <button
          className="featured-series__arrow"
          type="button"
          onClick={() => selectSlide(visibleIndex - 1)}
          disabled={slideCount < 2}
          aria-label="Show previous featured series"
        >
          <span aria-hidden="true">←</span>
        </button>
        <div className="featured-series__indicators" aria-label="Choose featured series">
          {series.map((item, index) => (
            <button
              key={item.imdbID}
              type="button"
              aria-label={`Show ${item.title}`}
              aria-current={index === visibleIndex ? 'true' : undefined}
              onClick={() => selectSlide(index)}
            >
              <span aria-hidden="true" />
            </button>
          ))}
        </div>
        <button
          className="featured-series__arrow"
          type="button"
          onClick={() => selectSlide(visibleIndex + 1)}
          disabled={slideCount < 2}
          aria-label="Show next featured series"
        >
          <span aria-hidden="true">→</span>
        </button>
        {reducedMotion ? (
          <span className="featured-series__motion-note">Auto-play off</span>
        ) : (
          <button
            className="featured-series__autoplay"
            type="button"
            aria-label={autoAdvanceEnabled
              ? 'Pause automatic slide rotation'
              : 'Resume automatic slide rotation'}
            onClick={() => {
              setAutoAdvanceEnabled((enabled) => !enabled)
              setAnnouncement(
                autoAdvanceEnabled
                  ? 'Automatic slide rotation paused.'
                  : 'Automatic slide rotation resumed.',
              )
            }}
          >
            <span aria-hidden="true">{autoAdvanceEnabled ? 'Ⅱ' : '▶'}</span>
            <span>{autoAdvanceEnabled ? 'Pause' : 'Resume'}</span>
          </button>
        )}
      </div>
      <p className="visually-hidden" aria-live="polite">{announcement}</p>
    </section>
  )
}
