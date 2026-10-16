/**
 * Demo controls for loading/error states, empty collections and resetting sample records.
 * Native details keeps the controls collapsed until needed during testing or a demo.
 * Provider notices announce shared create/edit/delete feedback through role="status".
 */
import useMockData from '../../hooks/useMockData.js'

export default function PreviewToolbar() {
  const { viewState, setViewState, reset, empty, notice } = useMockData()
  return (
    <div className="mb-8">
      <details className="rounded-xl border border-dashed border-os-line bg-os-bg px-4 py-3 text-xs text-os-muted">
        <summary className="cursor-pointer">Sample data · Changes reset on refresh <span className="ml-2 text-os-primary">Preview controls</span></summary>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <label>Preview state<select aria-label="Preview state" className="os-input" value={viewState} onChange={(event) => setViewState(event.target.value)}><option value="normal">Normal</option><option value="loading">Loading</option><option value="error">Error</option></select></label>
          <button className="os-button" onClick={empty}>Empty data</button>
          <button className="os-button" onClick={reset}>Reset sample data</button>
        </div>
      </details>
      {notice && <p role="status" className="mt-3 rounded-lg border-l-2 border-os-primary bg-os-primary-soft px-4 py-3 text-sm">{notice}</p>}
    </div>
  )
}
