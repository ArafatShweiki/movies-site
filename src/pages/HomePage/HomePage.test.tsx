import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { FavouritesContextValue } from '../../context/favouritesContextValue'
import type { WatchlistContextValue } from '../../context/watchlistContextValue'
import { useAuth } from '../../hooks/useAuth'
import { useFavourites } from '../../hooks/useFavourites'
import { useWatchlist } from '../../hooks/useWatchlist'
import { loadFeaturedSeries } from '../../services/catalogService'
import {
  getMovieDetails,
  loadCuratedCollections,
} from '../../services/omdbService'
import type {
  CuratedMovieCollection,
  FeaturedSeriesSlide,
  MovieDetails,
  MovieSummary,
} from '../../types/movie'
import HomePage from './HomePage'

vi.mock('../../hooks/useAuth', () => ({
  useAuth: vi.fn(),
}))

vi.mock('../../hooks/useFavourites', () => ({
  useFavourites: vi.fn(),
}))

vi.mock('../../hooks/useWatchlist', () => ({
  useWatchlist: vi.fn(),
}))

vi.mock('../../services/catalogService', () => ({
  loadFeaturedSeries: vi.fn(),
}))

vi.mock('../../services/omdbService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../services/omdbService')>()
  return {
    ...actual,
    getMovieDetails: vi.fn(),
    loadCuratedCollections: vi.fn(),
  }
})

const makeMovie = (
  imdbID: string,
  title: string,
  type: MovieSummary['type'] = 'movie',
): MovieSummary => ({
  imdbID,
  title,
  year: '2024',
  type,
  poster: `https://images.example/${imdbID}.jpg`,
})

const featuredMovie = makeMovie('tt0000001', 'Signal at Midnight')

const featuredSeries: FeaturedSeriesSlide = {
  imdbID: 'tt9000001',
  title: 'Northstar',
  year: '2023',
  type: 'series',
  poster: 'https://images.example/northstar.jpg',
  plot: 'A remote observatory receives messages from an abandoned station.',
  genres: ['Drama', 'Mystery'],
  imdbRating: '8.3',
}

const heroDetails: MovieDetails = {
  ...featuredMovie,
  contentRating: 'PG-13',
  runtime: '121 min',
  genres: ['Science Fiction', 'Mystery'],
  directors: ['A. Director'],
  writers: ['W. Writer'],
  actors: ['One Actor', 'Two Actor'],
  plot: 'A radio astronomer follows a signal that should not exist.',
  languages: ['English'],
  countries: ['United Kingdom'],
  awards: null,
  imdbRating: '8.1',
  ratings: [{ source: 'IMDb', value: '8.1/10' }],
  released: '12 Jan 2024',
  totalSeasons: null,
}

const topTenMovies = Array.from({ length: 10 }, (_, index) =>
  makeMovie(
    `tt${String(index + 100).padStart(7, '0')}`,
    `Strex Pick ${index + 1}`,
  ),
)

const collections: readonly CuratedMovieCollection[] = [
  {
    id: 'featured',
    title: 'Featured This Week',
    query: 'signal',
    movies: [featuredMovie, makeMovie('tt0000002', 'After the Static')],
  },
  {
    id: 'action',
    title: 'Action Picks',
    query: 'action',
    movies: [makeMovie('tt0000003', 'Last Extraction')],
  },
  {
    id: 'science-fiction',
    title: 'Science-Fiction Worlds',
    query: 'space',
    movies: [makeMovie('tt0000004', 'Red Horizon')],
  },
  {
    id: 'series',
    title: 'Series Spotlight',
    query: 'detective',
    type: 'series',
    movies: [makeMovie('tt0000005', 'The Quiet Case', 'series')],
  },
  {
    id: 'top-ten',
    title: 'Top 10 Picks',
    query: 'curated',
    movies: topTenMovies,
  },
]

function setHookDefaults() {
  vi.mocked(useAuth).mockReturnValue({
    user: null,
    loading: false,
    configurationError: null,
    profile: null,
    profileLoading: false,
    profileError: null,
    login: vi.fn(),
    register: vi.fn(),
    loginWithGoogle: vi.fn(),
    saveProfile: vi.fn(),
    logout: vi.fn(),
  })

  const favouritesValue: FavouritesContextValue = {
    favourites: [],
    loading: false,
    isFavourite: () => false,
    toggleFavourite: vi.fn(() => Promise.resolve()),
    addFavourite: vi.fn(() => Promise.resolve()),
    removeFavourite: vi.fn(() => Promise.resolve()),
    pendingIds: new Set<string>(),
    error: null,
    clearError: vi.fn(),
  }
  vi.mocked(useFavourites).mockReturnValue(favouritesValue)

  const watchlistValue: WatchlistContextValue = {
    watchlist: [],
    loading: false,
    isWatchlisted: () => false,
    toggleWatchlist: vi.fn(() => Promise.resolve()),
    addToWatchlist: vi.fn(() => Promise.resolve()),
    removeFromWatchlist: vi.fn(() => Promise.resolve()),
    pendingIds: new Set<string>(),
    error: null,
    clearError: vi.fn(),
  }
  vi.mocked(useWatchlist).mockReturnValue(watchlistValue)
}

function renderHome() {
  return render(
    <MemoryRouter>
      <HomePage />
    </MemoryRouter>,
  )
}

describe('HomePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setHookDefaults()
    vi.mocked(loadCuratedCollections).mockResolvedValue(collections)
    vi.mocked(getMovieDetails).mockResolvedValue(heroDetails)
    vi.mocked(loadFeaturedSeries).mockResolvedValue([featuredSeries])
  })

  it('renders a detailed hero, curated disclosure, themed rows, and ten ranked picks', async () => {
    renderHome()

    expect(
      screen.getByLabelText('Loading featured title'),
    ).toBeInTheDocument()

    expect(
      await screen.findByRole('heading', { level: 2, name: featuredMovie.title }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: /strex movie and television discovery/i,
      }),
    ).toBeInTheDocument()
    expect(
      await screen.findByText(heroDetails.plot ?? ''),
    ).toBeInTheDocument()
    expect(screen.getByText(/chosen, not charted/i)).toBeInTheDocument()
    expect(screen.getByText(/do not represent live trends/i)).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { level: 2, name: 'Featured series' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: featuredSeries.title })).toBeInTheDocument()

    for (const heading of [
      'Featured This Week',
      'Action Picks',
      'Science-Fiction Worlds',
      'Series Spotlight',
      'Top 10 Picks',
    ]) {
      expect(
        screen.getByRole('heading', { level: 2, name: heading }),
      ).toBeInTheDocument()
    }

    const detailsLink = screen
      .getAllByRole('link', { name: /^view details$/i })
      .find((link) => link.getAttribute('href') === `/movie/${featuredMovie.imdbID}`)
    expect(detailsLink).toHaveAttribute('href', `/movie/${featuredMovie.imdbID}`)
    expect(screen.getByText('8.1 IMDb')).toBeInTheDocument()

    const rankedList = screen.getByRole('list', {
      name: /ten curated picks/i,
    })
    expect(within(rankedList).getAllByRole('listitem')).toHaveLength(10)
    expect(within(rankedList).getByText('Rank 1:')).toBeInTheDocument()
    expect(within(rankedList).getByText('Rank 10:')).toBeInTheDocument()
  })

  it('offers a retry after a collection failure and recovers', async () => {
    const user = userEvent.setup()
    vi.mocked(loadCuratedCollections)
      .mockRejectedValueOnce(new Error('The catalogue service is unavailable.'))
      .mockResolvedValueOnce(collections)

    renderHome()

    expect(
      await screen.findByRole('heading', {
        name: /catalogue could not be loaded/i,
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByText('The catalogue service is unavailable.'),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /try again/i }))

    expect(
      await screen.findByRole('heading', { level: 2, name: featuredMovie.title }),
    ).toBeInTheDocument()
    expect(loadCuratedCollections).toHaveBeenCalledTimes(2)
  })
})
