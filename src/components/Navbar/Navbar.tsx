import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { readableError } from '../../utils/validation'
import { SearchForm } from '../SearchForm/SearchForm'

function firstDisplayNamePart(displayName: string | null): string {
  return displayName?.trim().split(/\s+/)[0] ?? ''
}

function accountInitials(
  firstName: string,
  lastName: string,
  displayName: string | null,
): string {
  const profileInitials = [firstName, lastName]
    .map((part) => part.trim().charAt(0))
    .filter(Boolean)
    .join('')

  if (profileInitials) return profileInitials.slice(0, 2).toUpperCase()

  return (displayName?.trim().split(/\s+/).slice(0, 2).map((part) => part.charAt(0)).join('') ?? '')
    .toUpperCase()
}

function GenericProfileIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8a7 7 0 0 1 14 0" />
    </svg>
  )
}

export function Navbar() {
  const { user, profile, loading, logout } = useAuth()
  const [logoutError, setLogoutError] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [failedPhotoUrl, setFailedPhotoUrl] = useState<string | null>(null)
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const menuRef = useRef<HTMLDivElement>(null)
  const menuButtonRef = useRef<HTMLButtonElement>(null)
  const activeQuery = location.pathname === '/search' ? searchParams.get('q') ?? '' : ''

  const profileFirstName = profile?.firstName.trim() ?? ''
  const profileLastName = profile?.lastName.trim() ?? ''
  const accountName = profileFirstName || firstDisplayNamePart(user?.displayName ?? null) || 'Account'
  const initials = accountInitials(profileFirstName, profileLastName, user?.displayName ?? null)
  const photoUrl = user?.photoURL && user.photoURL !== failedPhotoUrl
    ? user.photoURL
    : null

  useEffect(() => {
    if (!menuOpen) return

    const firstAction = menuRef.current?.querySelector<HTMLElement>('a, button')
    firstAction?.focus()

    function handlePointerDown(event: PointerEvent) {
      const target = event.target
      if (target instanceof Node && !menuRef.current?.contains(target) && !menuButtonRef.current?.contains(target)) {
        setMenuOpen(false)
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return
      setMenuOpen(false)
      menuButtonRef.current?.focus()
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [menuOpen])

  function handleSearch(query: string) {
    setMenuOpen(false)
    navigate(`/search?q=${encodeURIComponent(query)}`)
  }

  async function handleLogout() {
    setLogoutError('')
    try {
      await logout()
      setMenuOpen(false)
      navigate('/')
    } catch (error) {
      setLogoutError(readableError(error, 'Unable to log out right now.'))
    }
  }

  return (
    <header className="navbar-wrap">
      <nav className="navbar page-width" aria-label="Primary navigation">
        <Link className="brand" to="/" aria-label="Strex home" onClick={() => setMenuOpen(false)}>
          <span className="brand__mark" aria-hidden="true"><span>S</span></span>
          <span>Strex</span>
        </Link>
        <div className="navbar__links">
          <NavLink to="/" end onClick={() => setMenuOpen(false)}>Home</NavLink>
          <NavLink to="/favourites" onClick={() => setMenuOpen(false)}>Favourites</NavLink>
          <NavLink to="/watchlist" onClick={() => setMenuOpen(false)}>Watchlist</NavLink>
        </div>
        <div className="navbar__search">
          <SearchForm
            key={activeQuery}
            compact
            initialQuery={activeQuery}
            onSearch={handleSearch}
            onClear={() => {
              if (location.pathname === '/search') navigate('/search')
            }}
          />
        </div>
        <div className="navbar__account">
          {loading ? (
            <span className="account-placeholder" aria-label="Loading account" />
          ) : user ? (
            <div className="user-menu">
              <button
                ref={menuButtonRef}
                className="user-menu__trigger"
                type="button"
                aria-expanded={menuOpen}
                aria-controls="account-menu"
                onClick={() => setMenuOpen((open) => !open)}
              >
                <span className="user-menu__avatar">
                  {photoUrl ? (
                    <img
                      src={photoUrl}
                      alt={`${accountName}'s profile`}
                      referrerPolicy="no-referrer"
                      onError={() => setFailedPhotoUrl(photoUrl)}
                    />
                  ) : initials ? (
                    <span aria-hidden="true">{initials}</span>
                  ) : (
                    <GenericProfileIcon />
                  )}
                </span>
                <span className="user-menu__name">{accountName}</span>
                <span className="user-menu__chevron" aria-hidden="true">⌄</span>
              </button>
              {menuOpen && (
                <div id="account-menu" ref={menuRef} className="user-menu__popover" aria-label="Account menu">
                  {user.email && <p>{user.email}</p>}
                  <Link to="/profile" onClick={() => setMenuOpen(false)}>Profile</Link>
                  <Link to="/favourites" onClick={() => setMenuOpen(false)}>My favourites</Link>
                  <Link to="/watchlist" onClick={() => setMenuOpen(false)}>My watchlist</Link>
                  <button type="button" onClick={handleLogout}>Log out</button>
                </div>
              )}
            </div>
          ) : (
            <Link
              className="button button--nav"
              to="/auth"
              state={{ from: `${location.pathname}${location.search}${location.hash}` }}
            >
              Log in
            </Link>
          )}
        </div>
      </nav>
      {logoutError && <p className="navbar__error" role="alert">{logoutError}</p>}
    </header>
  )
}
