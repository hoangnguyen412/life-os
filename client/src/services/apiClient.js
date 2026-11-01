const API_URL = (import.meta.env?.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '')
const TOKEN_KEY = 'lifeos_token'

export class ApiError extends Error {
  constructor(status, code, message, field) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.field = field
  }
}

export async function request(path, { method = 'GET', body, token = localStorage.getItem(TOKEN_KEY) } = {}) {
  let response
  try {
    response = await fetch(`${API_URL}/api${path}`, {
      method,
      headers: {
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    })
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', 'Could not reach the server. Check that the backend is running.')
  }

  const result = await response.json().catch(() => ({}))
  if (!response.ok || result.success === false) {
    const error = result.error ?? {}
    if (response.status === 401 && localStorage.getItem(TOKEN_KEY)) {
      window.dispatchEvent(new Event('lifeos:unauthorized'))
    }
    throw new ApiError(response.status, error.code, error.message || 'The request could not be completed.', error.field)
  }
  return result
}

export async function listAll(path, query = '') {
  const records = []
  let page = 1
  while (true) {
    const result = await request(`${path}?page=${page}&limit=100${query}`)
    records.push(...result.data)
    if (page >= result.pagination.totalPages) break
    page += 1
  }
  return records
}

export { TOKEN_KEY }
