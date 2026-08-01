import { useState } from 'react'

interface PosterArtworkProps {
  poster: string | null
  title: string
  eager?: boolean
  className?: string
}

export function PosterArtwork({
  poster,
  title,
  eager = false,
  className = '',
}: PosterArtworkProps) {
  const [failedPoster, setFailedPoster] = useState<string | null>(null)
  const failed = Boolean(poster && failedPoster === poster)

  if (!poster || failed) {
    return (
      <div
        className={`poster-fallback ${className}`.trim()}
        role="img"
        aria-label={`No poster available for ${title}`}
      >
        <span className="poster-fallback__mark" aria-hidden="true">
          SX
        </span>
        <span>Artwork unavailable</span>
      </div>
    )
  }

  return (
    <img
      className={className}
      src={poster}
      alt={`${title} poster`}
      loading={eager ? 'eager' : 'lazy'}
      fetchPriority={eager ? 'high' : 'auto'}
      onError={() => setFailedPoster(poster)}
    />
  )
}
