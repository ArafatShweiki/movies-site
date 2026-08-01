import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { LoginForm } from './LoginForm'

function deferredPromise() {
  let resolve!: () => void
  const promise = new Promise<void>((promiseResolve) => {
    resolve = promiseResolve
  })

  return { promise, resolve }
}

describe('LoginForm', () => {
  it('shows required errors beside both fields with accessible associations', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()

    render(<LoginForm onSubmit={onSubmit} />)
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    const email = screen.getByLabelText(/email address/i)
    const password = screen.getByLabelText(/^password$/i)
    const emailError = screen.getByText('Email is required.')
    const passwordError = screen.getByText('Password is required.')

    expect(email).toHaveAttribute('aria-invalid', 'true')
    expect(email).toHaveAttribute('aria-describedby', emailError.id)
    expect(password).toHaveAttribute('aria-invalid', 'true')
    expect(password).toHaveAttribute('aria-describedby', passwordError.id)
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('rejects an invalid email address', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()

    render(<LoginForm onSubmit={onSubmit} />)
    await user.type(screen.getByLabelText(/email address/i), 'invalid-email')
    await user.type(screen.getByLabelText(/^password$/i), 'password')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    expect(screen.getByText('Enter a valid email address.')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('submits a trimmed email and the entered password', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(undefined)

    render(<LoginForm onSubmit={onSubmit} />)
    await user.type(screen.getByLabelText(/email address/i), '  viewer@example.com  ')
    await user.type(screen.getByLabelText(/^password$/i), 'password')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith('viewer@example.com', 'password')
    })
    expect(onSubmit).toHaveBeenCalledTimes(1)
  })

  it('presents a friendly authentication failure', async () => {
    const user = userEvent.setup()
    const onSubmit = vi
      .fn()
      .mockRejectedValue(new Error('The email or password is incorrect.'))

    render(<LoginForm onSubmit={onSubmit} />)
    await user.type(screen.getByLabelText(/email address/i), 'viewer@example.com')
    await user.type(screen.getByLabelText(/^password$/i), 'incorrect')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('The email or password is incorrect.')
    await waitFor(() => expect(alert).toHaveFocus())
  })

  it('uses a safe fallback for an unrecognized rejection', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockRejectedValue({ code: 'unknown' })

    render(<LoginForm onSubmit={onSubmit} />)
    await user.type(screen.getByLabelText(/email address/i), 'viewer@example.com')
    await user.type(screen.getByLabelText(/^password$/i), 'password')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Unable to sign in. Please try again.',
    )
  })

  it('disables the form and prevents duplicate submissions while pending', async () => {
    const user = userEvent.setup()
    const deferred = deferredPromise()
    const onSubmit = vi.fn().mockReturnValue(deferred.promise)

    render(<LoginForm onSubmit={onSubmit} />)
    await user.type(screen.getByLabelText(/email address/i), 'viewer@example.com')
    await user.type(screen.getByLabelText(/^password$/i), 'password')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    const loadingButton = screen.getByRole('button', { name: /signing in/i })
    expect(loadingButton).toBeDisabled()
    await user.click(loadingButton)
    expect(onSubmit).toHaveBeenCalledTimes(1)

    await act(async () => deferred.resolve())
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /sign in/i })).toBeEnabled()
    })
  })

  it('clears values and validation errors with the reset control', async () => {
    const user = userEvent.setup()

    render(<LoginForm onSubmit={vi.fn()} />)
    const email = screen.getByLabelText(/email address/i)
    const password = screen.getByLabelText(/^password$/i)

    await user.type(email, 'not-an-email')
    await user.type(password, 'password')
    await user.click(screen.getByRole('button', { name: /sign in/i }))
    expect(screen.getByText('Enter a valid email address.')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /clear form/i }))

    expect(email).toHaveValue('')
    expect(password).toHaveValue('')
    expect(email).toHaveAttribute('aria-invalid', 'false')
    expect(screen.queryByText('Enter a valid email address.')).not.toBeInTheDocument()
  })
})
