/** Convert real Task form dates in the browser's local timezone, as the API requires. */
export function taskDateInput(value) {
  if (!value) return ''
  const date = new Date(value)
  return `${String(date.getFullYear()).padStart(4, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function validateTask(values) {
  const errors = {}
  if (!values.title.trim()) errors.title = 'Title is required.'
  if (values.dueDate) {
    const date = new Date(`${values.dueDate}T00:00:00`)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(values.dueDate) || Number.isNaN(date.getTime()) || taskDateInput(date) !== values.dueDate) {
      errors.dueDate = 'Enter a valid due date.'
    }
  }
  return errors
}

export function taskPayload(values) {
  return {
    title: values.title.trim(),
    description: values.description.trim() || null,
    status: values.status,
    priority: values.priority,
    dueDate: values.dueDate ? new Date(`${values.dueDate}T23:59:59.999`).toISOString() : null,
    goalId: values.goalId || null,
  }
}

// Real Task dates follow the viewer's local timezone; sample Calendar dates stay unchanged.
export const formatTaskDate = (value) => value ? new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Not set'
