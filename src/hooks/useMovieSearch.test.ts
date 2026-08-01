import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearOmdbCache } from '../services/omdbService'
import { useMovieSearch } from './useMovieSearch'

function jsonResponse(payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('useMovieSearch', () => {
  const fetchMock = vi.fn<typeof fetch>()

  beforeEach(() => {
    clearOmdbCache()
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
    vi.stubEnv('VITE_OMDB_API_KEY', 'test-api-key')
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('does not request a blank query', () => {
    const { result } = renderHook(() => useMovieSearch('   '))

    expect(result.current.status).toBe('idle')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('reports normalized successful results', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        Response: 'True',
        totalResults: '1',
        Search: [
          {
            imdbID: 'tt0372784',
            Title: 'Batman Begins',
            Year: '2005',
            Type: 'movie',
            Poster: 'N/A',
          },
        ],
      }),
    )

    const { result } = renderHook(() => useMovieSearch('Batman'))

    expect(result.current.isLoading).toBe(true)
    await waitFor(() => expect(result.current.status).toBe('success'))
    expect(result.current.movies[0]?.title).toBe('Batman Begins')
    expect(result.current.totalResults).toBe(1)
  })

  it('aborts its active request when unmounted', () => {
    let requestSignal: AbortSignal | null = null
    fetchMock.mockImplementation((_input, init) => {
      requestSignal = init?.signal ?? null
      return new Promise<Response>(() => undefined)
    })

    const { unmount } = renderHook(() => useMovieSearch('Batman'))
    expect((requestSignal as AbortSignal | null)?.aborted).toBe(false)

    unmount()
    expect((requestSignal as AbortSignal | null)?.aborted).toBe(true)
  })
})
