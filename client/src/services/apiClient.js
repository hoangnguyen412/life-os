/**
 * Shared JSON transport for the /api contract. Keep the complete response envelope
 * so list callers receive both data and pagination. No request runs on import.
 */
import { clearToken, getToken } from './authToken.js'

// Vite replaces this value at build time. The fallback also supports Node-based tests.
export const API_URL = (import.meta.env?.VITE_API_URL || 'http://localhost:5000/api').replace(/\/+$/, '')

// Forms can map field to an input; code/status also support general error handling.
export class ApiError extends Error {
  constructor(message, { status = 0, code = 'NETWORK_ERROR', field, cause } = {}) {
    super(message, { cause })
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.field = field
  }
}

function expireSession(requestToken) {
  // An older request must not clear a token received from a newer successful login.
  if (getToken() !== requestToken) return
  clearToken()
  if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
    window.location.replace('/login')
  }
}

export async function apiRequest(path, { method = 'GET', body, query = {}, auth = true, signal } = {}) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    // Preserve false and zero; only omitted/empty filter values are left out.
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value))
  }
  const search = params.toString()
  const url = `${API_URL}/${path.replace(/^\/+/, '')}${search ? `?${search}` : ''}`
  const requestToken = auth ? getToken() : null
  const headers = { Accept: 'application/json' }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (requestToken) headers.Authorization = `Bearer ${requestToken}`

  let response
  try {
    response = await fetch(url, {
      method, headers, signal,
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    })
  } catch (cause) {
    // Cancellation is intentional; callers should not show it as a network failure.
    if (cause.name === 'AbortError') throw cause
    throw new ApiError('Could not reach the server. Please try again.', { cause })
  }

  // An expired protected session is invalid even if a proxy returns a non-JSON body.
  // Public login failures keep their inline error and do not redirect or clear tokens.
  if (auth && response.status === 401) expireSession(requestToken)
  let result
  try {
    result = await response.json()
  } catch (cause) {
    throw new ApiError('The server returned an invalid response.', {
      status: response.status, code: 'INVALID_RESPONSE', cause,
    })
  }

  if (!response.ok || result?.success === false) {
    if (auth && response.status !== 401 && result?.error?.code === 'UNAUTHORIZED') expireSession(requestToken)
    throw new ApiError(result?.error?.message || 'The request failed. Please try again.', {
      status: response.status,
      code: result?.error?.code || 'HTTP_ERROR',
      field: result?.error?.field,
    })
  }
  if (result?.success !== true || !Object.hasOwn(result, 'data')) {
    throw new ApiError('The server returned an invalid response.', {
      status: response.status, code: 'INVALID_RESPONSE',
    })
  }
  return result
}
