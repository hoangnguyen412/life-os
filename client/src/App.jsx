/**
 * Route map for the whole application, including layouts and the 404 page.
 * Workspace routes are public previews until real authentication is connected.
 */
import { useEffect } from 'react'
import { matchPath, Navigate, Route, Routes, useLocation } from 'react-router'
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
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>
      <Route element={<AppLayout />}>
        {workspaceNavigation.map((page) => {
          const Page = workspacePages[page.id]
          return <Route key={page.id} path={page.path} element={<Page />} />
        })}
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
