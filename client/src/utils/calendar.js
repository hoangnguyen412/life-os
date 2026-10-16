/**
 * Pure schedule projection used by the Calendar UI and ICS export.
 * Merge timed events with date-only Task views without changing source collections.
 */
import { dateOnly, offsetDate, shiftMonth, timeToISO } from './dates.js'

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
