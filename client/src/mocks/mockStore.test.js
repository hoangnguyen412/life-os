/**
 * Business-rule regression tests using Node's built-in test runner.
 * Fixed timestamps make goal progress, completion dates and overdue counts reproducible.
 * Assertions check observable results and ensure mutations do not change the input data.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { createSampleData } from './sampleData.js'
import { dashboardSummary, isOverdue, mutateMockData, recalculateGoals, sortTasks } from './mockStore.js'
import { dateOnly, dateToISO, monthCells, shiftMonth, timeToISO } from '../utils/dates.js'

// Each test starts from fresh fixtures; change is a shorthand for a dated store action.
const now = '2026-10-10T05:00:00.000Z'
const sample = () => recalculateGoals(createSampleData(now))
const change = (data, kind, id, payload, type = 'save') => mutateMockData(data, { type, kind, id, payload, now })

test('fixtures use contract IDs and dashboard summarizes active goals', () => {
  const data = sample()
  assert.equal(data.events.length, 3)
  for (const item of [...data.tasks, ...data.goals, ...data.events]) assert.match(item._id, /^[a-f0-9]{24}$/)
  assert.deepEqual(dashboardSummary(data, now), { totalTasks: 5, completedTasks: 2, overdueTasks: 2, avgGoalProgress: 43 })
  const completed = change(data, 'goal', data.goals[1]._id, { manualProgress: 100 }, 'progress')
  assert.equal(dashboardSummary(completed, now).avgGoalProgress, 25)
})

test('status transitions update progress and preserve completion time on metadata edits', () => {
  const data = sample()
  const task = data.tasks[1]
  const completed = change(data, 'task', task._id, { status: 'done' })
  assert.equal(completed.goals[0].progress, 50)
  assert.equal(completed.tasks[1].completedAt, now)
  const edited = mutateMockData(completed, { type: 'save', kind: 'task', id: task._id, payload: { title: 'Edited' }, now: '2026-10-11T05:00:00.000Z' })
  assert.equal(edited.tasks[1].completedAt, now)
  const reopened = change(edited, 'task', task._id, { status: 'todo' })
  assert.equal(reopened.tasks[1].completedAt, null)
  assert.equal(reopened.goals[0].progress, 25)
  assert.equal(data.tasks[1].status, 'in_progress')
})

test('moving and deleting linked tasks recalculate affected goals', () => {
  let data = sample()
  data = change(data, 'goal', data.goals[1]._id, { progressMode: 'task_based' })
  data = change(data, 'task', data.tasks[0]._id, { goalId: data.goals[1]._id })
  assert.equal(data.goals[0].progress, 0)
  assert.equal(data.goals[1].progress, 100)
  data = change(data, 'task', data.tasks[4]._id, null, 'delete')
  assert.equal(data.goals[1].progress, 100)
  data = change(data, 'task', data.tasks[0]._id, null, 'delete')
  assert.equal(data.goals[1].progress, 0)
  assert.equal(data.goals[1].status, 'active')
})

test('goal mode changes preserve progress; deleting goals keeps tasks', () => {
  const data = sample()
  const manual = change(data, 'goal', data.goals[0]._id, { progressMode: 'manual' })
  assert.equal(manual.goals[0].manualProgress, 25)
  const deleted = change(manual, 'goal', data.goals[0]._id, null, 'delete')
  assert.equal(deleted.tasks.length, 5)
  assert.ok(deleted.tasks.slice(0, 4).every((task) => task.goalId === null))
  assert.equal(deleted.tasks[4].goalId, data.goals[1]._id)
})

test('UTC conversions retain Vietnam dates and month boundaries', () => {
  assert.equal(dateToISO('2026-10-10'), '2026-10-10T16:59:59.999Z')
  assert.equal(timeToISO('2026-10-10T00:15'), '2026-10-09T17:15:00.000Z')
  assert.equal(dateOnly('2026-10-09T17:15:00.000Z'), '2026-10-10')
  assert.equal(shiftMonth('2026-12', 1), '2027-01')
  assert.equal(monthCells('2028-02').filter(Boolean).length, 29)
  assert.equal(monthCells('2026-10').length % 7, 0)
  assert.equal(isOverdue({ status: 'todo', dueDate: null }, now), false)
  assert.equal(isOverdue({ status: 'done', dueDate: '2026-01-01T00:00:00.000Z' }, now), false)
})

test('sort uses priority ties and does not mutate the input list', () => {
  const tasks = sample().tasks
  const original = tasks.map((task) => task._id)
  assert.equal(sortTasks(tasks, 'dueDate_asc')[1].priority, 'high')
  assert.equal(sortTasks(tasks, 'priority_desc')[0].title, 'Review API contract')
  assert.deepEqual(tasks.map((task) => task._id), original)
})

test('empty and reset controls do not leave stale goal associations', () => {
  let data = mutateMockData(sample(), { type: 'empty' })
  assert.deepEqual(dashboardSummary(data, now), { totalTasks: 0, completedTasks: 0, overdueTasks: 0, avgGoalProgress: 0 })
  data = change(data, 'goal', '300000000000000000000001', { title: 'New goal', progressMode: 'task_based', manualProgress: 0, deadline: null })
  assert.equal(data.goals[0].progress, 0)
  data = mutateMockData(data, { type: 'reset', now })
  assert.equal(data.tasks.length, 5)
  assert.equal(data.goals[0].progress, 25)
})
