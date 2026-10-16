/**
 * Monthly schedule combines timed events with all-day task deadline views.
 * Task edits go back to the original Task; calendar export downloads a local ICS file.
 * Month and export choices are page state, while records come from shared Context.
 */
import { useState } from 'react'
import useMockData from '../hooks/useMockData.js'
import useResourceDialog from '../hooks/useResourceDialog.js'
import { dateOnly, formatDate, formatTime, monthCells, shiftMonth, timeToISO } from '../utils/dates.js'
import { calendarItems, itemsInMonth, occursOn } from '../utils/calendar.js'
import { downloadCalendarICS } from '../utils/icalendar.js'
import { isOverdue } from '../mocks/mockStore.js'
import PageHeading from '../components/workspace/PageHeading.jsx'
import PreviewState from '../components/workspace/PreviewState.jsx'
import EmptyState from '../components/workspace/EmptyState.jsx'
import ResourceDialog from '../components/workspace/ResourceDialog.jsx'

// Completed status takes precedence over overdue checks; color and symbols work together.
function taskAppearance(task) {
  if (task.status === 'done') return { label: 'Completed', classes: 'border-slate-300 bg-slate-100 text-slate-700', symbol: '✓' }
  if (isOverdue(task)) return { label: 'Overdue', classes: 'border-red-300 bg-red-100 text-red-900', symbol: '!' }
  return { label: 'Deadline', classes: 'border-amber-300 bg-amber-100 text-amber-900', symbol: '◆' }
}

export default function CalendarPage() {
  const store = useMockData()
  const modal = useResourceDialog()
  const today = dateOnly(new Date().toISOString())
  const [month, setMonth] = useState(today.slice(0, 7))
  const [exportRange, setExportRange] = useState('month')
  const [exportNotice, setExportNotice] = useState(null)
  const label = new Intl.DateTimeFormat('en-GB', { year: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date(`${month}-01T00:00:00Z`))
  // Rebuild the derived schedule each render so task changes need no synchronization copy.
  const items = calendarItems(store.tasks, store.events)
  const monthItems = itemsInMonth(items, month)
  const exportItems = exportRange === 'month' ? monthItems : items
  // Loading/error previews and empty ranges cannot produce a download from this page.
  const canExport = store.viewState === 'normal' && exportItems.length > 0

  // Clicking a day opens an event form with that date and a default one-hour slot.
  function add(date = today) { modal.open('event', 'create', null, { startTime: `${date}T09:00`, endTime: `${date}T10:00` }) }
  function changeMonth(value) { setMonth(value); setExportNotice(null) }
  // Export is a snapshot, not a Google API call or a continuous calendar subscription.
  function exportCalendar() {
    if (!canExport) return
    try {
      downloadCalendarICS(exportItems, `life-os-calendar-${exportRange === 'month' ? month : 'all'}.ics`)
      setExportNotice({ text: `Downloaded ${exportItems.length} calendar items. In Google Calendar on a computer, open Settings → Import & export to import this file.`, error: false })
    } catch {
      setExportNotice({ text: 'Could not download the calendar. Please try again.', error: true })
    }
  }

  return <>
    <PageHeading title="Calendar" description="Events and task deadlines. Vietnam time (UTC+07:00).">
      <button className="os-button os-button-primary" onClick={() => add()}>+ Add event</button>
    </PageHeading>
    <div className="os-card mb-6">
      <div className="flex flex-wrap items-end gap-3">
        <label className="min-w-0 flex-1 sm:max-w-60">Export range
          <select className="os-input" aria-label="Export range" value={exportRange} onChange={(event) => { setExportRange(event.target.value); setExportNotice(null) }}>
            <option value="month">Current month · {label}</option><option value="all">All calendar items</option>
          </select>
        </label>
        <button className="os-button" disabled={!canExport} onClick={exportCalendar}>Download .ics</button>
      </div>
      <p className="mt-3 text-xs text-os-muted">Includes events and task deadlines. Import the file into Google Calendar; later changes need a new export.</p>
      {store.viewState === 'normal' && !exportItems.length && <p className="mt-2 text-xs text-os-muted">No calendar items to export in this range.</p>}
      {exportNotice && <p role={exportNotice.error ? 'alert' : 'status'} className={`mt-3 text-sm ${exportNotice.error ? 'text-red-700' : 'text-os-primary'}`}>{exportNotice.text}</p>}
    </div>
    {store.viewState !== 'normal' ? <PreviewState /> : <>
      <section className="os-card !p-3 sm:!p-6" aria-label="Monthly calendar">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-medium">{label}</h2>
          <div className="flex gap-2">
            <button className="os-button" aria-label="Previous month" onClick={() => changeMonth(shiftMonth(month, -1))}>←</button>
            <button className="os-button" onClick={() => changeMonth(today.slice(0, 7))}>Today</button>
            <button className="os-button" aria-label="Next month" onClick={() => changeMonth(shiftMonth(month, 1))}>→</button>
          </div>
        </div>
        <ul aria-label="Calendar legend" className="mb-5 flex flex-wrap gap-x-4 gap-y-2 text-xs">
          <li className="text-os-primary">● Event</li><li className="text-amber-800">◆ Task</li>
          <li className="text-red-800">! Overdue task</li><li className="text-slate-600">✓ Completed task</li>
        </ul>
        <div className="grid grid-cols-7 overflow-hidden rounded-lg border border-os-line">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => <div key={day} className="border-b border-os-line bg-os-soft py-3 text-center text-[10px] font-medium sm:text-xs">{day}</div>)}
          {monthCells(month).map((date, index) => {
            // Blank grid cells are padding; real dates select items overlapping that day.
            const dayItems = date ? monthItems.filter((item) => occursOn(item, date)) : []
            // Highlight deadline days, while completed tasks retain a quieter appearance.
            const hasPendingTask = dayItems.some((item) => item.kind === 'task' && item.status !== 'done')
            return <div key={date ?? `blank-${index}`} className={`min-h-18 min-w-0 border-r border-b border-os-line p-1 sm:min-h-28 sm:p-2 ${!date ? 'bg-os-canvas' : hasPendingTask ? 'bg-amber-50' : date === today ? 'bg-os-primary-soft/50' : ''}`}>
              {date && <>
                <button className={`mb-1 flex size-7 items-center justify-center rounded-full text-xs ${date === today ? 'bg-os-primary text-white' : 'hover:bg-os-soft'}`} aria-label={`Add event on ${formatDate(timeToISO(`${date}T12:00`))}`} onClick={() => add(date)}>{Number(date.slice(8))}</button>
                {dayItems.map((item) => {
                  // Events keep time labels; tasks use Task labels and status-specific styling.
                  // Mobile cells show symbols; accessible labels and the list retain full details.
                  const appearance = item.kind === 'task' ? taskAppearance(item) : null
                  return <button key={item.key} aria-label={`View ${item.kind} ${item.title} on ${date}${item.allDay ? ` · Task · ${appearance.label}` : ''}`} title={`${item.title} · ${item.allDay ? `Task · ${appearance.label}` : formatTime(item.startTime)}`} className={`mb-1 block min-h-7 w-full overflow-hidden rounded border p-1 text-left text-[10px] sm:text-xs ${appearance ? `${appearance.classes} border-l-4 font-medium` : 'border-os-primary bg-os-primary font-semibold text-white shadow-sm hover:bg-os-primary-hover'}`} onClick={() => modal.open(item.kind, 'detail', item._id)}>
                    <span className="hidden break-words sm:block">{item.allDay ? `${appearance.symbol} Task · ` : `${formatTime(item.startTime)} `}{item.title}</span>
                    <span className="block text-center sm:hidden">{appearance?.symbol ?? '●'}</span>
                  </button>
                })}
              </>}
            </div>
          })}
        </div>
      </section>
      <section className="os-card mt-6" aria-label="Schedule this month">
        <h2 className="mb-5 text-lg font-medium">Schedule this month</h2>
        {monthItems.length ? <div className="space-y-3">{monthItems.map((item) => {
          const appearance = item.kind === 'task' ? taskAppearance(item) : null
          return <article key={item.key} className={`flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4 ${appearance ? `${appearance.classes} border-l-4` : 'border-teal-300 border-l-4 border-l-os-primary bg-teal-100 text-os-ink'}`}>
            <div className="min-w-0 flex-1">
              <h3 className="font-medium break-words">{item.title}</h3>
              <p className="mt-1 text-xs">{item.allDay ? `${formatDate(item.dueDate)} · Task · ${appearance.label}` : `${formatDate(item.startTime)} · ${formatTime(item.startTime)} – ${dateOnly(item.endTime) !== dateOnly(item.startTime) ? `${formatDate(item.endTime)} · ` : ''}${formatTime(item.endTime)}`}</p>
            </div>
            <button className="os-button" aria-label={`View ${item.kind} ${item.title}`} onClick={() => modal.open(item.kind, 'detail', item._id)}>View {item.kind}</button>
          </article>
        })}</div> : <EmptyState icon="calendar" title="No schedule this month" description="Add an event or give a task a deadline to see it here."><button className="os-button" onClick={() => add(`${month}-01`)}>+ Add event</button></EmptyState>}
      </section>
    </>}
    <ResourceDialog dialog={modal.dialog} onClose={modal.close} onChangeMode={modal.setMode} />
  </>
}
