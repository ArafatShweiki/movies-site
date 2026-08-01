// @vitest-environment node

import { fileURLToPath } from 'node:url'
import { describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_MAX_MOVIES,
  SEARCH_TERMS,
  catalogPathForImdbID,
  createFirebaseWriter,
  createOmdbClient,
  importCatalog,
  isDirectExecution,
  mapWithConcurrency,
  normalizeMovieDetails,
  parseImporterArguments,
  readImporterEnvironment,
  runImporter,
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

  it.each([
    [[], { dryRun: false, maxMovies: 50 }],
    [['--dry-run'], { dryRun: true, maxMovies: 50 }],
    [['--limit=7'], { dryRun: false, maxMovies: 7 }],
    [
      ['--limit=2', '--dry-run'],
      { dryRun: true, maxMovies: 2 },
    ],
    [
      ['--dry-run', '--limit=2'],
      { dryRun: true, maxMovies: 2 },
    ],
  ])('parses supported importer arguments %#', (args, expected) => {
    expect(parseImporterArguments(args)).toEqual(expected)
  })

  it.each([
    ['--limit='],
    ['--limit=0'],
    ['--limit=-1'],
    ['--limit=2.5'],
    ['--limit=2e1'],
    ['--limit=51'],
    ['--limit'],
    ['--dry-run=true'],
    ['--dry-run', '--dry-run'],
    ['--limit=2', '--limit=3'],
    ['unexpected'],
  ])('rejects unsafe or ambiguous arguments %#', (...args) => {
    expect(() => parseImporterArguments(args)).toThrow()
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

  it('applies --limit after deduplication and bounds detail requests and writes', async () => {
    const { maxMovies } = parseImporterArguments(['--limit=2'])
    const omdbClient = {
      search: vi.fn().mockResolvedValue([
        { imdbID: 'tt0000001' },
        { imdbID: 'tt0000001' },
        { imdbID: 'tt0000002' },
        { imdbID: 'tt0000003' },
      ]),
      getDetails: vi.fn(async (imdbID) => detailsPayload(imdbID, `Title ${imdbID}`)),
    }
    const writeMovie = vi.fn().mockResolvedValue(undefined)

    const stats = await importCatalog({
      omdbClient,
      writeMovie,
      searchTerms: ['Batman'],
      maxMovies,
      now: () => new Date('2026-08-01T16:00:00.000Z'),
      logger: silentLogger(),
    })

    expect(omdbClient.getDetails).toHaveBeenCalledTimes(2)
    expect(writeMovie).toHaveBeenCalledTimes(2)
    expect(stats).toEqual({ imported: 2, skipped: 2, failed: 0 })
  })

  it('dry-runs full details and normalization without calling a writer', async () => {
    const logger = silentLogger()
    const omdbClient = {
      search: vi.fn().mockResolvedValue([
        { imdbID: 'tt0000001' },
        { imdbID: 'tt0000002' },
        { imdbID: 'tt0000003' },
      ]),
      getDetails: vi.fn(async (imdbID) => {
        if (imdbID === 'tt0000002') {
          return detailsPayload(imdbID, 'N/A')
        }
        if (imdbID === 'tt0000003') {
          throw new Error('detail request failed')
        }
        return detailsPayload(imdbID, `Title ${imdbID}`, { Runtime: 'N/A' })
      }),
    }

    const stats = await importCatalog({
      omdbClient,
      searchTerms: ['Batman'],
      maxMovies: 3,
      dryRun: true,
      now: () => new Date('2026-08-01T16:00:00.000Z'),
      logger,
    })

    expect(omdbClient.getDetails).toHaveBeenCalledTimes(3)
    expect(stats).toEqual({ imported: 0, skipped: 1, failed: 1, planned: 1 })
    expect(logger.log).toHaveBeenCalledWith(
      '[dry-run] Would write catalog/tt0000001',
    )
    expect(logger.log).toHaveBeenCalledWith(
      'Mode: dry run (no Firebase writes)',
    )
    expect(logger.log).toHaveBeenCalledWith('Would import: 1')
    expect(logger.log).toHaveBeenCalledWith('Imported: 0')
    expect(logger.log).toHaveBeenCalledWith('Skipped: 1')
    expect(logger.log).toHaveBeenCalledWith('Failed: 1')
  })

  it('does not initialize Firebase or create a writer in dry-run orchestration', async () => {
    const omdbClient = {
      search: vi.fn(async (term) => [{
        imdbID: `tt${String(SEARCH_TERMS.indexOf(term) + 1).padStart(7, '0')}`,
      }]),
      getDetails: vi.fn(async (imdbID) => detailsPayload(imdbID, 'A title')),
    }
    const omdbClientFactory = vi.fn(() => omdbClient)
    const databaseInitializer = vi.fn()
    const writerFactory = vi.fn()

    const stats = await runImporter({
      options: parseImporterArguments(['--dry-run', '--limit=1']),
      environment: { OMDB_API_KEY: 'test-key' },
      logger: silentLogger(),
      omdbClientFactory,
      databaseInitializer,
      writerFactory,
    })

    expect(omdbClientFactory).toHaveBeenCalledWith({ apiKey: 'test-key' })
    expect(databaseInitializer).not.toHaveBeenCalled()
    expect(writerFactory).not.toHaveBeenCalled()
    expect(omdbClient.getDetails).toHaveBeenCalledTimes(1)
    expect(stats).toEqual({ imported: 0, skipped: 7, failed: 0, planned: 1 })
  })

  it('forwards the live CLI limit, database URL, database, and logger', async () => {
    const logger = silentLogger()
    const omdbClient = {
      search: vi.fn(async (term) => [{
        imdbID: `tt${String(SEARCH_TERMS.indexOf(term) + 1).padStart(7, '0')}`,
      }]),
      getDetails: vi.fn(async (imdbID) => detailsPayload(imdbID, 'A title')),
    }
    const omdbClientFactory = vi.fn(() => omdbClient)
    const database = { name: 'mock database' }
    const databaseInitializer = vi.fn(() => database)
    const writeMovie = vi.fn().mockResolvedValue(undefined)
    const writerFactory = vi.fn(() => writeMovie)

    const stats = await runImporter({
      options: parseImporterArguments(['--limit=2']),
      environment: {
        OMDB_API_KEY: 'test-key',
        FIREBASE_DATABASE_URL: 'https://project-default-rtdb.firebaseio.com',
        GOOGLE_APPLICATION_CREDENTIALS: 'C:/secure/service-account.json',
      },
      logger,
      omdbClientFactory,
      databaseInitializer,
      writerFactory,
    })

    expect(databaseInitializer).toHaveBeenCalledWith(
      'https://project-default-rtdb.firebaseio.com/',
    )
    expect(writerFactory).toHaveBeenCalledWith(database, { logger })
    expect(omdbClient.getDetails).toHaveBeenCalledTimes(2)
    expect(writeMovie).toHaveBeenCalledTimes(2)
    expect(stats).toEqual({ imported: 2, skipped: 6, failed: 0 })
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

  it('logs the exact safe path before reruns write to the same location', async () => {
    const events = []
    const logger = {
      log: vi.fn((message) => events.push(message)),
    }
    const set = vi.fn(async () => {
      events.push('set')
    })
    const database = {
      ref: vi.fn((path) => {
        events.push(`ref:${path}`)
        return { set }
      }),
    }
    const writer = createFirebaseWriter(database, { logger })
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
    expect(events).toEqual([
      'Firebase write path: catalog/tt0468569',
      'ref:catalog/tt0468569',
      'set',
      'Firebase write path: catalog/tt0468569',
      'ref:catalog/tt0468569',
      'set',
    ])
  })

  it('refuses every non-canonical or nested Firebase catalogue path', async () => {
    const database = {
      ref: vi.fn(() => ({ set: vi.fn() })),
    }
    const logger = { log: vi.fn() }
    const writer = createFirebaseWriter(database, { logger })

    expect(catalogPathForImdbID('tt0468569')).toBe('catalog/tt0468569')

    for (const imdbID of [
      'TT0468569',
      ' tt0468569',
      'tt0468569/other',
      '../users',
      'tt0468569.other',
      'tt0468569#',
      'tt0468569$child',
      'tt0468569[0]',
      'tt0468569\n',
      'tt12',
      '',
      null,
    ]) {
      await expect(writer({ imdbID })).rejects.toThrow(/Refusing unsafe Firebase write/)
    }

    await expect(writer(null)).rejects.toThrow(/movie must be an object/)
    expect(database.ref).not.toHaveBeenCalled()
    expect(logger.log).not.toHaveBeenCalled()
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

    expect(
      readImporterEnvironment(
        { OMDB_API_KEY: ' dry-run-key ' },
        { requireFirebase: false },
      ),
    ).toEqual({ apiKey: 'dry-run-key' })
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

  it.each([
    'https://project-default-rtdb.firebaseio.com/catalog',
    'https://user:password@project-default-rtdb.firebaseio.com',
    'https://project-default-rtdb.firebaseio.com/?target=catalog',
    'https://project-default-rtdb.firebaseio.com/#catalog',
  ])('rejects a Firebase URL that is not an unqualified database root: %s', (url) => {
    expect(() =>
      readImporterEnvironment({
        OMDB_API_KEY: 'key',
        FIREBASE_DATABASE_URL: url,
        GOOGLE_APPLICATION_CREDENTIALS: 'C:/secure/service-account.json',
      }),
    ).toThrow(/must point to the HTTPS database root/)
  })

  it('only runs main when Node invokes this script directly', () => {
    const scriptUrl = new URL('./import-omdb.mjs', import.meta.url)
    const scriptPath = fileURLToPath(scriptUrl)

    expect(isDirectExecution(scriptUrl.href, ['node', scriptPath])).toBe(true)
    expect(isDirectExecution(scriptUrl.href, ['node', 'scripts/another-task.mjs'])).toBe(false)
    expect(isDirectExecution(scriptUrl.href, ['node'])).toBe(false)
  })
})
