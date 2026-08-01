import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { SearchForm } from './SearchForm'

describe('SearchForm', () => {
  it('rejects an empty search and associates the error with the field', async () => {
    const user = userEvent.setup()
    const onSearch = vi.fn()

    render(<SearchForm onSearch={onSearch} />)

    const input = screen.getByRole('searchbox', {
      name: /search movies and series/i,
    })
    await user.click(screen.getByRole('button', { name: /find titles/i }))

    const error = screen.getByRole('alert')
    expect(error).toHaveTextContent('Enter a movie or series title.')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAttribute('aria-describedby', error.id)
    expect(onSearch).not.toHaveBeenCalled()
  })

  it('rejects whitespace-only input without making a request', async () => {
    const user = userEvent.setup()
    const onSearch = vi.fn()

    render(<SearchForm onSearch={onSearch} />)

    const input = screen.getByRole('searchbox', {
      name: /search movies and series/i,
    })
    await user.type(input, '   ')
    await user.keyboard('{Enter}')

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Enter a movie or series title.',
    )
    expect(onSearch).not.toHaveBeenCalled()
  })

  it('submits a trimmed query with the Enter key', async () => {
    const user = userEvent.setup()
    const onSearch = vi.fn()

    render(<SearchForm onSearch={onSearch} />)

    const input = screen.getByRole('searchbox', {
      name: /search movies and series/i,
    })
    await user.type(input, '  Arrival  ')
    await user.keyboard('{Enter}')

    expect(onSearch).toHaveBeenCalledTimes(1)
    expect(onSearch).toHaveBeenCalledWith('Arrival')
    expect(input).toHaveAttribute('aria-invalid', 'false')
    expect(input).not.toHaveAttribute('aria-describedby')
  })

  it('clears the query, validation error, and parent search state', async () => {
    const user = userEvent.setup()
    const onClear = vi.fn()

    render(
      <SearchForm
        initialQuery="Blade Runner"
        onSearch={vi.fn()}
        onClear={onClear}
      />,
    )

    const input = screen.getByRole('searchbox', {
      name: /search movies and series/i,
    })
    await user.clear(input)
    await user.type(input, '   ')
    await user.keyboard('{Enter}')
    expect(screen.getByRole('alert')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /clear search/i }))

    expect(input).toHaveValue('')
    expect(input).toHaveAttribute('aria-invalid', 'false')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(onClear).toHaveBeenCalledTimes(1)
  })

  it('disables submission and exposes loading feedback while searching', () => {
    render(
      <SearchForm
        initialQuery="Dune"
        isLoading
        onSearch={vi.fn()}
      />,
    )

    const submitButton = screen.getByRole('button', { name: /searching/i })
    expect(submitButton).toBeDisabled()
    expect(
      screen.getByRole('searchbox', { name: /search movies and series/i }),
    ).toBeEnabled()
  })
})
