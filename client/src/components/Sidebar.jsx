/**
 * Workspace navigation: shared logo, active route links and a collapsible mobile menu.
 * Sign out currently returns to Login only; there is no real session to revoke.
 */
import { useRef, useState } from 'react'
import { Link, NavLink } from 'react-router'
import Brand from './Brand.jsx'
import Icon from './Icon.jsx'
import workspaceNavigation from '../utils/workspaceNavigation.js'

export default function Sidebar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuButton = useRef(null)

  // Preserve modifier-click behavior (for example, opening a link in another tab).
  function closeMenu(event) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    setMenuOpen(false)
    // Restore focus only when the mobile menu button is visible.
    if (menuButton.current?.offsetParent !== null) {
      menuButton.current?.focus()
    }
  }

  // NavLink computes isActive from the URL. CSS keeps navigation open on desktop.
  return (
    <aside aria-label="Workspace sidebar" className="flex flex-col border-b border-os-line bg-os-bg md:sticky md:top-0 md:h-dvh md:border-r md:border-b-0">
      <div className="flex items-center justify-between gap-4 px-6 py-5 md:px-7 md:py-8">
        <Brand />
        <button ref={menuButton} type="button" aria-label={menuOpen ? 'Close navigation' : 'Open navigation'} aria-controls="workspace-navigation" aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)} className="flex size-11 items-center justify-center rounded-lg border border-os-line hover:bg-os-soft md:hidden">
          <Icon name={menuOpen ? 'close' : 'menu'} />
        </button>
      </div>

      <div id="workspace-navigation" className={`${menuOpen ? 'flex' : 'hidden'} flex-1 flex-col px-4 pb-5 md:flex md:pb-6`}>
        <p className="mb-3 px-3 text-[11px] font-semibold tracking-[0.16em] text-os-muted">WORKSPACE</p>
        <nav aria-label="App navigation" className="space-y-2">
          {workspaceNavigation.map((item) => (
            <NavLink key={item.id} to={item.path} end onClick={closeMenu} className={({ isActive }) => `flex min-h-12 w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition-colors ${isActive ? 'bg-os-primary-soft font-semibold text-os-primary' : 'text-os-muted hover:bg-os-soft hover:text-os-ink'}`}>
              {({ isActive }) => (
                <>
                  <Icon name={item.icon} />
                  {item.label}
                  {isActive && <span aria-hidden="true" className="ml-auto size-1.5 rounded-full bg-os-primary" />}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="mt-8 border-t border-os-line pt-5 md:mt-auto">
          <div className="mb-4 flex items-center gap-3 px-3">
            <span aria-hidden="true" className="flex size-9 items-center justify-center rounded-full bg-os-soft font-medium text-os-primary">D</span>
            <div>
              <p className="font-medium">Demo workspace</p>
              <p className="text-xs text-os-muted">Preview session</p>
            </div>
          </div>
          <Link to="/login" replace className="flex min-h-11 w-full items-center gap-3 rounded-lg px-4 py-3 text-os-muted hover:bg-os-soft hover:text-os-ink">
            <Icon name="logout" />
            Sign out
          </Link>
        </div>
      </div>
    </aside>
  )
}
