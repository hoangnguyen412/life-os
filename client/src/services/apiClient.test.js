import test from 'node:test'
import assert from 'node:assert/strict'
import { request, listAll, ApiError } from './apiClient.js'

const values = new Map()
globalThis.localStorage = {
  getItem: (key) => values.get(key) ?? null,
  setItem: (key, value) => values.set(key, value),
  removeItem: (key) => values.delete(key),
}

test('request sends JSON and the saved bearer token to the documented API prefix', async () => {
  values.set('lifeos_token', 'test-token')
  let captured
  globalThis.fetch = async (url, options) => {
    captured = { url, options }
    return { ok: true, json: async () => ({ success: true, data: { _id: '123' } }) }
  }

  const result = await request('/tasks', { method: 'POST', body: { title: 'Read' } })
  assert.equal(captured.url, 'http://localhost:5000/api/tasks')
  assert.equal(captured.options.headers.Authorization, 'Bearer test-token')
  assert.equal(captured.options.headers['Content-Type'], 'application/json')
  assert.deepEqual(JSON.parse(captured.options.body), { title: 'Read' })
  assert.deepEqual(result.data, { _id: '123' })
})

test('request returns the API error envelope as a readable ApiError', async () => {
  globalThis.fetch = async () => ({
    ok: false,
    status: 400,
    json: async () => ({ success: false, error: { code: 'VALIDATION_ERROR', message: 'title is required', field: 'title' } }),
  })
  await assert.rejects(request('/tasks', { token: null }), (error) => {
    assert.ok(error instanceof ApiError)
    assert.equal(error.status, 400)
    assert.equal(error.field, 'title')
    assert.equal(error.message, 'title is required')
    return true
  })
})

test('listAll follows pagination until the API reports its final page', async () => {
  const requested = []
  globalThis.fetch = async (url) => {
    requested.push(url)
    const page = Number(new URL(url).searchParams.get('page'))
    return {
      ok: true,
      json: async () => ({
        success: true,
        data: [{ _id: String(page) }],
        pagination: { totalPages: 2 },
      }),
    }
  }
  assert.deepEqual(await listAll('/goals'), [{ _id: '1' }, { _id: '2' }])
  assert.equal(requested.length, 2)
  assert.equal(new URL(requested[1]).searchParams.get('limit'), '100')
})
