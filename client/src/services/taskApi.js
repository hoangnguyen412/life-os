/** Task endpoints accept UTC ISO dates. Convert date-picker values before calling. */
import { apiRequest } from './apiClient.js'

// Explicit fields prevent sending userId, completedAt or timestamps from a UI record.
function taskBody(task) {
  return {
    title: task.title,
    description: task.description || null,
    status: task.status,
    dueDate: task.dueDate || null,
    goalId: task.goalId || null,
    priority: task.priority,
  }
}

export function listTasks({ status, goalId, overdue, sort, page, limit } = {}, options) {
  return apiRequest('/tasks', { query: { status, goalId, overdue, sort, page, limit }, signal: options?.signal })
}
export const getTask = (id, options) => apiRequest(`/tasks/${encodeURIComponent(id)}`, { signal: options?.signal })
export const createTask = (task, options) => apiRequest('/tasks', { method: 'POST', body: taskBody(task), signal: options?.signal })
// PUT replaces every editable field: pass the full draft, even for a status change.
export const updateTask = (id, task, options) => apiRequest(`/tasks/${encodeURIComponent(id)}`, { method: 'PUT', body: taskBody(task), signal: options?.signal })
export const deleteTask = (id, options) => apiRequest(`/tasks/${encodeURIComponent(id)}`, { method: 'DELETE', signal: options?.signal })
