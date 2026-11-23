/**
 * Pure schedule projection used by the Calendar UI and ICS export.
 * Merge timed events with date-only Task views without changing source collections.
 */
import { dateOnly, formatTime, offsetDate, shiftMonth, timeToISO } from './dates.js'

// Use the last occupied day so an event ending at midnight stays on the previous day.
export function eventTimeLabel(event, date) {
  const firstDay = dateOnly(event.startTime)
  const lastDay = dateOnly(new Date(new Date(event.endTime).getTime() - 1))
  const endLabel = dateOnly(event.endTime) === lastDay ? formatTime(event.endTime) : '24:00'
  if (firstDay === lastDay) return `${formatTime(event.startTime)}–${endLabel}`
  if (date === firstDay) return `Starts ${formatTime(event.startTime)}`
  if (date === lastDay) return `Ends ${endLabel}`
  return 'Continues'
}

// Deadlines are derived from Tasks, not duplicate CalendarEvents.
export function calendarItems(tasks, events) {
  return [
    ...tasks.filter((task) => task.dueDate).map((task) => ({ ...task, kind: 'task', key: `task-${task._id}`, allDay: true, date: dateOnly(task.dueDate) })),
    ...events.map((event) => ({ ...event, kind: 'event', key: `event-${event._id}`, allDay: false })),
  ].sort((a, b) => {
    // Sort by local day, then all-day items first, event time and a stable resource key.
    // Prefixes prevent collisions when a Task and Event happen to share the same _id.
    const day = (a.date || dateOnly(a.startTime)).localeCompare(b.date || dateOnly(b.startTime))
    return day || Number(b.allDay) - Number(a.allDay) || (a.startTime || '').localeCompare(b.startTime || '') || a.key.localeCompare(b.key)
  })
}

// Intervals overlap when start < day end and end > day start.
// An event ending exactly at midnight does not also occupy the following day.
export function occursOn(item, date) {
  return item.allDay ? item.date === date
    : item.startTime < timeToISO(`${offsetDate(date, 1)}T00:00`) && item.endTime > timeToISO(`${date}T00:00`)
}

// Include events crossing month boundaries, not only events starting in this month.
export function itemsInMonth(items, month) {
  return items.filter((item) => item.allDay ? item.date.startsWith(`${month}-`)
    : item.startTime < timeToISO(`${shiftMonth(month, 1)}-01T00:00`) && item.endTime > timeToISO(`${month}-01T00:00`))
}
