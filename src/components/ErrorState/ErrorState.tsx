interface ErrorStateProps {
  title?: string
  message: string
  onRetry?: () => void
  compact?: boolean
  headingLevel?: 'h1' | 'h2'
}

export function ErrorState({
  title = 'Something interrupted the reel',
  message,
  onRetry,
  compact = false,
  headingLevel = 'h2',
}: ErrorStateProps) {
  const Heading = headingLevel

  return (
    <section
      className={`state-card state-card--error${compact ? ' state-card--compact' : ''}`}
      role="alert"
    >
      <span className="state-card__symbol" aria-hidden="true">
        !
      </span>
      <div>
        <Heading>{title}</Heading>
        <p>{message}</p>
      </div>
      {onRetry && (
        <button className="button button--ghost" type="button" onClick={onRetry}>
          Try again
        </button>
      )}
    </section>
  )
}
