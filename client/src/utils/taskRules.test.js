import test from 'node:test'
import assert from 'node:assert/strict'
import { isOverdue, sortTasks } from './taskRules.js'

test('overdue status uses the API rule and excludes tasks without dates or already done', () => {
  const now = '2026-11-01T12:00:00.000Z'
  assert.equal(isOverdue({ dueDate: '2026-11-01T11:59:59.999Z', status: 'todo' }, now), true)
  assert.equal(isOverdue({ dueDate: now, status: 'todo' }, now), false)
  assert.equal(isOverdue({ dueDate: '2026-10-01T00:00:00.000Z', status: 'done' }, now), false)
  assert.equal(isOverdue({ dueDate: null, status: 'todo' }, now), false)
})

test('task sort modes preserve input and apply priority and due-date tie breaks', () => {
  const tasks = [
    { _id: 'a', priority: 'low', dueDate: null, createdAt: '2026-10-01' },
    { _id: 'b', priority: 'high', dueDate: '2026-11-02', createdAt: '2026-10-02' },
    { _id: 'c', priority: 'high', dueDate: '2026-11-01', createdAt: '2026-10-01' },
  ]
  assert.deepEqual(sortTasks(tasks, 'dueDate_asc').map(({ _id }) => _id), ['c', 'b', 'a'])
  assert.deepEqual(sortTasks(tasks, 'priority_desc').map(({ _id }) => _id), ['c', 'b', 'a'])
  assert.deepEqual(sortTasks(tasks, 'createdAt_desc').map(({ _id }) => _id), ['b', 'c', 'a'])
  assert.deepEqual(tasks.map(({ _id }) => _id), ['a', 'b', 'c'])
})
