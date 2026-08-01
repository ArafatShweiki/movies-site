import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { App } from './App'
import { AuthProvider } from './context/AuthContext'
import { FavouritesProvider } from './context/FavouritesContext'
import { WatchlistProvider } from './context/WatchlistContext'
import './index.css'

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('Unable to find the application root element.')
}

createRoot(rootElement).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <FavouritesProvider>
          <WatchlistProvider>
            <App />
          </WatchlistProvider>
        </FavouritesProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
