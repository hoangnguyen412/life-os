/**
 * Monthly schedule displays CalendarEvents returned by the API.
 * Task edits go back to the original Task; calendar export downloads a local ICS file.
 * Month and export choices are page state, while records come from shared Context.
 */
import { useState } from 'react'
import useAppData from '../data/useAppData.js'
import useResourceDialog from '../hooks/useResourceDialog.js'
import { dateOnly, formatDate, formatTime, monthCells, shiftMonth, timeToISO } from '../utils/dates.js'
import { calendarItems, itemsInMonth, occursOn } from '../utils/calendar.js'
import { downloadCalendarICS } from '../utils/icalendar.js'
import PageHeading from '../components/workspace/PageHeading.jsx'
import PreviewState from '../components/workspace/PreviewState.jsx'
import EmptyState from '../components/workspace/EmptyState.jsx'
import ResourceDialog from '../components/workspace/ResourceDialog.jsx'

export default function CalendarPage() {
  const store = useAppData()
  const modal = useResourceDialog()
  const today = dateOnly(new Date().toISOString())
  const [month, setMonth] = useState(today.slice(0, 7))
  const [exportRange, setExportRange] = useState('month')
  const [exportNotice, setExportNotice] = useState(null)
  const label = new Intl.DateTimeFormat('en-GB', { year: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date(`${month}-01T00:00:00Z`))
  // The API contract keeps CalendarEvents separate from Task deadlines.
  const items = calendarItems([], store.events)
  const monthItems = itemsInMonth(items, month)
  const exportItems = exportRange === 'month' ? monthItems : items
  // Loading/error previews and empty ranges cannot produce a download from this page.
  const canExport = !store.loading && !store.error && exportItems.length > 0

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
    <PageHeading title="Calendar" description="Manage your events. Vietnam time (UTC+07:00).">
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
      <p className="mt-3 text-xs text-os-muted">Includes calendar events. Import the file into Google Calendar; later changes need a new export.</p>
      {!store.loading && !store.error && !exportItems.length && <p className="mt-2 text-xs text-os-muted">No calendar events to export in this range.</p>}
      {exportNotice && <p role={exportNotice.error ? 'alert' : 'status'} className={`mt-3 text-sm ${exportNotice.error ? 'text-red-700' : 'text-os-primary'}`}>{exportNotice.text}</p>}
    </div>
    {store.loading || store.error ? <PreviewState /> : <>
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
          <li className="text-os-primary">● Event</li>
        </ul>
        <div className="grid grid-cols-7 overflow-hidden rounded-lg border border-os-line">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => <div key={day} className="border-b border-os-line bg-os-soft py-3 text-center text-[10px] font-medium sm:text-xs">{day}</div>)}
          {monthCells(month).map((date, index) => {
            // Blank grid cells are padding; real dates select items overlapping that day.
            const dayItems = date ? monthItems.filter((item) => occursOn(item, date)) : []
            return <div key={date ?? `blank-${index}`} className={`min-h-18 min-w-0 border-r border-b border-os-line p-1 sm:min-h-28 sm:p-2 ${!date ? 'bg-os-canvas' : date === today ? 'bg-os-primary-soft/50' : ''}`}>
              {date && <>
                <button className={`mb-1 flex size-7 items-center justify-center rounded-full text-xs ${date === today ? 'bg-os-primary text-white' : 'hover:bg-os-soft'}`} aria-label={`Add event on ${formatDate(timeToISO(`${date}T12:00`))}`} onClick={() => add(date)}>{Number(date.slice(8))}</button>
                {dayItems.map((item) => {
                  return <button key={item.key} aria-label={`View event ${item.title} on ${date}`} title={`${item.title} · ${formatTime(item.startTime)}`} className="mb-1 block min-h-7 w-full overflow-hidden rounded border border-os-primary bg-os-primary p-1 text-left text-[10px] font-semibold text-white shadow-sm hover:bg-os-primary-hover sm:text-xs" onClick={() => modal.open('event', 'detail', item._id)}>
                    <span className="hidden break-words sm:block">{formatTime(item.startTime)} {item.title}</span>
                    <span className="block text-center sm:hidden">●</span>
                  </button>
                })}
              </>}
            </div>
          })}
        </div>
      </section>
      <section className="os-card mt-6" aria-label="Schedule this month">
        <h2 className="mb-5 text-lg font-medium">Schedule this month</h2>
        {monthItems.length ? <div className="space-y-3">{monthItems.map((item) => <article key={item.key} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-teal-300 border-l-4 border-l-os-primary bg-teal-100 p-4 text-os-ink">
            <div className="min-w-0 flex-1">
              <h3 className="font-medium break-words">{item.title}</h3>
              <p className="mt-1 text-xs">{`${formatDate(item.startTime)} · ${formatTime(item.startTime)} – ${dateOnly(item.endTime) !== dateOnly(item.startTime) ? `${formatDate(item.endTime)} · ` : ''}${formatTime(item.endTime)}`}</p>
            </div>
            <button className="os-button" aria-label={`View ${item.kind} ${item.title}`} onClick={() => modal.open(item.kind, 'detail', item._id)}>View {item.kind}</button>
          </article>
        )}</div> : <EmptyState icon="calendar" title="No events this month" description="Add an event to see it here."><button className="os-button" onClick={() => add(`${month}-01`)}>+ Add event</button></EmptyState>}
      </section>
    </>}
    <ResourceDialog dialog={modal.dialog} onClose={modal.close} onChangeMode={modal.setMode} />
  </>
}
