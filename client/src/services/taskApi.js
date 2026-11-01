import { listAll, request } from './apiClient.js'

export const listTasks = () => listAll('/tasks')
export const createTask = (body) => request('/tasks', { method: 'POST', body })
export const updateTask = (id, body) => request(`/tasks/${id}`, { method: 'PUT', body })
export const deleteTask = (id) => request(`/tasks/${id}`, { method: 'DELETE' })
