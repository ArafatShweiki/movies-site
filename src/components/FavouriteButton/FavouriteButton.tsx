import { MouseEvent, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useFavourites } from '../../hooks/useFavourites'
import type { MovieSummary } from '../../types/movie'

interface FavouriteButtonProps {
  movie: MovieSummary
  showLabel?: boolean
  className?: string
}

export function FavouriteButton({
  movie,
  showLabel = false,
  className = '',
}: FavouriteButtonProps) {
  const { user } = useAuth()
  const { isFavourite, toggleFavourite, pendingIds } = useFavourites()
  const [announcement, setAnnouncement] = useState('')
  const navigate = useNavigate()
  const location = useLocation()
  const saved = isFavourite(movie.imdbID)
  const pending = pendingIds.has(movie.imdbID)
  const label = pending
    ? 'Updating favourite'
    : saved
      ? 'Remove from favourites'
      : 'Add to favourites'

  async function handleClick(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault()
    event.stopPropagation()

    if (!user) {
      navigate('/auth', {
        state: {
          from: `${location.pathname}${location.search}`,
          message: 'Sign in to save titles to your personal vault.',
        },
      })
      return
    }

    try {
      await toggleFavourite(movie)
      setAnnouncement(saved ? `${movie.title} removed.` : `${movie.title} saved.`)
    } catch {
      setAnnouncement(`Could not update ${movie.title}.`)
    }
  }

  return (
    <>
      <button
        className={`favourite-button${saved ? ' favourite-button--active' : ''}${showLabel ? ' favourite-button--labelled' : ''} ${className}`.trim()}
        type="button"
        onClick={handleClick}
        aria-label={`${label}: ${movie.title}`}
        aria-pressed={saved}
        disabled={pending}
      >
        <span aria-hidden="true">{saved ? '♥' : '♡'}</span>
        {showLabel && <span>{pending ? 'Updating…' : saved ? 'Saved' : 'Add to favourites'}</span>}
      </button>
      <span className="visually-hidden" aria-live="polite">
        {announcement}
      </span>
    </>
  )
}
