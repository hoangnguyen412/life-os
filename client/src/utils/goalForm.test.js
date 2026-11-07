import test from 'node:test'
import assert from 'node:assert/strict'
import { goalPayload, progressError, validateGoal } from './goalForm.js'
import { taskDateInput } from './taskForm.js'

test('Goal progress accepts integer boundaries and rejects blank, fractional and out-of-range input', () => {
  for (const value of ['0', '50', '100']) assert.equal(progressError(value), '')
  for (const value of ['', ' ', '-1', '101', '2.5', 'abc']) assert.ok(progressError(value))
})

test('Goal form validates deadline and only validates starting progress for manual creation', () => {
  const values = { title: '  Goal  ', deadline: '2028-02-29', progressMode: 'manual', manualProgress: '0' }
  assert.deepEqual(validateGoal(values, true), {})
  assert.ok(validateGoal({ ...values, title: ' ', deadline: '2026-02-29' }, true).deadline)
  assert.ok(validateGoal({ ...values, title: ' ' }, true).title)
  assert.ok(validateGoal({ ...values, manualProgress: '' }, true).manualProgress)
  assert.deepEqual(validateGoal({ ...values, manualProgress: '' }, false), {})
  assert.deepEqual(validateGoal({ ...values, progressMode: 'task_based', manualProgress: '' }, true), {})
})

test('Goal payload preserves the local date and sends starting progress only on manual creation', () => {
  const values = { title: '  Goal  ', deadline: '2026-11-01', progressMode: 'manual', manualProgress: '100', progress: 99, status: 'completed' }
  const created = goalPayload(values, true)
  assert.equal(created.title, 'Goal')
  assert.equal(taskDateInput(created.deadline), values.deadline)
  assert.equal(new Date(created.deadline).getHours(), 23)
  assert.equal(created.manualProgress, 100)
  assert.equal(Object.hasOwn(created, 'progress'), false)
  assert.equal(Object.hasOwn(created, 'status'), false)
  assert.equal(Object.hasOwn(goalPayload(values, false), 'manualProgress'), false)
  assert.equal(Object.hasOwn(goalPayload({ ...values, progressMode: 'task_based' }, true), 'manualProgress'), false)
  assert.equal(goalPayload({ ...values, deadline: '' }, false).deadline, null)
})
