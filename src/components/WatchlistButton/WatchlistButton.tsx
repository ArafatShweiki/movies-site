import { useState, type MouseEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useWatchlist } from '../../hooks/useWatchlist'
import type { MovieSummary } from '../../types/movie'

interface WatchlistButtonProps {
  movie: MovieSummary
  showLabel?: boolean
  className?: string
}

function BookmarkIcon({ saved }: { saved: boolean }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      height="18"
      viewBox="0 0 20 24"
      width="15"
    >
      <path
        d="M3 2.5h14v18l-7-4.2-7 4.2v-18Z"
        fill={saved ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  )
}

export function WatchlistButton({
  movie,
  showLabel = false,
  className = '',
}: WatchlistButtonProps) {
  const { user } = useAuth()
  const { isWatchlisted, toggleWatchlist, pendingIds } = useWatchlist()
  const [announcement, setAnnouncement] = useState('')
  const navigate = useNavigate()
  const location = useLocation()
  const saved = isWatchlisted(movie.imdbID)
  const pending = pendingIds.has(movie.imdbID)
  const actionLabel = pending
    ? 'Updating watchlist'
    : saved
      ? 'Remove from watchlist'
      : 'Add to watchlist'

  async function handleClick(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault()
    event.stopPropagation()

    if (!user) {
      navigate('/auth', {
        state: {
          from: `${location.pathname}${location.search}${location.hash}`,
          message: 'Sign in to add titles to your watchlist.',
        },
      })
      return
    }

    try {
      await toggleWatchlist(movie)
      setAnnouncement(
        saved
          ? `${movie.title} removed from your watchlist.`
          : `${movie.title} added to your watchlist.`,
      )
    } catch {
      setAnnouncement(`Could not update ${movie.title} in your watchlist.`)
    }
  }

  return (
    <>
      <button
        aria-busy={pending}
        aria-label={`${actionLabel}: ${movie.title}`}
        aria-pressed={saved}
        className={`favourite-button watchlist-button${saved ? ' favourite-button--active watchlist-button--active' : ''}${showLabel ? ' favourite-button--labelled watchlist-button--labelled' : ''} ${className}`.trim()}
        disabled={pending}
        onClick={handleClick}
        type="button"
      >
        <BookmarkIcon saved={saved} />
        {showLabel && (
          <span>{pending ? 'Updating…' : saved ? 'In watchlist' : 'Add to watchlist'}</span>
        )}
      </button>
      <span className="visually-hidden" aria-live="polite">
        {announcement}
      </span>
    </>
  )
}
