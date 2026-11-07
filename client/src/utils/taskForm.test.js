/** Check real Task drafts and date conversion without starting a server or writing data. */
import test from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import process from 'node:process'
import { taskDateInput, taskPayload, validateTask } from './taskForm.js'

const draft = () => ({ title: '  Finish Task UI  ', description: '  API integration  ', status: 'in_progress', priority: 'high', dueDate: '', goalId: '' })

test('Task validation accepts optional dates and rejects blank titles and invalid calendar days', () => {
  assert.deepEqual(validateTask(draft()), {})
  assert.equal(validateTask({ ...draft(), title: '   ' }).title, 'Title is required.')
  for (const dueDate of ['2026-02-30', 'not-a-date', '2026-13-01']) {
    assert.equal(validateTask({ ...draft(), dueDate }).dueDate, 'Enter a valid due date.')
  }
  assert.deepEqual(validateTask({ ...draft(), dueDate: '2028-02-29' }), {})
})

test('Task payload trims text, clears nullable fields and excludes server-managed values', () => {
  assert.deepEqual(taskPayload({ ...draft(), description: ' ', userId: 'foreign', completedAt: 'read-only' }), {
    title: 'Finish Task UI', description: null, status: 'in_progress', priority: 'high', dueDate: null, goalId: null,
  })
  assert.equal(taskDateInput(null), '')
})

test('editing a Task preserves its local deadline and changing a date stores local end of day', () => {
  const result = taskPayload({ ...draft(), dueDate: '2026-11-15', goalId: '100000000000000000000001' })
  assert.equal(taskDateInput(result.dueDate), '2026-11-15')
  const date = new Date(result.dueDate)
  assert.equal(date.getHours(), 23)
  assert.equal(date.getMinutes(), 59)
  assert.equal(date.getSeconds(), 59)
  assert.equal(date.getMilliseconds(), 999)
  assert.equal(result.goalId, '100000000000000000000001')
})

test('deadline conversion follows the browser timezone, including a daylight-saving boundary', () => {
  const moduleUrl = new URL('./taskForm.js', import.meta.url).href
  const script = `import { taskPayload, taskDateInput } from ${JSON.stringify(moduleUrl)};
    const task = taskPayload({ title: 'Task', description: '', status: 'todo', priority: 'medium', dueDate: '2026-03-08', goalId: '' });
    console.log(JSON.stringify({ iso: task.dueDate, day: taskDateInput(task.dueDate) }));`
  for (const [timezone, iso] of [
    ['Asia/Ho_Chi_Minh', '2026-03-08T16:59:59.999Z'],
    ['UTC', '2026-03-08T23:59:59.999Z'],
    ['America/Los_Angeles', '2026-03-09T06:59:59.999Z'],
  ]) {
    const result = JSON.parse(execFileSync(process.execPath, ['--input-type=module', '-e', script], {
      env: { ...process.env, TZ: timezone }, encoding: 'utf8',
    }))
    assert.deepEqual(result, { iso, day: '2026-03-08' })
  }
})
