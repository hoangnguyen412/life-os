/**
 * Route map for the whole application, including layouts and the 404 page.
 * Workspace routes require a verified authenticated session.
 */
import { useEffect } from 'react'
import { matchPath, Navigate, Outlet, Route, Routes, useLocation } from 'react-router'
import AuthLayout from './layouts/AuthLayout.jsx'
import LoginPage from './pages/LoginPage.jsx'
import RegisterPage from './pages/RegisterPage.jsx'
import AppLayout from './layouts/AppLayout.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import TasksPage from './pages/TasksPage.jsx'
import GoalsPage from './pages/GoalsPage.jsx'
import CalendarPage from './pages/CalendarPage.jsx'
import workspaceNavigation from './utils/workspaceNavigation.js'
import NotFoundPage from './pages/NotFoundPage.jsx'
import useAuth from './auth/useAuth.js'
import AppDataProvider from './data/AppDataProvider.jsx'

// Navigation IDs select page components without duplicating URL definitions.
const workspacePages = { dashboard: DashboardPage, tasks: TasksPage, goals: GoalsPage, calendar: CalendarPage }

export default function App() {
  const { pathname } = useLocation()
  // The URL determines both the browser title and the selected workspace page.
  const workspacePage = workspaceNavigation.find((item) => matchPath(item.path, pathname))
  const pageTitle = workspacePage?.label
    ?? (matchPath('/login', pathname) ? 'Sign in'
      : matchPath('/register', pathname) ? 'Create an account' : 'Page not found')

  // Effects update browser state after React renders a new route.
  useEffect(() => {
    document.title = `${pageTitle} | Life OS`
    window.scrollTo(0, 0)
  }, [pathname, pageTitle])

  // Nested routes render inside each layout's Outlet. Replace avoids a redirect loop in Back history.
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route element={<GuestOnly />}>
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Route>
      </Route>
      <Route element={<ProtectedWorkspace />}>
        {workspaceNavigation.map((page) => {
          const Page = workspacePages[page.id]
          return <Route key={page.id} path={page.path} element={<Page />} />
        })}
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

function GuestOnly() {
  const { user, loading, sessionError, retrySession } = useAuth()
  if (loading) return <div className="os-card m-8 py-16 text-center" role="status">Checking your session…</div>
  if (sessionError) return <SessionError message={sessionError} retry={retrySession} />
  return user ? <Navigate to="/dashboard" replace /> : <Outlet />
}

function ProtectedWorkspace() {
  const { user, loading, sessionError, retrySession } = useAuth()
  const location = useLocation()
  if (loading) return <div className="os-card m-8 py-16 text-center" role="status">Checking your session…</div>
  if (sessionError) return <SessionError message={sessionError} retry={retrySession} />
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />
  return <AppDataProvider><AppLayout /></AppDataProvider>
}

function SessionError({ message, retry }) {
  return <div className="os-card m-8 py-12 text-center" role="alert"><p>Could not verify your session: {message}</p><button className="os-button os-button-primary mt-4" onClick={() => retry().catch(() => {})}>Try again</button></div>
}
