/**
 * Calendar/export regression tests: local days, month overlap and interoperable ICS text.
 * Boundary fixtures cover midnight, year rollover, leap day and matching resource IDs.
 * Special text verifies Unicode-safe folding and escaping instead of browser styling.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { calendarItems, itemsInMonth, occursOn } from './calendar.js'
import { createCalendarICS } from './icalendar.js'
import { dateToISO } from './dates.js'

// Task and Event deliberately share an id to test distinct export UIDs.
const task = { _id: 'a', title: 'Nộp báo cáo', description: null, status: 'todo', priority: 'high', dueDate: dateToISO('2026-10-31') }
const event = { _id: 'a', title: 'Meeting', startTime: '2026-10-31T16:00:00.000Z', endTime: '2026-10-31T17:00:00.000Z' }
const now = '2026-10-13T05:00:00.000Z'
// Undo ICS continuation lines before checking complete logical properties.
const unfold = (text) => text.replace(/\r\n /g, '')

test('deadlines appear once on their Vietnam day, including completed tasks', () => {
  const items = calendarItems([task, { ...task, _id: 'b', dueDate: null }, { ...task, _id: 'c', status: 'done' }], [event])
  assert.equal(items.length, 3)
  assert.equal(items[0].date, '2026-10-31')
  assert.equal(occursOn(items[0], '2026-10-31'), true)
  assert.equal(occursOn(items[0], '2026-11-01'), false)
  assert.equal(new Set(items.map((item) => item.key)).size, 3)
  assert.equal(task.kind, undefined)
})

test('editing/removing a deadline or deleting a task changes the derived schedule', () => {
  const before = calendarItems([task], [event])
  const after = calendarItems([{ ...task, dueDate: dateToISO('2026-11-02') }], [event])
  assert.equal(itemsInMonth(before, '2026-10').length, 2)
  assert.equal(itemsInMonth(after, '2026-10').length, 1)
  assert.equal(itemsInMonth(after, '2026-11')[0].date, '2026-11-02')
  assert.equal(calendarItems([{ ...task, dueDate: null }], [event]).length, 1)
  assert.equal(calendarItems([], [event]).length, 1)
  assert.equal(after[1].key, before[0].key)
})

test('events crossing months are included only on overlapping days, with exclusive end', () => {
  const [item] = calendarItems([], [{ ...event, endTime: '2026-10-31T18:00:00.000Z' }])
  assert.equal(itemsInMonth([item], '2026-10').length, 1)
  assert.equal(itemsInMonth([item], '2026-11').length, 1)
  assert.equal(occursOn(item, '2026-11-01'), true)
  assert.equal(occursOn(calendarItems([], [event])[0], '2026-11-01'), false)
})

test('ICS preserves all-day dates, exclusive next-day end, UTC times and stable distinct IDs', () => {
  const items = calendarItems([task], [event])
  const file = unfold(createCalendarICS(items, now))
  assert.ok(file.startsWith('BEGIN:VCALENDAR\r\nVERSION:2.0\r\n'))
  assert.ok(file.endsWith('END:VCALENDAR\r\n'))
  assert.match(file, /DTSTART;VALUE=DATE:20261031\r\nDTEND;VALUE=DATE:20261101/)
  assert.match(file, /DTSTART:20261031T160000Z\r\nDTEND:20261031T170000Z/)
  assert.match(file, /DTSTAMP:20261013T050000Z/)
  assert.match(file, /SUMMARY:\[Task\] Nộp báo cáo/)
  assert.match(file, /TRANSP:TRANSPARENT/)
  const uids = (text) => text.match(/^UID:.*$/gm)
  assert.equal(new Set(uids(file)).size, 2)
  assert.deepEqual(uids(file), uids(createCalendarICS(items, '2026-10-14T05:00:00.000Z')))
  assert.equal((file.match(/BEGIN:VEVENT/g) || []).length, 2)
  assert.equal((file.match(/END:VEVENT/g) || []).length, 2)
})

test('ICS escapes special text and CRLF injection; folds Unicode lines at 75 UTF-8 octets', () => {
  const title = 'Tiếng Việt 🗓️, học; làm\\nghỉ '.repeat(10)
  const description = 'Dòng 1\r\nBEGIN:VEVENT\nDòng 2'
  const file = createCalendarICS(calendarItems([{ ...task, title, description }], []), now)
  const encoder = new TextEncoder()
  for (const line of file.split('\r\n')) assert.ok(encoder.encode(line).length <= 75)
  assert.equal(file.replace(/\r\n/g, '').includes('\n'), false)
  const plain = unfold(file)
  assert.equal((plain.match(/^BEGIN:VEVENT$/gm) || []).length, 1)
  assert.ok(plain.includes('SUMMARY:[Task] Tiếng Việt 🗓️\\, học\\; làm\\\\nghỉ '))
  assert.ok(plain.includes('DESCRIPTION:Dòng 1\\nBEGIN:VEVENT\\nDòng 2'))
  assert.ok(!file.includes('�'))
})

test('all-day year/leap boundaries and an empty export stay valid', () => {
  const december = createCalendarICS(calendarItems([{ ...task, dueDate: dateToISO('2026-12-31') }], []), now)
  assert.match(december, /DTEND;VALUE=DATE:20270101/)
  const february = createCalendarICS(calendarItems([{ ...task, dueDate: dateToISO('2028-02-29') }], []), now)
  assert.match(february, /DTEND;VALUE=DATE:20280301/)
  assert.ok(!createCalendarICS([], now).includes('VEVENT'))
})
