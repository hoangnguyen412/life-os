/** Controlled form for real Tasks. The dialog saves; this form validates and shows errors. */
import { useState } from 'react'
import { taskDateInput, taskPayload, validateTask } from '../../utils/taskForm.js'

function Field({ name, label, error, children }) {
  return <div>
    <label htmlFor={`task-${name}`} className="block">{label}</label>
    {children}
    {error && <p id={`task-${name}-error`} role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
  </div>
}

export default function TaskForm({ task, defaults = {}, goals, pending, onSave, onCancel }) {
  const [values, setValues] = useState(() => ({
    title: task?.title ?? '', description: task?.description ?? '',
    status: task?.status ?? defaults.status ?? 'todo', priority: task?.priority ?? 'medium',
    dueDate: taskDateInput(task?.dueDate), goalId: task?.goalId ?? defaults.goalId ?? '',
  }))
  const [errors, setErrors] = useState({})
  const [error, setError] = useState('')

  function change(event) {
    const { name, value } = event.target
    setValues((current) => ({ ...current, [name]: value }))
    setErrors((current) => ({ ...current, [name]: undefined }))
    setError('')
  }

  // All controls share the same name, value, error and change conventions.
  function inputProps(name) {
    return {
      id: `task-${name}`, name, value: values[name], onChange: change, className: 'os-input',
      'aria-invalid': Boolean(errors[name]),
      'aria-describedby': errors[name] ? `task-${name}-error` : undefined,
    }
  }

  async function submit(event) {
    event.preventDefault()
    if (pending) return
    const nextErrors = validateTask(values)
    if (event.currentTarget.elements.namedItem('dueDate').validity.badInput) nextErrors.dueDate = 'Enter a complete due date.'
    setErrors(nextErrors)
    setError('')
    const firstField = Object.keys(nextErrors)[0]
    if (firstField) { event.currentTarget.elements.namedItem(firstField)?.focus(); return }
    try {
      await onSave(taskPayload(values))
    } catch (failure) {
      // Preserve the draft after a failed save so the user can correct it and retry.
      if (Object.hasOwn(values, failure.field)) setErrors({ [failure.field]: failure.message })
      else setError(failure.message || 'Could not save the task. Please try again.')
    }
  }

  return <form noValidate onSubmit={submit} aria-busy={pending}>
    <fieldset disabled={pending} className="min-w-0 space-y-5">
      <Field name="title" label="Title *" error={errors.title}><input {...inputProps('title')} required autoFocus /></Field>
      <Field name="description" label="Description" error={errors.description}><textarea {...inputProps('description')} rows={3} /></Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field name="status" label="Status" error={errors.status}><select {...inputProps('status')}><option value="todo">To do</option><option value="in_progress">In progress</option><option value="done">Completed</option></select></Field>
        <Field name="priority" label="Priority" error={errors.priority}><select {...inputProps('priority')}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></Field>
        <Field name="dueDate" label="Due date" error={errors.dueDate}><input {...inputProps('dueDate')} type="date" /></Field>
        <Field name="goalId" label="Linked goal" error={errors.goalId}><select {...inputProps('goalId')}><option value="">No linked goal</option>{values.goalId && !goals.some((goal) => goal._id === values.goalId) && <option value={values.goalId}>Linked goal unavailable</option>}{goals.map((goal) => <option key={goal._id} value={goal._id}>{goal.title}</option>)}</select></Field>
      </div>
      {!goals.length && <p className="text-sm text-os-muted">No goals available. You can create a task without a linked goal.</p>}
    </fieldset>
    {error && <p role="alert" className="mt-5 text-sm text-red-700">{error}</p>}
    <div className="mt-5 flex justify-end gap-3 border-t border-os-line pt-5">
      <button type="button" className="os-button" disabled={pending} onClick={onCancel}>Cancel</button>
      <button type="submit" className="os-button os-button-primary" disabled={pending}>{pending ? 'Saving…' : task ? 'Save changes' : 'Create task'}</button>
    </div>
  </form>
}
