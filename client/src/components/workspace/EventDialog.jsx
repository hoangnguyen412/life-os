import { useState } from 'react'
import { createEvent, deleteEvent, updateEvent } from '../../services/calendarApi.js'
import { formatDate, formatTime, localDateTime, timeToISO } from '../../utils/dates.js'
import Modal from './Modal.jsx'

export default function EventDialog({ dialog, onClose, onSaved }) {
  const { item, defaults } = dialog
  const [mode, setMode] = useState(item ? 'detail' : 'create')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const start = item ? localDateTime(item.startTime) : defaults.startTime
  const end = item ? localDateTime(item.endTime) : defaults.endTime

  function changeMode(next) {
    setError('')
    setMode(next)
  }

  async function write(action) {
    setPending(true)
    setError('')
    try {
      await action()
      onSaved()
      onClose()
    } catch (failure) {
      setError(failure.message)
    } finally {
      setPending(false)
    }
  }

  function save(event) {
    event.preventDefault()
    if (pending) return
    const fields = new FormData(event.currentTarget)
    const title = fields.get('title').trim()
    const startValue = fields.get('startTime')
    const endValue = fields.get('endTime')
    if (!title) { setError('Title is required.'); return }
    // Preserve the original seconds when a time field was not edited.
    const startTime = item && startValue === start ? item.startTime : timeToISO(startValue)
    const endTime = item && endValue === end ? item.endTime : timeToISO(endValue)
    if (endTime <= startTime) { setError('End time must be later than start time.'); return }
    const body = { title, startTime, endTime, description: fields.get('description').trim() || null }
    void write(() => item ? updateEvent(item._id, body) : createEvent(body))
  }

  const title = { create: 'Add event', edit: 'Edit event', delete: 'Delete event?' }[mode] ?? item?.title
  return <Modal title={title} onClose={() => { if (!pending) onClose() }}>
    {mode === 'create' || mode === 'edit' ? <form onSubmit={save}>
      <fieldset disabled={pending} className="space-y-4">
        <label className="block">Title<input className="os-input" name="title" required defaultValue={item?.title} /></label>
        <label className="block">Description<textarea className="os-input" name="description" rows={3} defaultValue={item?.description ?? ''} /></label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">Start time<input className="os-input" name="startTime" type="datetime-local" required defaultValue={start} /></label>
          <label className="block">End time<input className="os-input" name="endTime" type="datetime-local" required defaultValue={end} /></label>
        </div>
        <p className="text-xs text-os-muted">Vietnam time (UTC+07:00).</p>
        <div className="flex justify-end gap-3">
          <button type="button" className="os-button" onClick={onClose}>Cancel</button>
          <button className="os-button os-button-primary">{pending ? 'Saving…' : item ? 'Save changes' : 'Create event'}</button>
        </div>
      </fieldset>
    </form> : mode === 'delete' ? <>
      <p>Delete “{item.title}” from your calendar?</p>
      <div className="mt-5 flex justify-end gap-3">
        <button className="os-button" disabled={pending} onClick={() => changeMode('detail')}>Cancel</button>
        <button className="os-button os-button-danger" disabled={pending} onClick={() => void write(() => deleteEvent(item._id))}>{pending ? 'Deleting…' : 'Confirm deletion'}</button>
      </div>
    </> : <>
      <p>Start · {formatDate(item.startTime)} · {formatTime(item.startTime)}</p>
      <p className="mt-2">End · {formatDate(item.endTime)} · {formatTime(item.endTime)}</p>
      {item.description && <p className="mt-4 whitespace-pre-wrap break-words">{item.description}</p>}
      <div className="mt-5 flex justify-end gap-3">
        <button className="os-button" onClick={() => changeMode('edit')}>Edit</button>
        <button className="os-button os-button-danger" onClick={() => changeMode('delete')}>Delete</button>
      </div>
    </>}
    {error && <p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}
  </Modal>
}
