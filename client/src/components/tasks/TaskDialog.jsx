/** Real Task details, editing and deletion. All writes use taskApi and server results. */
import { useEffect, useState } from 'react'
import * as taskApi from '../../services/taskApi.js'
import { formatTaskDate } from '../../utils/taskForm.js'
import Modal from '../workspace/Modal.jsx'
import TaskForm from './TaskForm.jsx'

export default function TaskDialog({ dialog, goals, onClose, onSaved }) {
  const [task, setTask] = useState(null)
  const [mode, setMode] = useState(dialog.mode)
  const [loading, setLoading] = useState(Boolean(dialog.id))
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)

  // Read fresh details before editing, even if the list was loaded earlier.
  useEffect(() => {
    if (!dialog.id) return
    let active = true
    taskApi.getTask(dialog.id).then((result) => {
      if (active) setTask(result.data)
    }).catch((failure) => {
      if (active) setError(failure.message)
    }).finally(() => {
      if (active) setLoading(false)
    })
    return () => { active = false }
  }, [dialog.id, attempt])

  // Keep the dialog open while a mutation is in progress to avoid accidental repeats.
  function close() { if (!pending) onClose() }
  function retry() { setError(''); setLoading(true); setAttempt((current) => current + 1) }
  function changeMode(next) { setError(''); setMode(next) }

  async function save(payload) {
    setPending(true)
    try {
      if (task) await taskApi.updateTask(task._id, payload)
      else await taskApi.createTask(payload)
      onSaved(task ? 'Task updated.' : 'Task created.')
      onClose()
    } finally {
      setPending(false)
    }
  }

  async function changeStatus(status) {
    setPending(true)
    setError('')
    try {
      // PUT needs the full editable record, not only the changed status.
      const result = await taskApi.updateTask(task._id, { ...task, status })
      setTask(result.data)
      onSaved('Task status updated.')
    } catch (failure) {
      setError(failure.message)
    } finally {
      setPending(false)
    }
  }

  async function remove() {
    setPending(true)
    setError('')
    try {
      await taskApi.deleteTask(task._id)
      onSaved('Task deleted.')
      onClose()
    } catch (failure) {
      setError(failure.message)
    } finally {
      setPending(false)
    }
  }

  const title = mode === 'create' ? 'Add task' : mode === 'edit' ? 'Edit task' : mode === 'delete' ? 'Delete task?' : task?.title || 'Task details'
  const fields = task ? [
    ['Status', { todo: 'To do', in_progress: 'In progress', done: 'Completed' }[task.status]],
    ['Priority', task.priority], ['Due date', formatTaskDate(task.dueDate)],
    ['Goal', goals.find((goal) => goal._id === task.goalId)?.title || (task.goalId ? 'Linked goal unavailable' : 'No linked goal')],
  ] : []

  return <Modal title={title} onClose={close}>
    {loading ? <p role="status">Loading task…</p>
      : dialog.id && !task ? <><p role="alert" className="text-red-700">{error || 'This task could not be found.'}</p><button className="os-button mt-4" onClick={retry}>Try again</button></>
        : mode === 'create' || mode === 'edit' ? <TaskForm task={task} defaults={dialog.defaults} goals={goals} pending={pending} onSave={save} onCancel={close} />
          : <div aria-busy={pending}>
            {mode === 'delete' ? <><p className="font-medium break-words">{task.title}</p><p className="mt-3 text-os-muted">Delete this task permanently?</p></>
              : <>
                <dl className="grid gap-5 sm:grid-cols-2">{fields.map(([label, value]) => <div key={label}><dt className="text-xs text-os-muted">{label}</dt><dd className="mt-1 font-medium break-words">{value}</dd></div>)}</dl>
                {task.description && <div className="mt-6"><h3 className="font-medium">Description</h3><p className="mt-2 whitespace-pre-wrap break-words text-os-muted">{task.description}</p></div>}
                <label className="mt-6 block">Update status<select className="os-input" value={task.status} disabled={pending} onChange={(event) => { void changeStatus(event.target.value) }}><option value="todo">To do</option><option value="in_progress">In progress</option><option value="done">Completed</option></select></label>
              </>}
            {error && <p role="alert" className="mt-5 text-sm text-red-700">{error}</p>}
            {pending && <p role="status" className="mt-4 text-sm text-os-muted">Saving…</p>}
            <div className="mt-6 flex justify-end gap-3 border-t border-os-line pt-5">
              {mode === 'delete' ? <><button className="os-button" disabled={pending} onClick={() => changeMode('detail')}>Cancel</button><button className="os-button os-button-danger" disabled={pending} onClick={() => { void remove() }}>Confirm deletion</button></>
                : <><button className="os-button" disabled={pending} onClick={() => changeMode('edit')}>Edit</button><button className="os-button os-button-danger" disabled={pending} onClick={() => changeMode('delete')}>Delete</button></>}
            </div>
          </div>}
  </Modal>
}
