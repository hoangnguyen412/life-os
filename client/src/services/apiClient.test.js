/** Transport/contract checks use mocked fetch and storage; no server or Atlas is contacted. */
import test, { afterEach, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { apiRequest, ApiError, API_URL } from './apiClient.js'
import { getToken, setToken } from './authToken.js'
import * as authApi from './authApi.js'
import * as taskApi from './taskApi.js'
import * as goalApi from './goalApi.js'

let calls
let redirects
let savedStorage
let savedWindow

beforeEach((t) => {
  calls = []
  redirects = []
  savedStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  savedWindow = Object.getOwnPropertyDescriptor(globalThis, 'window')
  const items = new Map()
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => items.set(key, String(value)),
    removeItem: (key) => items.delete(key),
  } })
  Object.defineProperty(globalThis, 'window', { configurable: true, value: {
    location: { pathname: '/tasks', replace: (path) => redirects.push(path) },
  } })
  // Always stub fetch, so an unexpected request cannot touch a real backend.
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    calls.push({ url, ...options })
    return Response.json({ success: true, data: { _id: 'record-id' } })
  })
})

afterEach(() => {
  if (savedStorage) Object.defineProperty(globalThis, 'localStorage', savedStorage)
  else delete globalThis.localStorage
  if (savedWindow) Object.defineProperty(globalThis, 'window', savedWindow)
  else delete globalThis.window
})

test('list requests retain pagination, encode filters, and send the current JWT', async (t) => {
  const envelope = { success: true, data: [], pagination: { page: 2, limit: 8, total: 0, totalPages: 0 } }
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    calls.push({ url, ...options })
    return Response.json(envelope)
  })
  setToken('session-token')
  assert.deepEqual(await taskApi.listTasks({ page: 2, limit: 8, overdue: false, status: '', goalId: 'a & b' }), envelope)
  const url = new URL(calls[0].url)
  assert.equal(url.searchParams.get('overdue'), 'false')
  assert.equal(url.searchParams.get('page'), '2')
  assert.equal(url.searchParams.get('goalId'), 'a & b')
  assert.equal(url.searchParams.has('status'), false)
  assert.equal(calls[0].headers.Authorization, 'Bearer session-token')
  assert.equal(calls[0].headers['Content-Type'], undefined)
  assert.equal(calls[0].body, undefined)
})

test('Task mutations send only editable fields and preserve nullable fields on PUT', async () => {
  const task = { title: 'Task', description: '', status: 'done', dueDate: '', goalId: '', priority: 'high', userId: 'foreign', completedAt: 'read-only' }
  await taskApi.createTask(task)
  await taskApi.updateTask('task-id', task)
  const expected = { title: 'Task', description: null, status: 'done', dueDate: null, goalId: null, priority: 'high' }
  assert.deepEqual(JSON.parse(calls[0].body), expected)
  assert.deepEqual(JSON.parse(calls[1].body), expected)
  assert.equal(calls[0].method, 'POST')
  assert.equal(calls[1].method, 'PUT')
  assert.equal(calls[1].url, `${API_URL}/tasks/task-id`)
  assert.equal(calls[1].headers['Content-Type'], 'application/json')
})

test('Goal creation/edits keep server fields out and manual progress uses its PATCH endpoint', async () => {
  await goalApi.createGoal({ title: 'Automatic', progressMode: 'task_based', manualProgress: 0, progress: 75, status: 'completed' })
  await goalApi.createGoal({ title: 'Manual', progressMode: 'manual', manualProgress: 60 })
  await goalApi.updateGoal('goal-id', { title: 'Updated', deadline: null, progressMode: 'manual', manualProgress: 80, progress: 80, userId: 'foreign' })
  await goalApi.updateGoalProgress('goal-id', 0)
  assert.deepEqual(JSON.parse(calls[0].body), { title: 'Automatic', deadline: null, progressMode: 'task_based' })
  assert.equal(JSON.parse(calls[1].body).manualProgress, 60)
  assert.deepEqual(JSON.parse(calls[2].body), { title: 'Updated', deadline: null, progressMode: 'manual' })
  assert.equal(calls[3].method, 'PATCH')
  assert.equal(calls[3].url, `${API_URL}/goals/goal-id/progress`)
  assert.deepEqual(JSON.parse(calls[3].body), { manualProgress: 0 })
})

test('detail/delete endpoints encode IDs, list Goals paginates, and signals reach fetch', async () => {
  const signal = new AbortController().signal
  await taskApi.getTask('a/b', { signal })
  await taskApi.deleteTask('task-id')
  await goalApi.listGoals({ page: 3, limit: 10 })
  await goalApi.getGoal('goal-id')
  await goalApi.deleteGoal('goal-id')
  assert.equal(calls[0].url, `${API_URL}/tasks/a%2Fb`)
  assert.equal(calls[0].signal, signal)
  assert.equal(calls[1].method, 'DELETE')
  assert.equal(new URL(calls[2].url).searchParams.get('page'), '3')
  assert.equal(calls[3].url, `${API_URL}/goals/goal-id`)
  assert.equal(calls[4].method, 'DELETE')
})

test('login/register use public requests and save tokens; me and logout use local session', async (t) => {
  setToken('old-token')
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    calls.push({ url, ...options })
    return Response.json({ success: true, data: { token: 'new-token', user: { _id: 'user-id' } } })
  })
  await authApi.login({ email: 'user@example.com', password: 'password', userId: 'ignored' })
  assert.equal(calls[0].headers.Authorization, undefined)
  assert.deepEqual(JSON.parse(calls[0].body), { email: 'user@example.com', password: 'password' })
  assert.equal(getToken(), 'new-token')
  await authApi.register({ name: 'User', email: 'user@example.com', password: 'password' })
  assert.equal(calls[1].url, `${API_URL}/auth/register`)
  assert.equal(calls[1].headers.Authorization, undefined)
  await authApi.getCurrentUser()
  assert.equal(calls[2].url, `${API_URL}/auth/me`)
  assert.equal(calls[2].headers.Authorization, 'Bearer new-token')
  authApi.logout()
  assert.equal(getToken(), null)
  assert.equal(calls.length, 3)
})

test('API validation errors expose status, code and field for forms', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => Response.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Title is required', field: 'title' } }, { status: 400 }))
  await assert.rejects(taskApi.createTask({ title: '' }), (error) => {
    assert.ok(error instanceof ApiError)
    assert.equal(error.status, 400)
    assert.equal(error.code, 'VALIDATION_ERROR')
    assert.equal(error.field, 'title')
    assert.equal(error.message, 'Title is required')
    return true
  })
})

test('protected 401 clears the expired session and redirects; bad login stays inline', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => Response.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid credentials' } }, { status: 401 }))
  setToken('expired-token')
  await assert.rejects(authApi.getCurrentUser(), { code: 'UNAUTHORIZED' })
  assert.equal(getToken(), null)
  assert.deepEqual(redirects, ['/login'])
  redirects.length = 0
  setToken('existing-token')
  await assert.rejects(authApi.login({ email: 'user@example.com', password: 'wrong' }), { status: 401 })
  assert.equal(getToken(), 'existing-token')
  assert.deepEqual(redirects, [])
})

test('a delayed unauthorized response does not clear a newer login', async (t) => {
  setToken('old-token')
  t.mock.method(globalThis, 'fetch', async () => {
    setToken('new-token')
    return Response.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Expired' } }, { status: 401 })
  })
  await assert.rejects(authApi.getCurrentUser(), { status: 401 })
  assert.equal(getToken(), 'new-token')
  assert.deepEqual(redirects, [])
})

test('network, malformed JSON/envelopes and cancellation have distinct outcomes', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => { throw new TypeError('Failed to fetch') })
  await assert.rejects(apiRequest('/tasks'), { code: 'NETWORK_ERROR', status: 0 })
  t.mock.method(globalThis, 'fetch', async () => new Response('<html>Bad gateway</html>', { status: 502 }))
  await assert.rejects(apiRequest('/tasks'), { code: 'INVALID_RESPONSE', status: 502 })
  t.mock.method(globalThis, 'fetch', async () => Response.json({ tasks: [] }))
  await assert.rejects(apiRequest('/tasks'), { code: 'INVALID_RESPONSE' })
  const aborted = new DOMException('Cancelled', 'AbortError')
  t.mock.method(globalThis, 'fetch', async () => { throw aborted })
  await assert.rejects(apiRequest('/tasks'), (error) => error === aborted)
})

test('malformed login success never stores a missing token', async () => {
  await assert.rejects(authApi.login({ email: 'user@example.com', password: 'password' }), { code: 'INVALID_RESPONSE' })
  assert.equal(getToken(), null)
})
