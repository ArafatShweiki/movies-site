import { act, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ComponentProps } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { FeaturedSeriesSlide } from '../../types/movie'
import { FeaturedSeriesCarousel } from './FeaturedSeriesCarousel'

const actionMocks = vi.hoisted(() => ({
  favourite: vi.fn(),
  watchlist: vi.fn(),
}))

vi.mock('../FavouriteButton/FavouriteButton', () => ({
  FavouriteButton: ({ movie }: { movie: FeaturedSeriesSlide }) => (
    <button type="button" onClick={() => actionMocks.favourite(movie.imdbID)}>
      Favourite {movie.title}
    </button>
  ),
}))

vi.mock('../WatchlistButton/WatchlistButton', () => ({
  WatchlistButton: ({ movie }: { movie: FeaturedSeriesSlide }) => (
    <button type="button" onClick={() => actionMocks.watchlist(movie.imdbID)}>
      Watchlist {movie.title}
    </button>
  ),
}))

const series: readonly FeaturedSeriesSlide[] = [
  {
    imdbID: 'tt1000001',
    title: 'Northstar',
    year: '2023',
    type: 'series',
    poster: 'https://images.example/northstar.jpg',
    plot: 'An observatory receives a message from a station thought to be empty.',
    genres: ['Drama', 'Mystery'],
    imdbRating: '8.3',
  },
  {
    imdbID: 'tt1000002',
    title: 'Low Tide',
    year: '2021',
    type: 'series',
    poster: 'https://images.example/low-tide.jpg',
    plot: 'A coastal community uncovers the source of a decades-old signal.',
    genres: ['Mystery'],
    imdbRating: '7.9',
  },
  {
    imdbID: 'tt1000003',
    title: 'Paper Moons',
    year: '2024',
    type: 'series',
    poster: 'https://images.example/paper-moons.jpg',
    plot: 'Two archivists follow a trail hidden in forgotten film reels.',
    genres: ['Drama'],
    imdbRating: null,
  },
]

function setReducedMotion(matches: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    } satisfies MediaQueryList)),
  })
}

function renderCarousel(
  props: Partial<ComponentProps<typeof FeaturedSeriesCarousel>> = {},
) {
  return render(
    <MemoryRouter>
      <FeaturedSeriesCarousel series={series} {...props} />
    </MemoryRouter>,
  )
}

describe('FeaturedSeriesCarousel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setReducedMotion(false)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders a featured series and forwards favourite and watchlist actions', async () => {
    const user = userEvent.setup()
    renderCarousel()

    const activeSlide = screen.getByRole('article', { name: /1 of 3: northstar/i })
    expect(within(activeSlide).getByRole('heading', { name: 'Northstar' })).toBeInTheDocument()
    expect(within(activeSlide).getByText(/observatory receives/i)).toBeInTheDocument()
    expect(within(activeSlide).getByRole('link', { name: /view details/i })).toHaveAttribute(
      'href',
      '/movie/tt1000001',
    )

    await user.click(within(activeSlide).getByRole('button', { name: /favourite northstar/i }))
    await user.click(within(activeSlide).getByRole('button', { name: /watchlist northstar/i }))
    expect(actionMocks.favourite).toHaveBeenCalledWith('tt1000001')
    expect(actionMocks.watchlist).toHaveBeenCalledWith('tt1000001')
  })

  it('moves with previous, next, and indicator controls', async () => {
    const user = userEvent.setup()
    renderCarousel()

    await user.click(screen.getByRole('button', { name: /next featured series/i }))
    expect(screen.getByRole('article', { name: /2 of 3: low tide/i })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /previous featured series/i }))
    expect(screen.getByRole('article', { name: /1 of 3: northstar/i })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /show paper moons/i }))
    expect(screen.getByRole('article', { name: /3 of 3: paper moons/i })).toBeInTheDocument()
  })

  it('does not automatically advance when reduced motion is preferred', () => {
    vi.useFakeTimers()
    setReducedMotion(true)
    renderCarousel()

    act(() => {
      vi.advanceTimersByTime(8_000)
    })

    expect(screen.getByRole('article', { name: /1 of 3: northstar/i })).toBeInTheDocument()
    expect(screen.getByText('Auto-play off')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /automatic slide rotation/i })).not.toBeInTheDocument()
  })

  it('keeps automatic movement paused until the visitor resumes it', () => {
    vi.useFakeTimers()
    renderCarousel()

    const pauseButton = screen.getByRole('button', {
      name: /pause automatic slide rotation/i,
    })
    fireEvent.click(pauseButton)

    act(() => {
      vi.advanceTimersByTime(16_000)
    })

    expect(screen.getByRole('article', { name: /1 of 3: northstar/i })).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /resume automatic slide rotation/i }),
    ).toBeInTheDocument()
  })

  it('renders useful empty and error states', async () => {
    const retry = vi.fn()
    const view = renderCarousel({ series: [] })
    expect(screen.getByRole('heading', { name: /no featured series yet/i })).toBeInTheDocument()

    view.rerender(
      <MemoryRouter>
        <FeaturedSeriesCarousel
          series={[]}
          error="The series shelf could not be reached."
          onRetry={retry}
        />
      </MemoryRouter>,
    )

    const user = userEvent.setup()
    expect(screen.getByRole('alert')).toHaveTextContent('The series shelf could not be reached.')
    await user.click(screen.getByRole('button', { name: /try again/i }))
    expect(retry).toHaveBeenCalledOnce()
  })
})
