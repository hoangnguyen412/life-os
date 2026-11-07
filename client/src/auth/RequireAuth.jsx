/** Never render the workspace until a login or /auth/me has confirmed the user. */
import { Navigate, Outlet, useLocation } from 'react-router'
import useAuth from '../hooks/useAuth.js'

export default function RequireAuth() {
  const { status, error, retry, logout } = useAuth()
  const location = useLocation()
  if (status === 'loading') {
    return <main className="flex min-h-dvh items-center justify-center bg-os-canvas p-6"><p role="status">Checking your session…</p></main>
  }
  if (status === 'error') {
    return <main className="flex min-h-dvh items-center justify-center bg-os-canvas p-6"><div className="os-card w-full max-w-md"><h1 className="text-xl font-medium">Could not verify your session</h1><p role="alert" className="mt-3 text-os-muted">{error}</p><div className="mt-6 flex flex-wrap gap-3"><button className="os-button os-button-primary" onClick={() => { void retry() }}>Try again</button><button className="os-button" onClick={logout}>Back to sign in</button></div></div></main>
  }
  if (status !== 'authenticated') {
    return <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}${location.hash}` }} />
  }
  return <Outlet />
}
