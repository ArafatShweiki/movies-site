import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  clearOmdbCache,
  getMovieDetails,
  isAbortError,
  loadCuratedCollections,
  searchMovies,
} from './omdbService'

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('OMDb service', () => {
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

  it('rejects a blank search without making a request', async () => {
    await expect(searchMovies('   ')).rejects.toMatchObject({
      code: 'INVALID_REQUEST',
    })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('reports a useful configuration error before making a request', async () => {
    vi.stubEnv('VITE_OMDB_API_KEY', '')

    await expect(searchMovies('Batman')).rejects.toMatchObject({
      code: 'CONFIG',
      message: expect.stringContaining('VITE_OMDB_API_KEY'),
    })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('normalizes, deduplicates, and caches successful searches', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        Response: 'True',
        totalResults: '2',
        Search: [
          {
            imdbID: 'tt0372784',
            Title: 'Batman Begins',
            Year: '2005',
            Type: 'movie',
            Poster: 'N/A',
          },
          {
            imdbID: 'tt0372784',
            Title: 'Batman Begins duplicate',
            Year: '2005',
            Type: 'movie',
            Poster: 'N/A',
          },
        ],
      }),
    )

    const firstResult = await searchMovies('  Batman  ')
    const secondResult = await searchMovies('batman')

    expect(firstResult.movies).toHaveLength(1)
    expect(firstResult.movies[0]).toMatchObject({
      title: 'Batman Begins',
      poster: null,
    })
    expect(secondResult).toBe(firstResult)
    expect(fetchMock).toHaveBeenCalledTimes(1)

    const firstUrl = fetchMock.mock.calls[0]?.[0]
    expect(String(firstUrl)).toContain('s=Batman')
    expect(String(firstUrl)).toContain('apikey=test-api-key')
  })

  it('turns a normal no-results response into an empty result', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ Response: 'False', Error: 'Movie not found!' }),
    )

    await expect(searchMovies('an impossible title')).resolves.toMatchObject({
      movies: [],
      totalResults: 0,
    })
  })

  it('turns OMDb API failures into typed errors', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ Response: 'False', Error: 'Request limit reached!' }),
    )

    await expect(searchMovies('Batman')).rejects.toMatchObject({
      code: 'API',
      retryable: true,
    })
  })

  it('normalizes and caches complete title details', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        Response: 'True',
        imdbID: 'tt0372784',
        Title: 'Batman Begins',
        Year: '2005',
        Type: 'movie',
        Poster: 'N/A',
        Rated: 'PG-13',
        Runtime: '140 min',
        Genre: 'Action, Drama',
        Director: 'Christopher Nolan',
        Writer: 'N/A',
        Actors: 'Christian Bale, Michael Caine',
        Plot: 'A hero finds his purpose.',
        Language: 'English',
        Country: 'United Kingdom, United States',
        Awards: 'N/A',
        imdbRating: '8.2',
        Ratings: [{ Source: 'Metacritic', Value: '70/100' }],
        Released: '15 Jun 2005',
        totalSeasons: 'N/A',
      }),
    )

    const firstResult = await getMovieDetails('tt0372784')
    const secondResult = await getMovieDetails('TT0372784')

    expect(firstResult).toMatchObject({
      poster: null,
      writers: [],
      awards: null,
      ratings: [{ source: 'Metacritic', value: '70/100' }],
    })
    expect(secondResult).toBe(firstResult)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('rejects invalid IDs without making a request', async () => {
    await expect(getMovieDetails('not-an-id')).rejects.toMatchObject({
      code: 'INVALID_REQUEST',
    })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('rejects malformed successful responses', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ Response: 'True', Search: 'not-an-array' }),
    )

    await expect(searchMovies('Batman')).rejects.toMatchObject({
      code: 'INVALID_RESPONSE',
    })
  })

  it('returns globally deduplicated curated collections', async () => {
    fetchMock
      .mockResolvedValueOnce(
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
      .mockResolvedValueOnce(
        jsonResponse({
          Response: 'True',
          totalResults: '2',
          Search: [
            {
              imdbID: 'tt0372784',
              Title: 'Batman Begins',
              Year: '2005',
              Type: 'movie',
              Poster: 'N/A',
            },
            {
              imdbID: 'tt0468569',
              Title: 'The Dark Knight',
              Year: '2008',
              Type: 'movie',
              Poster: 'N/A',
            },
          ],
        }),
      )

    const collections = await loadCuratedCollections([
      { id: 'first', title: 'First', query: 'Batman' },
      { id: 'second', title: 'Second', query: 'Dark Knight' },
    ])

    expect(collections[0]?.movies).toHaveLength(1)
    expect(collections[1]?.movies.map((movie) => movie.imdbID)).toEqual([
      'tt0468569',
    ])
  })

  it('keeps successful curated shelves when another search fails', async () => {
    fetchMock
      .mockResolvedValueOnce(
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
      .mockResolvedValueOnce(
        jsonResponse({ Response: 'False', Error: 'Request limit reached!' }),
      )

    const collections = await loadCuratedCollections([
      { id: 'first', title: 'First', query: 'Batman' },
      { id: 'second', title: 'Second', query: 'Unavailable' },
    ])

    expect(collections).toHaveLength(1)
    expect(collections[0]?.id).toBe('first')
  })

  it('uses a typed cancellation error for an aborted request', async () => {
    const controller = new AbortController()
    controller.abort()

    const request = searchMovies('Batman', { signal: controller.signal })

    await expect(request).rejects.toMatchObject({ code: 'ABORTED' })
    await request.catch((error: unknown) => {
      expect(isAbortError(error)).toBe(true)
    })
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
