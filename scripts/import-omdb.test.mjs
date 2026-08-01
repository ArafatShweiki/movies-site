// @vitest-environment node

import { fileURLToPath } from 'node:url'
import { describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_MAX_MOVIES,
  SEARCH_TERMS,
  createFirebaseWriter,
  createOmdbClient,
  importCatalog,
  isDirectExecution,
  mapWithConcurrency,
  normalizeMovieDetails,
  readImporterEnvironment,
  selectUniqueImdbIds,
} from './import-omdb.mjs'

function detailsPayload(imdbID, title, overrides = {}) {
  return {
    Response: 'True',
    imdbID,
    Title: title,
    Year: '2008',
    Type: 'movie',
    Poster: 'https://images.example/poster.jpg',
    Plot: 'A complete plot.',
    Runtime: '152 min',
    Genre: 'Action, Crime, Drama',
    Director: 'A Director',
    Actors: 'Actor One, Actor Two',
    imdbRating: '9.0',
    Rated: 'PG-13',
    Country: 'United States',
    Language: 'English',
    Awards: 'Won an award.',
    ...overrides,
  }
}

function jsonResponse(payload, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(payload),
  }
}

function silentLogger() {
  return {
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }
}

describe('OMDb catalogue importer', () => {
  it('uses the exact curated search terms', () => {
    expect(SEARCH_TERMS).toEqual([
      'Batman',
      'Star Wars',
      'Harry Potter',
      'Spider-Man',
      'Mission Impossible',
      'animation',
      'science fiction',
      'comedy',
    ])
  })

  it('normalizes N/A values and only keeps the catalogue fields', () => {
    const fetchedAt = '2026-08-01T16:00:00.000Z'
    const movie = normalizeMovieDetails(
      detailsPayload('TT0468569', ' The Dark Knight ', {
        Poster: 'javascript:alert(1)',
        Plot: 'N/A',
        Runtime: '',
        Genre: 'N/A',
        Director: 'N/A',
        Actors: 'N/A',
        imdbRating: 'N/A',
        Rated: 'N/A',
        Awards: 'N/A',
        ExtraField: 'must not be stored',
      }),
      fetchedAt,
    )

    expect(movie).toEqual({
      imdbID: 'tt0468569',
      title: 'The Dark Knight',
      year: '2008',
      type: 'movie',
      poster: null,
      plot: null,
      runtime: null,
      genres: [],
      director: null,
      actors: [],
      imdbRating: null,
      contentRating: null,
      country: 'United States',
      language: 'English',
      awards: null,
      fetchedAt,
    })
  })

  it('deduplicates IMDb IDs, balances search groups, and enforces the limit', () => {
    expect(
      selectUniqueImdbIds(
        [
          [
            { imdbID: 'tt0000001' },
            { imdbID: 'TT0000002' },
            { imdbID: 'tt0000001' },
            { imdbID: 'not-an-id' },
          ],
          [{ imdbID: 'tt0000003' }],
        ],
        2,
      ),
    ).toEqual({
      imdbIDs: ['tt0000001', 'tt0000003'],
      skipped: 3,
    })
  })

  it('defaults to an approximately 50-title first import', async () => {
    const searchResults = Array.from({ length: 60 }, (_, index) => ({
      imdbID: `tt${String(index + 1).padStart(7, '0')}`,
    }))
    const omdbClient = {
      search: vi.fn().mockResolvedValue(searchResults),
      getDetails: vi.fn(async (imdbID) => detailsPayload(imdbID, `Title ${imdbID}`)),
    }
    const writeMovie = vi.fn().mockResolvedValue(undefined)

    const stats = await importCatalog({
      omdbClient,
      writeMovie,
      searchTerms: ['Batman'],
      now: () => new Date('2026-08-01T16:00:00.000Z'),
      logger: silentLogger(),
    })

    expect(DEFAULT_MAX_MOVIES).toBe(50)
    expect(omdbClient.getDetails).toHaveBeenCalledTimes(50)
    expect(writeMovie).toHaveBeenCalledTimes(50)
    expect(stats).toEqual({ imported: 50, skipped: 10, failed: 0 })
  })

  it('never exceeds the configured request concurrency', async () => {
    let activeRequests = 0
    let peakRequests = 0

    const results = await mapWithConcurrency(
      [1, 2, 3, 4, 5, 6],
      2,
      async (value) => {
        activeRequests += 1
        peakRequests = Math.max(peakRequests, activeRequests)
        await new Promise((resolvePromise) => setImmediate(resolvePromise))
        activeRequests -= 1
        return value * 2
      },
    )

    expect(results).toEqual([2, 4, 6, 8, 10, 12])
    expect(peakRequests).toBe(2)
  })

  it('uses only documented OMDb search and IMDb-ID endpoints', async () => {
    const requestedUrls = []
    const fetchImpl = vi
      .fn()
      .mockImplementationOnce(async (url) => {
        requestedUrls.push(new URL(url))
        return jsonResponse({
          Response: 'True',
          Search: [{ imdbID: 'tt0468569' }],
        })
      })
      .mockImplementationOnce(async (url) => {
        requestedUrls.push(new URL(url))
        return jsonResponse(detailsPayload('tt0468569', 'The Dark Knight'))
      })

    const client = createOmdbClient({ apiKey: 'test-key', fetchImpl })
    await client.search('Batman')
    await client.getDetails('tt0468569')

    expect(requestedUrls).toHaveLength(2)
    expect(requestedUrls.every((url) => url.origin === 'https://www.omdbapi.com')).toBe(true)
    expect(requestedUrls[0]?.searchParams.get('s')).toBe('Batman')
    expect(requestedUrls[0]?.searchParams.get('type')).toBe('movie')
    expect(requestedUrls[1]?.searchParams.get('i')).toBe('tt0468569')
    expect(requestedUrls[1]?.searchParams.get('plot')).toBe('full')
  })

  it.each([
    {
      name: 'HTTP failures',
      response: jsonResponse({}, 429),
      message: /OMDb returned HTTP 429/,
    },
    {
      name: 'OMDb error payloads',
      response: jsonResponse({ Response: 'False', Error: 'Invalid API key!' }),
      message: /OMDb rejected the request: Invalid API key!$/,
    },
  ])('rejects $name without retrying another source', async ({ response, message }) => {
    const fetchImpl = vi.fn().mockResolvedValue(response)
    const client = createOmdbClient({ apiKey: 'test-key', fetchImpl })

    await expect(client.search('Batman')).rejects.toThrow(message)
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })

  it('writes reruns to the same catalog IMDb-ID path', async () => {
    const set = vi.fn().mockResolvedValue(undefined)
    const database = {
      ref: vi.fn(() => ({ set })),
    }
    const writer = createFirebaseWriter(database)
    const movie = normalizeMovieDetails(
      detailsPayload('tt0468569', 'The Dark Knight'),
      '2026-08-01T16:00:00.000Z',
    )

    const updatedMovie = { ...movie, title: 'The Dark Knight (updated)' }

    await writer(movie)
    await writer(updatedMovie)

    expect(database.ref).toHaveBeenNthCalledWith(1, 'catalog/tt0468569')
    expect(database.ref).toHaveBeenNthCalledWith(2, 'catalog/tt0468569')
    expect(set).toHaveBeenNthCalledWith(1, movie)
    expect(set).toHaveBeenNthCalledWith(2, updatedMovie)
  })

  it('continues after search, detail, and write failures and prints counts', async () => {
    const logger = silentLogger()
    const detailRequests = []
    const searchResults = {
      Batman: [
        { imdbID: 'tt0000001' },
        { imdbID: 'tt0000002' },
        { imdbID: 'tt0000001' },
        { imdbID: 'invalid' },
      ],
      comedy: [{ imdbID: 'tt0000003' }],
    }
    const omdbClient = {
      async search(term) {
        if (term === 'broken search') throw new Error('temporary search failure')
        return searchResults[term]
      },
      async getDetails(imdbID) {
        detailRequests.push(imdbID)
        if (imdbID === 'tt0000002') throw new Error('title unavailable')
        return detailsPayload(imdbID, `Title ${imdbID}`)
      },
    }
    const writeMovie = vi.fn(async (movie) => {
      if (movie.imdbID === 'tt0000003') throw new Error('database unavailable')
    })

    const stats = await importCatalog({
      omdbClient,
      writeMovie,
      searchTerms: ['Batman', 'comedy', 'broken search'],
      maxMovies: 3,
      concurrency: 2,
      now: () => new Date('2026-08-01T16:00:00.000Z'),
      logger,
    })

    expect(detailRequests.sort()).toEqual([
      'tt0000001',
      'tt0000002',
      'tt0000003',
    ])
    expect(stats).toEqual({ imported: 1, skipped: 2, failed: 3 })
    expect(logger.log).toHaveBeenCalledWith('Imported: 1')
    expect(logger.log).toHaveBeenCalledWith('Skipped: 2')
    expect(logger.log).toHaveBeenCalledWith('Failed: 3')
  })

  it('requires the three server-side environment variables', () => {
    expect(() => readImporterEnvironment({})).toThrow(
      /OMDB_API_KEY, FIREBASE_DATABASE_URL, GOOGLE_APPLICATION_CREDENTIALS/,
    )

    expect(
      readImporterEnvironment({
        OMDB_API_KEY: 'key',
        FIREBASE_DATABASE_URL: 'https://project-default-rtdb.firebaseio.com',
        GOOGLE_APPLICATION_CREDENTIALS: 'C:/secure/service-account.json',
      }),
    ).toEqual({
      apiKey: 'key',
      databaseUrl: 'https://project-default-rtdb.firebaseio.com/',
      credentialsPath: 'C:/secure/service-account.json',
    })
  })

  it('rejects whitespace-only and insecure database configuration', () => {
    expect(() =>
      readImporterEnvironment({
        OMDB_API_KEY: '   ',
        FIREBASE_DATABASE_URL: 'https://project-default-rtdb.firebaseio.com',
        GOOGLE_APPLICATION_CREDENTIALS: 'C:/secure/service-account.json',
      }),
    ).toThrow(/OMDB_API_KEY/)

    expect(() =>
      readImporterEnvironment({
        OMDB_API_KEY: 'key',
        FIREBASE_DATABASE_URL: 'not a URL',
        GOOGLE_APPLICATION_CREDENTIALS: 'C:/secure/service-account.json',
      }),
    ).toThrow(/valid HTTPS URL/)

    expect(() =>
      readImporterEnvironment({
        OMDB_API_KEY: 'key',
        FIREBASE_DATABASE_URL: 'http://project-default-rtdb.firebaseio.com',
        GOOGLE_APPLICATION_CREDENTIALS: 'C:/secure/service-account.json',
      }),
    ).toThrow(/must use HTTPS/)
  })

  it('only runs main when Node invokes this script directly', () => {
    const scriptUrl = new URL('./import-omdb.mjs', import.meta.url)
    const scriptPath = fileURLToPath(scriptUrl)

    expect(isDirectExecution(scriptUrl.href, ['node', scriptPath])).toBe(true)
    expect(isDirectExecution(scriptUrl.href, ['node', 'scripts/another-task.mjs'])).toBe(false)
    expect(isDirectExecution(scriptUrl.href, ['node'])).toBe(false)
  })
})
