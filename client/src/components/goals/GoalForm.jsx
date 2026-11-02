import { useState } from 'react'
import { taskDateInput } from '../../utils/taskForm.js'
import { goalPayload, validateGoal } from '../../utils/goalForm.js'

export default function GoalForm({ goal, pending, onSave, onCancel }) {
  const [values, setValues] = useState(() => ({ title: goal?.title ?? '', deadline: taskDateInput(goal?.deadline), progressMode: goal?.progressMode ?? 'task_based', manualProgress: '0' }))
  const [errors, setErrors] = useState({})
  const [error, setError] = useState('')

  function change(event) {
    const { name, value } = event.target
    setValues((current) => ({ ...current, [name]: value }))
    setErrors((current) => ({ ...current, [name]: undefined }))
    setError('')
  }

  function props(name) {
    return { id: `goal-${name}`, name, value: values[name], onChange: change, className: 'os-input', 'aria-invalid': Boolean(errors[name]), 'aria-describedby': errors[name] ? `goal-${name}-error` : undefined }
  }

  function fieldError(name) { return errors[name] && <p id={`goal-${name}-error`} role="alert" className="mt-2 text-sm text-red-700">{errors[name]}</p> }

  async function submit(event) {
    event.preventDefault()
    if (pending) return
    const next = validateGoal(values, !goal)
    if (event.currentTarget.elements.namedItem('deadline').validity.badInput) next.deadline = 'Enter a complete deadline.'
    setErrors(next)
    setError('')
    const first = Object.keys(next)[0]
    if (first) { event.currentTarget.elements.namedItem(first)?.focus(); return }
    try { await onSave(goalPayload(values, !goal)) }
    catch (failure) {
      if (Object.hasOwn(values, failure.field)) setErrors({ [failure.field]: failure.message })
      else setError(failure.message || 'Could not save the goal. Please try again.')
    }
  }

  return <form noValidate onSubmit={submit} aria-busy={pending}>
    <fieldset disabled={pending} className="min-w-0 space-y-5">
      <div><label htmlFor="goal-title">Title *</label><input {...props('title')} required autoFocus />{fieldError('title')}</div>
      <div><label htmlFor="goal-deadline">Deadline</label><input {...props('deadline')} type="date" onInput={change} />{fieldError('deadline')}</div>
      <div><label htmlFor="goal-progressMode">Progress mode</label><select {...props('progressMode')}><option value="task_based">Based on completed tasks</option><option value="manual">Manual</option></select>{fieldError('progressMode')}</div>
      {values.progressMode === 'manual' && !goal && <div><label htmlFor="goal-manualProgress">Manual progress (%)</label><input {...props('manualProgress')} type="number" min="0" max="100" step="1" />{fieldError('manualProgress')}</div>}
      <p className="text-sm text-os-muted">{values.progressMode === 'task_based' ? 'The server calculates progress from linked completed tasks. Without tasks, progress is 0%.' : goal ? 'Current progress is preserved. Update it from goal details after saving.' : 'Choose the starting progress for this goal.'}</p>
    </fieldset>
    {error && <p role="alert" className="mt-5 text-sm text-red-700">{error}</p>}
    <div className="mt-5 flex justify-end gap-3 border-t border-os-line pt-5"><button type="button" className="os-button" disabled={pending} onClick={onCancel}>Cancel</button><button className="os-button os-button-primary" disabled={pending}>{pending ? 'Saving…' : goal ? 'Save changes' : 'Create goal'}</button></div>
  </form>
}
