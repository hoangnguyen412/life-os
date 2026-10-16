/**
 * Resource dialog coordinator: resolve the latest record and choose detail/form/delete UI.
 * Reused across Dashboard, Tasks, Goals and Calendar, including deadline Task views.
 */
import { useState } from 'react'
import { Link } from 'react-router'
import useMockData from '../../hooks/useMockData.js'
import { formatDate, formatTime } from '../../utils/dates.js'
import Modal from './Modal.jsx'
import ResourceForm from './ResourceForm.jsx'

// Read-only field lists plus quick task-status or manual-goal-progress controls.
// Linked goal tasks are read from shared state; the link filters the Tasks route by goalId.
function ResourceDetails({ kind, item, onClose, onChangeMode }) {
  const { goals, tasks, save, updateProgress } = useMockData()
  const [progress, setProgress] = useState(String(item.manualProgress ?? 0))
  const [error, setError] = useState('')
  // Format fields for presentation without writing display labels back to records.
  const fields = kind === 'task' ? [['Status', item.status.replace('_', ' ')], ['Priority', item.priority], ['Due date', formatDate(item.dueDate)], ['Goal', goals.find((goal) => goal._id === item.goalId)?.title ?? 'No linked goal']]
    : kind === 'goal' ? [['Deadline', formatDate(item.deadline)], ['Status', item.status], ['Progress mode', item.progressMode === 'manual' ? 'Manual' : 'Task-based'], ['Progress', `${item.progress}%`]]
      : [['Start', `${formatDate(item.startTime)} · ${formatTime(item.startTime)}`], ['End', `${formatDate(item.endTime)} · ${formatTime(item.endTime)}`]]
  // A manual progress update must be a whole number from 0 through 100.
  function submitProgress(event) {
    event.preventDefault()
    const number = Number(progress)
    if (progress === '' || !Number.isInteger(number) || number < 0 || number > 100) { setError('Progress must be a whole number from 0 to 100.'); return }
    setError(''); updateProgress(item._id, number)
  }
  return <><dl className="grid gap-5 sm:grid-cols-2">{fields.map(([label, value]) => <div key={label}><dt className="text-xs text-os-muted">{label}</dt><dd className="mt-1 font-medium break-words">{value}</dd></div>)}</dl>
    {item.description && <div className="mt-6"><h3 className="mb-2 font-medium">Description</h3><p className="whitespace-pre-wrap break-words text-os-muted">{item.description}</p></div>}
    {kind === 'task' && <label className="mt-6 block">Update status<select className="os-input" value={item.status} onChange={(event) => save('task', { title: item.title, description: item.description, status: event.target.value, priority: item.priority, dueDate: item.dueDate, goalId: item.goalId }, item._id)}><option value="todo">To do</option><option value="in_progress">In progress</option><option value="done">Completed</option></select></label>}
    {kind === 'goal' && <div className="mt-6 border-t border-os-line pt-5">{item.progressMode === 'manual' ? <form onSubmit={submitProgress} noValidate><label className="block">Update progress (%)<input className="os-input" type="number" min={0} max={100} step={1} value={progress} onChange={(event) => { setProgress(event.target.value); setError('') }} aria-invalid={Boolean(error)} aria-describedby={error ? 'progress-error' : undefined} /></label>{error && <p id="progress-error" role="alert" className="mt-2 text-sm text-red-700">{error}</p>}<button className="os-button os-button-primary mt-3">Save progress</button></form> : <p className="text-sm text-os-muted">Progress is calculated from completed tasks.</p>}<h3 className="mt-6 mb-3 font-medium">Tasks linked to this goal</h3>{tasks.filter((task) => task.goalId === item._id).map((task) => <p key={task._id} className="border-b border-os-line py-3 text-sm">{task.title} <span className="text-os-muted">· {task.status.replace('_', ' ')}</span></p>)}{!tasks.some((task) => task.goalId === item._id) && <p className="text-sm text-os-muted">No linked tasks yet.</p>}<Link to={`/tasks?goalId=${item._id}`} onClick={onClose} className="os-button mt-4">View linked tasks</Link></div>}
    <div className="mt-7 flex flex-wrap justify-end gap-3 border-t border-os-line pt-5"><button className="os-button" onClick={() => onChangeMode('edit')}>Edit</button><button className="os-button os-button-danger" onClick={() => onChangeMode('delete')}>Delete</button></div>
  </>
}

// null renders no modal. Mode keys reset drafts when switching between create and edit.
// Deletion requires confirmation; the provider enforces unlink/recalculation rules.
export default function ResourceDialog({ dialog, onClose, onChangeMode }) {
  const store = useMockData()
  if (!dialog) return null
  const { kind, mode, id, defaults } = dialog
  // Resolve by id on every render so edits never leave a stale copy in the dialog.
  const item = store[{ task: 'tasks', goal: 'goals', event: 'events' }[kind]].find((item) => item._id === id)
  const title = mode === 'create' ? `Add ${kind}` : mode === 'edit' ? `Edit ${kind}` : mode === 'delete' ? `Delete ${kind}?` : item?.title ?? 'Item not found'
  return <Modal title={title} onClose={onClose}>
    {mode === 'create' || mode === 'edit' ? <ResourceForm key={`${kind}-${id}-${mode}`} kind={kind} item={item} defaults={defaults} onClose={onClose} />
      : mode === 'delete' ? <><p className="font-medium break-words">{item?.title}</p><p className="mt-3 mb-7 text-os-muted">{kind === 'goal' ? 'Linked tasks will be kept and unlinked from this goal.' : 'This item will be removed from the preview.'}</p><div className="flex justify-end gap-3"><button className="os-button" onClick={() => onChangeMode('detail')}>Cancel</button><button className="os-button os-button-danger" onClick={() => { store.remove(kind, id); onClose() }}>Confirm deletion</button></div></>
        : item ? <ResourceDetails key={item._id} kind={kind} item={item} onClose={onClose} onChangeMode={onChangeMode} /> : <p>This item could not be found.</p>}
  </Modal>
}
