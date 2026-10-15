/**
 * Generate five tasks, two goals and three events using the wireframe's sample content.
 * Dates are relative to today's Vietnam date, so overdue/upcoming examples stay useful.
 * Records use the current contract's _id, goalId and manualProgress field names.
 */
import { dateOnly, dateToISO, offsetDate, timeToISO } from '../utils/dates.js'

export function createSampleData(now = new Date().toISOString()) {
  const today = dateOnly(now)
  const day = (offset) => offsetDate(today, offset)
  const goalIds = ['100000000000000000000001', '100000000000000000000002']
  const goals = [
    { _id: goalIds[0], title: 'Complete the Life OS MVP', deadline: dateToISO(day(15)), progressMode: 'task_based', manualProgress: 0, createdAt: now },
    { _id: goalIds[1], title: 'Review React', deadline: dateToISO(day(10)), progressMode: 'manual', manualProgress: 60, createdAt: now },
  ]
  // Compact fixture rows are expanded below into normal Task objects.
  const taskRows = [
    ['Finalize UI flow', 'Agree on user flows with the team.', 'done', -3, goalIds[0], 'medium'],
    ['Create wireframes', 'Design spacious layouts for Core screens.', 'in_progress', -1, goalIds[0], 'high'],
    ['Review API contract', 'Review the API fields required by each form.', 'todo', -3, goalIds[0], 'high'],
    ['Set up the React structure', 'Build layouts and routing during Foundation.', 'todo', 3, goalIds[0], 'medium'],
    ['Read the hooks documentation', null, 'done', -4, goalIds[1], 'low'],
  ]
  // Date-only deadlines become end-of-day UTC instants; completed tasks also get completedAt.
  const tasks = taskRows.map(([title, description, status, offset, goalId, priority], index) => ({
    _id: `00000000000000000000000${index + 1}`, title, description, status,
    dueDate: dateToISO(day(offset)), goalId, priority,
    completedAt: status === 'done' ? timeToISO(`${day(offset)}T16:00`) : null,
    createdAt: timeToISO(`${day(-6 + index)}T09:00`), updatedAt: now,
  }))
  const eventRows = [
    ['Team meeting', -2, '09:00', '10:00', 'Agree on the next deliverables.'],
    ['Review wireframes', 0, '14:00', '15:00', 'Review screen layouts.'],
    ['Demo skeleton', 2, '15:00', '16:00', 'Check layouts and routing.'],
  ]
  // Timed events remain independent from task deadlines and are converted from UTC+07:00.
  const events = eventRows.map(([title, offset, start, end, description], index) => ({
    _id: `20000000000000000000000${index + 1}`, title, description,
    startTime: timeToISO(`${day(offset)}T${start}`), endTime: timeToISO(`${day(offset)}T${end}`), createdAt: now,
  }))
  return { tasks, goals, events }
}
