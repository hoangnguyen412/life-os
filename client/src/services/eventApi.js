import { listAll, request } from './apiClient.js'

export const listEvents = () => listAll('/events')
export const createEvent = (body) => request('/events', { method: 'POST', body })
export const updateEvent = (id, body) => request(`/events/${id}`, { method: 'PUT', body })
export const deleteEvent = (id) => request(`/events/${id}`, { method: 'DELETE' })
