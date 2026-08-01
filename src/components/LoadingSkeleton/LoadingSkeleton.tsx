interface CardSkeletonsProps {
  count?: number
  ranked?: boolean
}

export function CardSkeletons({ count = 6, ranked = false }: CardSkeletonsProps) {
  return (
    <div className={`skeleton-row${ranked ? ' skeleton-row--ranked' : ''}`} aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <div className="skeleton-card" key={index}>
          {ranked && <span className="skeleton-rank" />}
          <span className="skeleton-block skeleton-card__poster" />
          <span className="skeleton-block skeleton-card__title" />
          <span className="skeleton-block skeleton-card__meta" />
        </div>
      ))}
    </div>
  )
}

export function HeroSkeleton() {
  return (
    <section className="hero hero--skeleton" aria-label="Loading featured title">
      <div className="hero__content">
        <span className="skeleton-block hero-skeleton__eyebrow" />
        <span className="skeleton-block hero-skeleton__title" />
        <span className="skeleton-block hero-skeleton__meta" />
        <span className="skeleton-block hero-skeleton__copy" />
        <span className="skeleton-block hero-skeleton__copy hero-skeleton__copy--short" />
      </div>
    </section>
  )
}

export function DetailsSkeleton() {
  return (
    <div
      className="details-skeleton"
      role="status"
      aria-label="Loading title details"
    >
      <span className="visually-hidden">Loading title details…</span>
      <span className="skeleton-block details-skeleton__poster" />
      <div>
        <span className="skeleton-block details-skeleton__title" />
        <span className="skeleton-block details-skeleton__meta" />
        <span className="skeleton-block details-skeleton__copy" />
        <span className="skeleton-block details-skeleton__copy" />
        <span className="skeleton-block details-skeleton__copy details-skeleton__copy--short" />
      </div>
    </div>
  )
}
