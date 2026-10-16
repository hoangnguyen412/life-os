/**
 * Shared controlled create/edit form for Task, Goal and CalendarEvent records.
 * kind chooses fields; item supplies edit values; defaults prefill new records.
 * Submit validates, normalizes a payload, saves to the mock provider and closes.
 */
import { useState } from 'react'
import useMockData from '../../hooks/useMockData.js'
import { dateOnly, dateToISO, localDateTime, timeToISO } from '../../utils/dates.js'

// Associate labels/errors with stable input IDs. children can supply a select or textarea.
// onInput also captures native date/time input changes; text fields remain controlled.
function Field({ label, name, error, children, ...props }) {
  return <div><label className="block" htmlFor={`resource-${name}`}>{label}</label>{children || <input id={`resource-${name}`} name={name} aria-invalid={Boolean(error)} aria-describedby={error ? `${name}-error` : undefined} className="os-input" onInput={props.onChange} {...props} />}{error && <span id={`${name}-error`} role="alert" className="mt-2 block text-sm text-red-700">{error}</span>}</div>
}

export default function ResourceForm({ kind, item, defaults, onClose }) {
  const { goals, save } = useMockData()
  const today = dateOnly(new Date().toISOString())
  // Initialize one editable draft; converting UTC records produces local form values.
  // Number fields stay strings while editing so empty fields can be validated separately.
  const [values, setValues] = useState(() => ({
    title: item?.title ?? '', description: item?.description ?? '', status: item?.status ?? 'todo', priority: item?.priority ?? 'medium',
    dueDate: dateOnly(item?.dueDate), goalId: item?.goalId ?? defaults.goalId ?? '', deadline: dateOnly(item?.deadline),
    progressMode: item?.progressMode ?? 'task_based', manualProgress: String(item?.manualProgress ?? 0),
    startTime: localDateTime(item?.startTime) || defaults.startTime || `${today}T09:00`,
    endTime: localDateTime(item?.endTime) || defaults.endTime || `${today}T10:00`,
  }))
  const [errors, setErrors] = useState({})
  // Update a single draft field, and clear its previous validation message.
  function change(event) {
    const { name, value } = event.target
    setValues((current) => ({ ...current, [name]: value }))
    setErrors((current) => ({ ...current, [name]: undefined }))
  }
  // Option tuples contain the stored value and its human-readable label.
  function select(name, label, options) {
    return <Field name={name} label={label}><select id={`resource-${name}`} name={name} className="os-input" value={values[name]} onChange={change}>{options.map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select></Field>
  }
  // Check kind-specific rules before changing shared state.
  function submit(event) {
    event.preventDefault()
    const nextErrors = {}
    if (!values.title.trim()) nextErrors.title = 'Title is required.'
    if (kind === 'goal' && !item && values.progressMode === 'manual' && (values.manualProgress === '' || !Number.isInteger(Number(values.manualProgress)) || Number(values.manualProgress) < 0 || Number(values.manualProgress) > 100)) nextErrors.manualProgress = 'Progress must be a whole number from 0 to 100.'
    if (kind === 'event') {
      if (!values.startTime) nextErrors.startTime = 'Start time is required.'
      if (!values.endTime || values.endTime <= values.startTime) nextErrors.endTime = 'End time must be later than start time.'
    }
    // Keep custom feedback and focus the first error instead of using browser popups.
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) { event.currentTarget.elements.namedItem(Object.keys(nextErrors)[0])?.focus(); return }
    const title = values.title.trim()
    // Trim text, normalize optional fields to null, and convert local dates/times to UTC.
    // Existing goal progress uses the dedicated detail form, not metadata edits.
    let payload
    if (kind === 'task') payload = { title, description: values.description.trim() || null, status: values.status, priority: values.priority, dueDate: dateToISO(values.dueDate), goalId: values.goalId || null }
    else if (kind === 'goal') payload = { title, deadline: dateToISO(values.deadline), progressMode: values.progressMode, ...(!item ? { manualProgress: values.progressMode === 'manual' ? Number(values.manualProgress) : 0 } : {}) }
    else payload = { title, description: values.description.trim() || null, startTime: timeToISO(values.startTime), endTime: timeToISO(values.endTime) }
    // Supplying an id edits a record; omitting it creates one in the preview store.
    save(kind, payload, item?._id)
    onClose()
  }
  // Render relevant fields: task metadata, goal progress mode, or event start/end.
  return <form noValidate onSubmit={submit} className="space-y-5">
    <Field label="Title *" name="title" required value={values.title} onChange={change} error={errors.title} />
    {kind !== 'goal' && <Field label="Description" name="description"><textarea id="resource-description" name="description" rows={3} className="os-input" value={values.description} onChange={change} /></Field>}
    {kind === 'task' && <div className="grid gap-5 sm:grid-cols-2">{select('status', 'Status', [['todo', 'To do'], ['in_progress', 'In progress'], ['done', 'Completed']])}{select('priority', 'Priority', [['low', 'Low'], ['medium', 'Medium'], ['high', 'High']])}<Field name="dueDate" label="Due date" type="date" value={values.dueDate} onChange={change} />{select('goalId', 'Linked goal', [['', 'No linked goal'], ...goals.map((goal) => [goal._id, goal.title])])}</div>}
    {kind === 'goal' && <><div className="grid gap-5 sm:grid-cols-2"><Field name="deadline" label="Deadline" type="date" value={values.deadline} onChange={change} />{select('progressMode', 'Progress mode', [['task_based', 'Based on completed tasks'], ['manual', 'Manual']])}</div>{values.progressMode === 'manual' && !item && <Field name="manualProgress" label="Manual progress (%)" type="number" min={0} max={100} step={1} value={values.manualProgress} onChange={change} error={errors.manualProgress} />}<p className="text-sm text-os-muted">{values.progressMode === 'task_based' ? 'Progress is calculated from completed tasks. Without tasks, progress is 0%.' : item ? 'Current progress is preserved. Update progress from goal details after saving.' : 'Set the starting progress for this goal.'}</p></>}
    {kind === 'event' && <><div className="grid gap-5 sm:grid-cols-2"><Field name="startTime" label="Start time *" type="datetime-local" required value={values.startTime} onChange={change} error={errors.startTime} /><Field name="endTime" label="End time *" type="datetime-local" required value={values.endTime} onChange={change} error={errors.endTime} /></div><p className="text-xs text-os-muted">Times are shown in Vietnam time (UTC+07:00).</p></>}
    <div className="flex justify-end gap-3 border-t border-os-line pt-5"><button type="button" className="os-button" onClick={onClose}>Cancel</button><button type="submit" className="os-button os-button-primary">{item ? 'Save changes' : `Create ${kind}`}</button></div>
  </form>
}
