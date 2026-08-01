import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { RegistrationForm } from './RegistrationForm'

function deferredPromise() {
  let resolve!: () => void
  const promise = new Promise<void>((promiseResolve) => {
    resolve = promiseResolve
  })

  return { promise, resolve }
}

async function fillValidRegistration(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/first name/i), 'Amina')
  await user.type(screen.getByLabelText(/last name/i), 'Saleh')
  await user.type(screen.getByLabelText(/email address/i), 'viewer@example.com')
  await user.type(screen.getByLabelText(/^password$/i), 'password1')
  await user.type(screen.getByLabelText(/confirm password/i), 'password1')
}

describe('RegistrationForm', () => {
  it('shows all required errors and associates them with their fields', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()

    render(<RegistrationForm onSubmit={onSubmit} />)
    await user.click(screen.getByRole('button', { name: /create account/i }))

    const firstName = screen.getByLabelText(/first name/i)
    const lastName = screen.getByLabelText(/last name/i)
    const email = screen.getByLabelText(/email address/i)
    const password = screen.getByLabelText(/^password$/i)
    const confirmation = screen.getByLabelText(/confirm password/i)
    const firstNameError = screen.getByText('First name is required.')
    const lastNameError = screen.getByText('Last name is required.')
    const emailError = screen.getByText('Email is required.')
    const passwordError = screen.getByText('Password is required.')
    const confirmationError = screen.getByText('Confirm your password.')

    expect(firstName).toHaveAttribute('aria-invalid', 'true')
    expect(firstName).toHaveAttribute('aria-describedby', firstNameError.id)
    expect(lastName).toHaveAttribute('aria-invalid', 'true')
    expect(lastName).toHaveAttribute('aria-describedby', lastNameError.id)
    expect(email).toHaveAttribute('aria-invalid', 'true')
    expect(email).toHaveAttribute('aria-describedby', emailError.id)
    expect(password).toHaveAttribute('aria-invalid', 'true')
    expect(password.getAttribute('aria-describedby')).toContain(passwordError.id)
    expect(confirmation).toHaveAttribute('aria-invalid', 'true')
    expect(confirmation).toHaveAttribute(
      'aria-describedby',
      confirmationError.id,
    )
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('rejects whitespace-only first and last names', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<RegistrationForm onSubmit={onSubmit} />)

    await user.type(screen.getByLabelText(/first name/i), '   ')
    await user.type(screen.getByLabelText(/last name/i), '   ')
    await user.type(screen.getByLabelText(/email address/i), 'viewer@example.com')
    await user.type(screen.getByLabelText(/^password$/i), 'password1')
    await user.type(screen.getByLabelText(/confirm password/i), 'password1')
    await user.click(screen.getByRole('button', { name: /create account/i }))

    expect(screen.getByText('First name is required.')).toBeInTheDocument()
    expect(screen.getByText('Last name is required.')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('rejects an invalid email address', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()

    render(<RegistrationForm onSubmit={onSubmit} />)
    await user.type(screen.getByLabelText(/first name/i), 'Amina')
    await user.type(screen.getByLabelText(/last name/i), 'Saleh')
    await user.type(screen.getByLabelText(/email address/i), 'viewer.example.com')
    await user.type(screen.getByLabelText(/^password$/i), 'password1')
    await user.type(screen.getByLabelText(/confirm password/i), 'password1')
    await user.click(screen.getByRole('button', { name: /create account/i }))

    expect(screen.getByText('Enter a valid email address.')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('rejects a password shorter than eight characters', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()

    render(<RegistrationForm onSubmit={onSubmit} />)
    await user.type(screen.getByLabelText(/first name/i), 'Amina')
    await user.type(screen.getByLabelText(/last name/i), 'Saleh')
    await user.type(screen.getByLabelText(/email address/i), 'viewer@example.com')
    await user.type(screen.getByLabelText(/^password$/i), 'short')
    await user.type(screen.getByLabelText(/confirm password/i), 'short')
    await user.click(screen.getByRole('button', { name: /create account/i }))

    const password = screen.getByLabelText(/^password$/i)
    const error = password.parentElement?.querySelector('.field-error')
    if (!(error instanceof HTMLElement)) {
      throw new Error('Expected a password field error.')
    }
    expect(password).toHaveAttribute('aria-invalid', 'true')
    expect(password.getAttribute('aria-describedby')).toContain(error.id)
    expect(error).toHaveTextContent('Use at least 8 characters.')
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('rejects a mismatched password confirmation', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()

    render(<RegistrationForm onSubmit={onSubmit} />)
    await user.type(screen.getByLabelText(/first name/i), 'Amina')
    await user.type(screen.getByLabelText(/last name/i), 'Saleh')
    await user.type(screen.getByLabelText(/email address/i), 'viewer@example.com')
    await user.type(screen.getByLabelText(/^password$/i), 'password1')
    await user.type(screen.getByLabelText(/confirm password/i), 'password2')
    await user.click(screen.getByRole('button', { name: /create account/i }))

    const confirmation = screen.getByLabelText(/confirm password/i)
    const error = screen.getByText('Passwords do not match.')
    expect(confirmation).toHaveAttribute('aria-invalid', 'true')
    expect(confirmation).toHaveAttribute('aria-describedby', error.id)
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('submits a trimmed email and valid password', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(undefined)

    render(<RegistrationForm onSubmit={onSubmit} />)
    await user.type(screen.getByLabelText(/first name/i), '  Amina  ')
    await user.type(screen.getByLabelText(/last name/i), '  Saleh  ')
    await user.type(screen.getByLabelText(/email address/i), '  viewer@example.com  ')
    await user.type(screen.getByLabelText(/^password$/i), 'password1')
    await user.type(screen.getByLabelText(/confirm password/i), 'password1')
    await user.click(screen.getByRole('button', { name: /create account/i }))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        firstName: 'Amina',
        lastName: 'Saleh',
        email: 'viewer@example.com',
        password: 'password1',
      })
    })
    expect(onSubmit).toHaveBeenCalledTimes(1)
  })

  it('announces a registration failure and focuses the alert', async () => {
    const user = userEvent.setup()
    const onSubmit = vi
      .fn()
      .mockRejectedValue(new Error('An account already uses this email.'))

    render(<RegistrationForm onSubmit={onSubmit} />)
    await fillValidRegistration(user)
    await user.click(screen.getByRole('button', { name: /create account/i }))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('An account already uses this email.')
    await waitFor(() => expect(alert).toHaveFocus())
  })

  it('disables every field and prevents duplicate submissions while pending', async () => {
    const user = userEvent.setup()
    const deferred = deferredPromise()
    const onSubmit = vi.fn().mockReturnValue(deferred.promise)

    render(<RegistrationForm onSubmit={onSubmit} />)
    await fillValidRegistration(user)
    await user.click(screen.getByRole('button', { name: /create account/i }))

    const loadingButton = screen.getByRole('button', { name: /creating account/i })
    expect(loadingButton).toBeDisabled()
    expect(screen.getByLabelText(/first name/i)).toBeDisabled()
    expect(screen.getByLabelText(/last name/i)).toBeDisabled()
    expect(screen.getByLabelText(/email address/i)).toBeDisabled()
    expect(screen.getByLabelText(/^password$/i)).toBeDisabled()
    expect(screen.getByLabelText(/confirm password/i)).toBeDisabled()
    await user.click(loadingButton)
    expect(onSubmit).toHaveBeenCalledTimes(1)

    await act(async () => deferred.resolve())
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /create account/i }),
      ).toBeEnabled()
    })
  })

  it('clears all values and errors with the reset control', async () => {
    const user = userEvent.setup()

    render(<RegistrationForm onSubmit={vi.fn()} />)
    const firstName = screen.getByLabelText(/first name/i)
    const lastName = screen.getByLabelText(/last name/i)
    const email = screen.getByLabelText(/email address/i)
    const password = screen.getByLabelText(/^password$/i)
    const confirmation = screen.getByLabelText(/confirm password/i)

    await user.type(firstName, 'Amina')
    await user.type(lastName, 'Saleh')
    await user.type(email, 'invalid')
    await user.type(password, 'short')
    await user.type(confirmation, 'different')
    await user.click(screen.getByRole('button', { name: /create account/i }))
    expect(screen.getByText('Enter a valid email address.')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /clear form/i }))

    expect(firstName).toHaveValue('')
    expect(lastName).toHaveValue('')
    expect(email).toHaveValue('')
    expect(password).toHaveValue('')
    expect(confirmation).toHaveValue('')
    expect(email).toHaveAttribute('aria-invalid', 'false')
    expect(screen.queryByText('Enter a valid email address.')).not.toBeInTheDocument()
  })
})
