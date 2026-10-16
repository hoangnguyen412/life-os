/**
 * Serialize schedule items into an RFC 5545 iCalendar file and download it locally.
 * Tasks become all-day VEVENTs so calendar imports show their deadline day.
 * Exporting does not connect an account or send data to Google Calendar.
 */
import { offsetDate } from './dates.js'

// Escape text delimiters and newlines so user text cannot become extra ICS properties.
const escapeText = (value) => String(value).replace(/\\/g, '\\\\').replace(/\r\n|\r|\n/g, '\\n').replace(/;/g, '\\;').replace(/,/g, '\\,')
// RFC timestamps use YYYYMMDDTHHMMSSZ, without ISO hyphens, colons or milliseconds.
const stamp = (value) => new Date(value).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')
const day = (value) => value.replace(/-/g, '')

// RFC 5545 folding counts UTF-8 octets, including the continuation space.
function fold(line) {
  const encoder = new TextEncoder()
  const lines = []
  let current = ''
  let bytes = 0
  // Iterate by Unicode code point to avoid splitting accented characters or emoji.
  for (const character of line) {
    const size = encoder.encode(character).length
    if (bytes + size > 75) { lines.push(current); current = ' '; bytes = 1 }
    current += character
    bytes += size
  }
  lines.push(current)
  return lines.join('\r\n')
}

// Pure serializer: accepting now makes timestamps reproducible in tests.
export function createCalendarICS(items, now = new Date().toISOString()) {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Life OS//Calendar Export//EN', 'CALSCALE:GREGORIAN']
  for (const item of items) {
    // A resource-based UID stays stable across exports even when its title/date changes.
    // Stable IDs do not guarantee that a third-party import will update existing events.
    lines.push('BEGIN:VEVENT', `UID:${escapeText(item.key)}@life-os.local`, `DTSTAMP:${stamp(now)}`)
    if (item.allDay) {
      // DATE end is exclusive: a deadline spans exactly one local day.
      lines.push(`DTSTART;VALUE=DATE:${day(item.date)}`, `DTEND;VALUE=DATE:${day(offsetDate(item.date, 1))}`)
    } else lines.push(`DTSTART:${stamp(item.startTime)}`, `DTEND:${stamp(item.endTime)}`)
    const title = item.kind === 'task' ? `[Task${item.status === 'done' ? ' completed' : ''}] ${item.title}` : item.title
    const description = [item.description, item.kind === 'task' ? `Task deadline · Status: ${item.status.replace('_', ' ')} · Priority: ${item.priority}` : null].filter(Boolean).join('\n')
    lines.push(`SUMMARY:${escapeText(title)}`)
    if (description) lines.push(`DESCRIPTION:${escapeText(description)}`)
    // Task deadlines do not reserve the entire day as busy time; timed events do.
    lines.push(`CATEGORIES:${item.kind === 'task' ? 'TASK' : 'EVENT'}`, `TRANSP:${item.allDay ? 'TRANSPARENT' : 'OPAQUE'}`, 'END:VEVENT')
  }
  lines.push('END:VCALENDAR')
  // CRLF line endings and a final newline complete the interchange format.
  return `${lines.map(fold).join('\r\n')}\r\n`
}

// Browser-only download wrapper: Blob holds UTF-8 text; an object URL feeds an anchor.
export function downloadCalendarICS(items, filename) {
  const url = URL.createObjectURL(new Blob([createCalendarICS(items)], { type: 'text/calendar;charset=utf-8' }))
  const link = document.createElement('a')
  try {
    link.href = url
    link.download = filename
    document.body.append(link)
    link.click()
  } finally {
    link.remove()
    // Release the temporary URL after the browser has had time to start the download.
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
}
