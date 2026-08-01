import { useState } from 'react'
import { Link, NavLink, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { readableError } from '../../utils/validation'
import { SearchForm } from '../SearchForm/SearchForm'

export function Navbar() {
  const { user, loading, logout } = useAuth()
  const [logoutError, setLogoutError] = useState('')
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const activeQuery = location.pathname === '/search' ? searchParams.get('q') ?? '' : ''

  function handleSearch(query: string) {
    navigate(`/search?q=${encodeURIComponent(query)}`)
  }

  async function handleLogout() {
    setLogoutError('')
    try {
      await logout()
      navigate('/')
    } catch (error) {
      setLogoutError(readableError(error, 'Unable to log out right now.'))
    }
  }

  return (
    <header className="navbar-wrap">
      <nav className="navbar page-width" aria-label="Primary navigation">
        <Link className="brand" to="/" aria-label="ReelVault home">
          <span className="brand__mark" aria-hidden="true"><span /></span>
          <span>ReelVault</span>
        </Link>
        <div className="navbar__links">
          <NavLink to="/" end>Home</NavLink>
          <NavLink to="/favourites">Favourites</NavLink>
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
            <details className="user-menu">
              <summary aria-label="Open user menu">
                <span className="user-menu__avatar" aria-hidden="true">
                  {(user.email?.[0] ?? 'U').toUpperCase()}
                </span>
                <span className="user-menu__email">{user.email}</span>
              </summary>
              <div className="user-menu__popover">
                <p>Signed in as</p>
                <strong>{user.email}</strong>
                <Link to="/favourites">My favourites</Link>
                <button type="button" onClick={handleLogout}>Log out</button>
              </div>
            </details>
          ) : (
            <Link className="button button--nav" to="/auth">Log in</Link>
          )}
        </div>
      </nav>
      {logoutError && <p className="navbar__error" role="alert">{logoutError}</p>}
    </header>
  )
}
