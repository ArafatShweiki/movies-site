import { FormEvent, useId, useState } from 'react'

interface SearchFormProps {
  initialQuery?: string
  isLoading?: boolean
  compact?: boolean
  autoFocus?: boolean
  onSearch: (query: string) => void
  onClear?: () => void
}

export function SearchForm({
  initialQuery = '',
  isLoading = false,
  compact = false,
  autoFocus = false,
  onSearch,
  onClear,
}: SearchFormProps) {
  const [query, setQuery] = useState(initialQuery)
  const [error, setError] = useState('')
  const inputId = useId()
  const errorId = `${inputId}-error`

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmedQuery = query.trim()

    if (!trimmedQuery) {
      setError('Enter a movie or series title.')
      return
    }

    setError('')
    onSearch(trimmedQuery)
  }

  function handleClear() {
    setQuery('')
    setError('')
    onClear?.()
  }

  return (
    <form
      className={`search-form${compact ? ' search-form--compact' : ''}`}
      role="search"
      onSubmit={handleSubmit}
      noValidate
    >
      <label
        className={compact ? 'visually-hidden' : 'search-form__label'}
        htmlFor={inputId}
      >
        Search movies and series
      </label>
      <div className="search-form__control">
        <span className="search-form__icon" aria-hidden="true">
          ⌕
        </span>
        <input
          id={inputId}
          type="search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
            if (error) setError('')
          }}
          placeholder="Search titles…"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          autoComplete="off"
          autoFocus={autoFocus}
        />
        {(query || initialQuery) && (
          <button
            className="search-form__clear"
            type="button"
            onClick={handleClear}
            aria-label="Clear search"
          >
            ×
          </button>
        )}
        <button
          className="button button--accent search-form__submit"
          type="submit"
          disabled={isLoading}
        >
          {isLoading ? 'Searching…' : compact ? 'Search' : 'Find titles'}
        </button>
      </div>
      {error && (
        <p className="field-error" id={errorId} role="alert">
          {error}
        </p>
      )}
    </form>
  )
}
