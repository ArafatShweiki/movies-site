import { render, screen } from '@testing-library/react'
import {
  MemoryRouter,
  Route,
  Routes,
} from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { FavouritesContextValue } from '../../context/favouritesContextValue'
import { useAuth } from '../../hooks/useAuth'
import { useFavourites } from '../../hooks/useFavourites'
import { getMovieDetails, OmdbError } from '../../services/omdbService'
import type { MovieDetails } from '../../types/movie'
import MovieDetailsPage from './MovieDetailsPage'

vi.mock('../../hooks/useAuth', () => ({
  useAuth: vi.fn(),
}))

vi.mock('../../hooks/useFavourites', () => ({
  useFavourites: vi.fn(),
}))

vi.mock('../../services/omdbService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../services/omdbService')>()
  return {
    ...actual,
    getMovieDetails: vi.fn(),
  }
})

const movie: MovieDetails = {
  imdbID: 'tt0133093',
  title: 'The Matrix',
  year: '1999',
  type: 'movie',
  poster: 'https://images.example/matrix.jpg',
  contentRating: 'R',
  runtime: '136 min',
  genres: ['Action', 'Science Fiction'],
  directors: ['Lana Wachowski', 'Lilly Wachowski'],
  writers: ['Lana Wachowski', 'Lilly Wachowski'],
  actors: ['Keanu Reeves', 'Laurence Fishburne', 'Carrie-Anne Moss'],
  plot: 'A computer hacker discovers that his world is a simulated reality.',
  languages: ['English'],
  countries: ['United States'],
  awards: 'Won 4 Academy Awards.',
  imdbRating: '8.7',
  ratings: [
    { source: 'Internet Movie Database', value: '8.7/10' },
    { source: 'Rotten Tomatoes', value: '83%' },
  ],
  released: '31 Mar 1999',
  totalSeasons: null,
}

function setHookDefaults() {
  vi.mocked(useAuth).mockReturnValue({
    user: null,
    loading: false,
    configurationError: null,
    login: vi.fn(),
    register: vi.fn(),
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
}

function renderDetails(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/movie/:imdbID" element={<MovieDetailsPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('MovieDetailsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setHookDefaults()
  })

  it('loads and presents complete normalized title details', async () => {
    vi.mocked(getMovieDetails).mockResolvedValue(movie)

    renderDetails(`/movie/${movie.imdbID}`)

    expect(screen.getByLabelText(/loading title details/i)).toBeInTheDocument()
    expect(
      await screen.findByRole('heading', { level: 1, name: movie.title }),
    ).toBeInTheDocument()
    expect(getMovieDetails).toHaveBeenCalledWith(
      movie.imdbID,
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    )
    expect(screen.getByRole('img', { name: /the matrix poster/i })).toHaveAttribute(
      'src',
      movie.poster,
    )
    expect(screen.getByText(movie.plot ?? '')).toBeInTheDocument()
    expect(screen.getByText('R')).toBeInTheDocument()
    expect(screen.getByText('136 min')).toBeInTheDocument()
    expect(screen.getByText('Action')).toBeInTheDocument()
    expect(screen.getByText('Science Fiction')).toBeInTheDocument()
    expect(
      screen.getAllByText('Lana Wachowski, Lilly Wachowski'),
    ).toHaveLength(2)
    expect(screen.getByText(/keanu reeves, laurence fishburne/i)).toBeInTheDocument()
    expect(screen.getByText('Won 4 Academy Awards.')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /available ratings/i })).toBeInTheDocument()
    expect(screen.getByText('83%')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /add to favourites: the matrix/i }),
    ).toBeInTheDocument()
  })

  it('rejects malformed IMDb IDs without sending a request', () => {
    renderDetails('/movie/not-an-id')

    expect(
      screen.getByRole('heading', { name: /title id is not valid/i }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /browse titles/i })).toHaveAttribute(
      'href',
      '/',
    )
    expect(getMovieDetails).not.toHaveBeenCalled()
  })

  it('shows a specific not-found state for an unknown IMDb ID', async () => {
    vi.mocked(getMovieDetails).mockRejectedValue(
      new OmdbError('NOT_FOUND', 'That title could not be found on OMDb.'),
    )

    renderDetails('/movie/tt9999999')

    expect(
      await screen.findByRole('heading', { name: /title not found/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/could not find a movie or series/i),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
  })
})
