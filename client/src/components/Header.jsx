/**
 * Workspace header receives the current page title from AppLayout.
 * Account details come from the verified session, while workspace records remain mock.
 */
import useAuth from '../hooks/useAuth.js'

export default function Header({ title }) {
  const { user } = useAuth()
  return (
    <header className="flex min-h-20 flex-wrap items-center justify-between gap-3 border-b border-os-line bg-os-bg px-6 py-4 sm:px-8 lg:px-12">
      <div>
        <p className="text-[11px] tracking-wide text-os-muted">Your personal workspace</p>
        <p className="mt-1 text-base font-medium">{title}</p>
      </div>
      <span className="max-w-full truncate rounded-full border border-os-line bg-os-canvas px-3 py-1 text-xs text-os-muted" title={user?.email}>{user?.name || user?.email}</span>
    </header>
  )
}
