/**
 * Shared workspace shell: Sidebar, Header, preview controls and routed content.
 * Page-specific interfaces render in Outlet rather than repeating the shell.
 */
import Header from '../components/Header.jsx'
import Sidebar from '../components/Sidebar.jsx'
import { useEffect, useRef } from 'react'
import { matchPath, Outlet, useLocation } from 'react-router'
import workspaceNavigation from '../utils/workspaceNavigation.js'
import PreviewToolbar from '../components/workspace/PreviewToolbar.jsx'

export default function AppLayout() {
  const { pathname } = useLocation()
  const page = workspaceNavigation.find((item) => matchPath(item.path, pathname))
  const content = useRef(null)

  // Move keyboard focus to the new page while leaving scroll position management to App.
  useEffect(() => {
    content.current?.focus({ preventScroll: true })
  }, [pathname])

  // The skip link bypasses navigation for keyboard users; main is programmatically focusable.
  return (
    <div className="min-h-dvh bg-os-canvas md:grid md:grid-cols-[240px_minmax(0,1fr)]">
      <a href="#workspace-content" className="sr-only z-50 rounded-lg bg-os-primary px-4 py-3 text-white focus:not-sr-only focus:fixed focus:top-3 focus:left-3">
        Skip to content
      </a>
      {/* Reset mobile menu state on route changes, including Back/Forward. */}
      <Sidebar key={pathname} />
      <div className="min-w-0">
        <Header title={page?.label ?? 'Life OS'} />
        <main ref={content} id="workspace-content" tabIndex={-1} className="px-6 py-8 outline-none sm:px-8 lg:px-12 lg:py-10">
          <PreviewToolbar />
          <Outlet />
        </main>
      </div>
    </div>
  )
}
