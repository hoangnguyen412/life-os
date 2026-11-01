/**
 * Loading and retry feedback for API-backed workspace data.
 */
import useAppData from '../../data/useAppData.js'

export default function PreviewState() {
  const { loading, error, refresh } = useAppData()
  if (!loading && !error) return null
  if (loading) return <div role="status" className="os-card py-16 text-center"><div aria-hidden="true" className="mx-auto mb-5 h-2 w-24 rounded bg-os-primary-soft motion-safe:animate-pulse" /><h2 className="text-lg font-medium">Loading your workspace…</h2><p className="mt-2 text-os-muted">Your data is being loaded.</p></div>
  return <div role="alert" className="os-card py-16 text-center"><h2 className="text-lg font-medium">Could not load your data</h2><p className="mt-2 mb-5 text-os-muted">{error}</p><button className="os-button os-button-primary" onClick={() => refresh().catch(() => {})}>Try again</button></div>
}
