import type { User } from 'firebase/auth'
import { FormEvent, useId, useRef, useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { namesFromDisplayName } from '../../services/profileService'
import type { ProfileDetails, UserProfile } from '../../types/profile'
import {
  hasFieldErrors,
  readableError,
  validateProfileFields,
  type FieldErrors,
} from '../../utils/validation'

function profileValues(
  profile: ProfileDetails | null,
  displayName: string | null | undefined,
): ProfileDetails {
  const fallbackNames = namesFromDisplayName(displayName)
  return {
    firstName: profile?.firstName ?? fallbackNames.firstName,
    lastName: profile?.lastName ?? fallbackNames.lastName,
    region: profile?.region ?? '',
    phoneNumber: profile?.phoneNumber ?? '',
  }
}

export default function ProfilePage() {
  const { user, profile, profileLoading, profileError, saveProfile } = useAuth()

  if (profileLoading) {
    return (
      <div className="route-loading" role="status">
        <span className="spinner" aria-hidden="true" />
        Loading your profile…
      </div>
    )
  }

  if (!user) {
    return (
      <div className="standard-page page-width">
        <header className="page-heading">
          <p className="eyebrow">Account required</p>
          <h1>Profile unavailable</h1>
          <p>Sign in to view and update your profile.</p>
        </header>
      </div>
    )
  }

  if (profileError && !profile) {
    return (
      <div className="standard-page page-width">
        <header className="page-heading">
          <p className="eyebrow">Your account</p>
          <h1>Profile unavailable</h1>
          <p>We could not safely load your saved profile.</p>
        </header>
        <div className="form-alert" role="alert">{profileError}</div>
      </div>
    )
  }

  return (
    <ProfileEditor
      key={user.uid}
      user={user}
      profile={profile}
      profileError={profileError}
      saveProfile={saveProfile}
    />
  )
}

interface ProfileEditorProps {
  user: User
  profile: UserProfile | null
  profileError: string | null
  saveProfile: (details: ProfileDetails) => Promise<void>
}

function ProfileEditor({
  user,
  profile,
  profileError,
  saveProfile,
}: ProfileEditorProps) {
  const initialValues = profileValues(profile, user.displayName)
  const [firstName, setFirstName] = useState(initialValues.firstName)
  const [lastName, setLastName] = useState(initialValues.lastName)
  const [region, setRegion] = useState(initialValues.region)
  const [phoneNumber, setPhoneNumber] = useState(initialValues.phoneNumber)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const firstNameId = useId()
  const lastNameId = useId()
  const regionId = useId()
  const phoneNumberId = useId()
  const formErrorRef = useRef<HTMLDivElement>(null)

  function resetForm() {
    const nextValues = profileValues(profile, user.displayName)
    setFirstName(nextValues.firstName)
    setLastName(nextValues.lastName)
    setRegion(nextValues.region)
    setPhoneNumber(nextValues.phoneNumber)
    setErrors({})
    setFormError('')
    setSuccessMessage('')
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isSubmitting) return

    const nextErrors = validateProfileFields(
      firstName,
      lastName,
      region,
      phoneNumber,
    )
    setErrors(nextErrors)
    setFormError('')
    setSuccessMessage('')
    if (hasFieldErrors(nextErrors)) return

    setIsSubmitting(true)
    try {
      await saveProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        region: region.trim(),
        phoneNumber: phoneNumber.trim(),
      })
      setSuccessMessage('Your profile was saved.')
    } catch (error) {
      setFormError(readableError(error, 'Unable to save your profile.'))
      requestAnimationFrame(() => formErrorRef.current?.focus())
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="standard-page page-width">
      <header className="page-heading">
        <p className="eyebrow">Your account</p>
        <h1>Profile</h1>
        <p>Keep your account details current across your signed-in devices.</p>
      </header>

      <section className="auth-panel profile-panel" aria-labelledby="profile-form-heading">
        <p className="eyebrow">Personal details</p>
        <h2 id="profile-form-heading">Edit profile</h2>
        <p>
          Signed in as <strong>{user.email ?? 'an account without a public email'}</strong>
        </p>

        {profileError && <div className="form-alert" role="alert">{profileError}</div>}
        {formError && (
          <div
            className="form-alert"
            ref={formErrorRef}
            role="alert"
            tabIndex={-1}
          >
            {formError}
          </div>
        )}
        <p aria-live="polite" role="status">
          {successMessage}
        </p>

        <form className="auth-form" onSubmit={handleSubmit} onReset={resetForm} noValidate>
          <fieldset disabled={isSubmitting}>
            <legend>Profile details</legend>
            <div className="field-group">
              <label htmlFor={firstNameId}>First name</label>
              <input
                id={firstNameId}
                name="firstName"
                type="text"
                autoComplete="given-name"
                value={firstName}
                onChange={(event) => {
                  setFirstName(event.target.value)
                  if (errors.firstName) {
                    setErrors((current) => ({ ...current, firstName: undefined }))
                  }
                }}
                aria-invalid={Boolean(errors.firstName)}
                aria-describedby={errors.firstName ? `${firstNameId}-error` : undefined}
              />
              {errors.firstName && (
                <p className="field-error" id={`${firstNameId}-error`}>
                  {errors.firstName}
                </p>
              )}
            </div>

            <div className="field-group">
              <label htmlFor={lastNameId}>Last name</label>
              <input
                id={lastNameId}
                name="lastName"
                type="text"
                autoComplete="family-name"
                value={lastName}
                onChange={(event) => {
                  setLastName(event.target.value)
                  if (errors.lastName) {
                    setErrors((current) => ({ ...current, lastName: undefined }))
                  }
                }}
                aria-invalid={Boolean(errors.lastName)}
                aria-describedby={errors.lastName ? `${lastNameId}-error` : undefined}
              />
              {errors.lastName && (
                <p className="field-error" id={`${lastNameId}-error`}>
                  {errors.lastName}
                </p>
              )}
            </div>

            <div className="field-group">
              <label htmlFor={regionId}>Region</label>
              <input
                id={regionId}
                name="region"
                type="text"
                autoComplete="country-name"
                value={region}
                onChange={(event) => {
                  setRegion(event.target.value)
                  if (errors.region) {
                    setErrors((current) => ({ ...current, region: undefined }))
                  }
                }}
                aria-invalid={Boolean(errors.region)}
                aria-describedby={errors.region ? `${regionId}-error` : `${regionId}-hint`}
              />
              <p className="field-hint" id={`${regionId}-hint`}>Optional</p>
              {errors.region && (
                <p className="field-error" id={`${regionId}-error`}>
                  {errors.region}
                </p>
              )}
            </div>

            <div className="field-group">
              <label htmlFor={phoneNumberId}>Phone number</label>
              <input
                id={phoneNumberId}
                name="phoneNumber"
                type="tel"
                autoComplete="tel"
                value={phoneNumber}
                onChange={(event) => {
                  setPhoneNumber(event.target.value)
                  if (errors.phoneNumber) {
                    setErrors((current) => ({ ...current, phoneNumber: undefined }))
                  }
                }}
                aria-invalid={Boolean(errors.phoneNumber)}
                aria-describedby={
                  errors.phoneNumber
                    ? `${phoneNumberId}-hint ${phoneNumberId}-error`
                    : `${phoneNumberId}-hint`
                }
              />
              <p className="field-hint" id={`${phoneNumberId}-hint`}>Optional</p>
              {errors.phoneNumber && (
                <p className="field-error" id={`${phoneNumberId}-error`}>
                  {errors.phoneNumber}
                </p>
              )}
            </div>

            <div className="auth-form__actions">
              <button className="button button--accent" type="submit">
                {isSubmitting ? 'Saving profile…' : 'Save profile'}
              </button>
              <button className="button button--text" type="reset">
                Reset
              </button>
            </div>
          </fieldset>
        </form>
      </section>
    </div>
  )
}
