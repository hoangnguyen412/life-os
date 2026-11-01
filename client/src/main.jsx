/**
 * Application entry point: mount the router and shared authentication state.
 */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import App from './App.jsx'
import './index.css'
import AuthProvider from './auth/AuthProvider.jsx'

// StrictMode runs extra development checks; it is not an authentication guard.
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
