import { useEffect, useState } from 'react'
import * as goalApi from '../../services/goalApi.js'
import { formatTaskDate } from '../../utils/taskForm.js'
import { progressError } from '../../utils/goalForm.js'
import Modal from '../workspace/Modal.jsx'
import GoalForm from './GoalForm.jsx'

export default function GoalDialog({ dialog, onClose, onSaved }) {
  const [goal, setGoal] = useState(null)
  const [mode, setMode] = useState(dialog.mode)
  const [loading, setLoading] = useState(Boolean(dialog.id))
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [progress, setProgress] = useState('0')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!dialog.id) return
    let active = true
    const controller = new AbortController()
    goalApi.getGoal(dialog.id, { signal: controller.signal }).then((result) => {
      if (active) { setGoal(result.data); setProgress(String(result.data.manualProgress ?? result.data.progress)) }
    }).catch((failure) => { if (active) setError(failure.message) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false; controller.abort() }
  }, [dialog.id, attempt])

  function close() { if (!pending) onClose() }
  function changeMode(next) { setError(''); setMode(next) }

  async function save(payload) {
    setPending(true)
    try {
      if (goal) await goalApi.updateGoal(goal._id, payload)
      else await goalApi.createGoal(payload)
      onSaved(goal ? 'Goal updated.' : 'Goal created.')
      onClose()
    } finally { setPending(false) }
  }

  async function saveProgress(event) {
    event.preventDefault()
    if (pending) return
    const validation = progressError(progress)
    setError(validation)
    if (validation) return
    setPending(true)
    try {
      const result = await goalApi.updateGoalProgress(goal._id, Number(progress))
      setGoal(result.data)
      setProgress(String(result.data.manualProgress))
      onSaved('Goal progress updated.')
    } catch (failure) { setError(failure.message) }
    finally { setPending(false) }
  }

  async function remove() {
    setPending(true)
    setError('')
    try { await goalApi.deleteGoal(goal._id); onSaved('Goal deleted. Linked tasks were kept.'); onClose() }
    catch (failure) { setError(failure.message) }
    finally { setPending(false) }
  }

  const title = mode === 'create' ? 'Add goal' : mode === 'edit' ? 'Edit goal' : mode === 'delete' ? 'Delete goal?' : goal?.title || 'Goal details'
  return <Modal title={title} onClose={close}>
    {loading ? <p role="status">Loading goal…</p>
      : dialog.id && !goal ? <><p role="alert" className="text-red-700">{error || 'This goal could not be found.'}</p><button className="os-button mt-4" onClick={() => { setError(''); setLoading(true); setAttempt((value) => value + 1) }}>Try again</button></>
        : mode === 'create' || mode === 'edit' ? <GoalForm goal={goal} pending={pending} onSave={save} onCancel={close} />
          : <div aria-busy={pending}>
            {mode === 'delete' ? <><p className="font-medium break-words">{goal.title}</p><p className="mt-3 text-os-muted">Delete this goal permanently? Linked tasks will be kept and unlinked from this goal.</p></>
              : <>
                <dl className="grid gap-5 sm:grid-cols-2">{[['Status', goal.status === 'completed' ? 'Completed' : 'Active'], ['Deadline', formatTaskDate(goal.deadline)], ['Progress', `${goal.progress}%`], ['Progress mode', goal.progressMode === 'manual' ? 'Manual' : 'Based on completed tasks']].map(([label, value]) => <div key={label}><dt className="text-xs text-os-muted">{label}</dt><dd className="mt-1 font-medium">{value}</dd></div>)}</dl>
                {goal.progressMode === 'manual' ? <form noValidate onSubmit={saveProgress} className="mt-6"><label htmlFor="goal-progress">Manual progress (%)</label><div className="mt-2 flex gap-3"><input id="goal-progress" type="number" min="0" max="100" step="1" className="os-input" value={progress} disabled={pending} onChange={(event) => { setProgress(event.target.value); setError('') }} /><button className="os-button shrink-0" disabled={pending}>Save progress</button></div></form>
                  : <p className="mt-6 text-sm text-os-muted">Progress is calculated by the server from linked tasks. Complete tasks on the Tasks page to update it.</p>}
              </>}
            {error && <p role="alert" className="mt-5 text-sm text-red-700">{error}</p>}
            {pending && <p role="status" className="mt-4 text-sm text-os-muted">Saving…</p>}
            <div className="mt-6 flex justify-end gap-3 border-t border-os-line pt-5">{mode === 'delete' ? <><button className="os-button" disabled={pending} onClick={() => changeMode('detail')}>Cancel</button><button className="os-button os-button-danger" disabled={pending} onClick={() => { void remove() }}>Confirm deletion</button></>
              : <><button className="os-button" disabled={pending} onClick={() => changeMode('edit')}>Edit</button><button className="os-button os-button-danger" disabled={pending} onClick={() => changeMode('delete')}>Delete</button></>}</div>
          </div>}
  </Modal>
}
