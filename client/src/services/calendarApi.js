import { apiRequest } from './apiClient.js'
import { listTasks } from './taskApi.js'

async function allPages(load) {
  const items = []
  let page = 1
  let totalPages
  do {
    const result = await load(page)
    items.push(...result.data)
    totalPages = result.pagination.totalPages
    page += 1
  } while (page <= totalPages)
  return items
}

export function listCalendarEvents(range, signal) {
  return allPages((page) => apiRequest('/events', { query: { ...range, page, limit: 100 }, signal }))
}

// Monthly views pass a range; full-calendar exports omit it.
export function listCalendarTasks(signal, range = {}) {
  return allPages((page) => listTasks({ dueFrom: range.from, dueTo: range.to, page, limit: 100 }, { signal }))
}

export const createEvent = (body) => apiRequest('/events', { method: 'POST', body })
export const updateEvent = (id, body) => apiRequest(`/events/${encodeURIComponent(id)}`, { method: 'PUT', body })
export const deleteEvent = (id) => apiRequest(`/events/${encodeURIComponent(id)}`, { method: 'DELETE' })
