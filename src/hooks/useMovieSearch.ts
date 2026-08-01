import { useCallback, useEffect, useState } from 'react'
import {
  isAbortError,
  isOmdbError,
  OmdbError,
  searchMovies,
} from '../services/omdbService'
import type { MovieSummary, SearchableMovieType } from '../types/movie'

export type MovieSearchStatus =
  | 'idle'
  | 'loading'
  | 'success'
  | 'empty'
  | 'error'

export interface UseMovieSearchOptions {
  readonly enabled?: boolean
  readonly page?: number
  readonly type?: SearchableMovieType
}

export interface UseMovieSearchResult {
  readonly movies: readonly MovieSummary[]
  readonly totalResults: number
  readonly status: MovieSearchStatus
  readonly error: OmdbError | null
  readonly isLoading: boolean
  readonly retry: () => void
}

interface SearchState {
  readonly requestKey: string | null
  readonly movies: readonly MovieSummary[]
  readonly totalResults: number
  readonly status: MovieSearchStatus
  readonly error: OmdbError | null
}

const initialState: SearchState = {
  requestKey: null,
  movies: [],
  totalResults: 0,
  status: 'idle',
  error: null,
}

export function useMovieSearch(
  query: string,
  options: UseMovieSearchOptions = {},
): UseMovieSearchResult {
  const { enabled = true, page = 1, type } = options
  const [state, setState] = useState<SearchState>(initialState)
  const [requestAttempt, setRequestAttempt] = useState(0)

  const normalizedQuery = query.trim()
  const requestKey =
    enabled && normalizedQuery
      ? `${normalizedQuery.toLocaleLowerCase()}|${page}|${type ?? 'all'}|${requestAttempt}`
      : null

  const retry = useCallback(() => {
    setRequestAttempt((attempt) => attempt + 1)
  }, [])

  useEffect(() => {
    if (!requestKey) {
      return undefined
    }

    const controller = new AbortController()
    let isCurrentRequest = true

    void searchMovies(normalizedQuery, {
      page,
      type,
      signal: controller.signal,
    })
      .then((result) => {
        if (!isCurrentRequest) {
          return
        }

        setState({
          requestKey,
          movies: result.movies,
          totalResults: result.totalResults,
          status: result.movies.length > 0 ? 'success' : 'empty',
          error: null,
        })
      })
      .catch((error: unknown) => {
        if (!isCurrentRequest || isAbortError(error)) {
          return
        }

        const searchError = isOmdbError(error)
          ? error
          : new OmdbError(
              'INVALID_RESPONSE',
              'The search could not be completed. Please try again.',
              { retryable: true, cause: error },
            )

        setState({
          requestKey,
          movies: [],
          totalResults: 0,
          status: 'error',
          error: searchError,
        })
      })

    return () => {
      isCurrentRequest = false
      controller.abort()
    }
  }, [normalizedQuery, page, requestKey, type])

  if (!requestKey) {
    return {
      movies: initialState.movies,
      totalResults: initialState.totalResults,
      status: 'idle',
      error: null,
      isLoading: false,
      retry,
    }
  }

  if (state.requestKey !== requestKey) {
    return {
      movies: [],
      totalResults: 0,
      status: 'loading',
      error: null,
      isLoading: true,
      retry,
    }
  }

  return {
    ...state,
    isLoading: state.status === 'loading',
    retry,
  }
}
