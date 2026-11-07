/**
 * Application entry point: mount React in the HTML root element.
 * Router handles URLs; AuthProvider verifies the session before protected routes render.
 */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import App from './App.jsx'
import './index.css'
import AuthProvider from './auth/AuthProvider.jsx'

// StrictMode runs additional development checks for React components.
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
