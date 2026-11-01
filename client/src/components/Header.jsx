/**
 * Workspace header receives the current page title from AppLayout.
 * The authenticated session is shown in the sidebar.
 */
export default function Header({ title }) {
  return (
    <header className="flex min-h-20 flex-wrap items-center justify-between gap-3 border-b border-os-line bg-os-bg px-6 py-4 sm:px-8 lg:px-12">
      <div>
        <p className="text-[11px] tracking-wide text-os-muted">Your personal workspace</p>
        <p className="mt-1 text-base font-medium">{title}</p>
      </div>
    </header>
  )
}
