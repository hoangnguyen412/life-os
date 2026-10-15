/**
 * Date/time boundary between UTC records and Vietnam-facing form/calendar values.
 * Explicit time zones avoid depending on the viewer's computer time zone.
 */
export const TIME_ZONE = 'Asia/Ho_Chi_Minh'

// Build YYYY-MM-DDTHH:mm for datetime-local inputs, using a 24-hour clock.
export function localDateTime(value) {
  if (!value) return ''
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
    timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date(value)).map(({ type, value }) => [type, value]))
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`
}

// Read the Vietnam calendar day from a UTC instant, not just its first ten characters.
export const dateOnly = (value) => localDateTime(value).slice(0, 10)
// A date-only deadline remains valid until the last millisecond of that Vietnam day.
export const dateToISO = (value) => value ? new Date(`${value}T23:59:59.999+07:00`).toISOString() : null
// Interpret form input as Vietnam time and normalize storage/export to UTC ISO.
export const timeToISO = (value) => value ? new Date(`${value}:00+07:00`).toISOString() : null
// Human-readable labels are display values, not values written back to records.
export const formatDate = (value) => value ? new Intl.DateTimeFormat('en-GB', { timeZone: TIME_ZONE, day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value)) : 'Not set'
export const formatTime = (value) => localDateTime(value).slice(11)

// Perform calendar-day arithmetic in UTC to avoid local daylight-saving offsets.
export function offsetDate(date, days) {
  const result = new Date(`${date}T00:00:00Z`)
  result.setUTCDate(result.getUTCDate() + days)
  return result.toISOString().slice(0, 10)
}

// Always start on day one so moving from a long month cannot skip a shorter month.
export function shiftMonth(month, offset) {
  const result = new Date(`${month}-01T00:00:00Z`)
  result.setUTCMonth(result.getUTCMonth() + offset)
  return result.toISOString().slice(0, 7)
}

// Build a Monday-first grid with null padding before/after the month's real dates.
export function monthCells(month) {
  const first = new Date(`${month}-01T00:00:00Z`)
  // JavaScript counts Sunday as 0; this conversion counts Monday as 0.
  const leading = (first.getUTCDay() + 6) % 7
  const days = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate()
  const cells = Array(leading).fill(null)
  for (let day = 1; day <= days; day++) cells.push(`${month}-${String(day).padStart(2, '0')}`)
  while (cells.length % 7) cells.push(null)
  return cells
}
