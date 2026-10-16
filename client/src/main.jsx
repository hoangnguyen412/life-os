/**
 * Application entry point: mount React in the HTML root element.
 * Router handles URLs; MockDataProvider shares preview data with every page.
 */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import App from './App.jsx'
import './index.css'
import MockDataProvider from './mocks/MockDataProvider.jsx'

// StrictMode runs extra development checks; it is not an authentication guard.
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <MockDataProvider>
        <App />
      </MockDataProvider>
    </BrowserRouter>
  </StrictMode>,
)
