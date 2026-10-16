/**
 * Simulated loading/error feedback controlled by PreviewToolbar.
 * Try again restores normal preview mode; it does not retry a network request yet.
 */
import useMockData from '../../hooks/useMockData.js'

export default function PreviewState() {
  const { viewState, setViewState } = useMockData()
  if (viewState === 'loading') return <div role="status" className="os-card py-16 text-center"><div aria-hidden="true" className="mx-auto mb-5 h-2 w-24 rounded bg-os-primary-soft motion-safe:animate-pulse" /><h2 className="text-lg font-medium">Loading your workspace…</h2><p className="mt-2 text-os-muted">Your data is being loaded.</p></div>
  return <div role="alert" className="os-card py-16 text-center"><h2 className="text-lg font-medium">Could not load your data</h2><p className="mt-2 mb-5 text-os-muted">Please try again.</p><button className="os-button os-button-primary" onClick={() => setViewState('normal')}>Try again</button></div>
}
