import { taskDateInput } from './taskForm.js'

export function progressError(value) {
  const number = Number(value)
  return String(value).trim() === '' || !Number.isInteger(number) || number < 0 || number > 100
    ? 'Progress must be a whole number from 0 to 100.' : ''
}

export function validateGoal(values, creating) {
  const errors = {}
  if (!values.title.trim()) errors.title = 'Title is required.'
  if (values.deadline) {
    const date = new Date(`${values.deadline}T00:00:00`)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(values.deadline) || Number.isNaN(date.getTime()) || taskDateInput(date) !== values.deadline) errors.deadline = 'Enter a valid deadline.'
  }
  if (creating && values.progressMode === 'manual') {
    const error = progressError(values.manualProgress)
    if (error) errors.manualProgress = error
  }
  return errors
}

// Metadata edits use PUT; existing manual progress has its own PATCH form.
export function goalPayload(values, creating) {
  return {
    title: values.title.trim(),
    deadline: values.deadline ? new Date(`${values.deadline}T23:59:59.999`).toISOString() : null,
    progressMode: values.progressMode,
    ...(creating && values.progressMode === 'manual' ? { manualProgress: Number(values.manualProgress) } : {}),
  }
}
