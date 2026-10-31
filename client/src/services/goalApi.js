/** Goal progress/status are backend-owned. Return the server result without recalculating. */
import { apiRequest } from './apiClient.js'

export function listGoals({ page, limit } = {}, options) {
  return apiRequest('/goals', { query: { page, limit }, signal: options?.signal })
}
export const getGoal = (id, options) => apiRequest(`/goals/${encodeURIComponent(id)}`, { signal: options?.signal })
export function createGoal(goal, options) {
  const body = {
    title: goal.title,
    deadline: goal.deadline || null,
    progressMode: goal.progressMode ?? 'task_based',
  }
  // The backend rejects manualProgress on task-based Goal creation.
  if (body.progressMode === 'manual' && goal.manualProgress !== undefined) body.manualProgress = goal.manualProgress
  return apiRequest('/goals', { method: 'POST', body, signal: options?.signal })
}
export function updateGoal(id, goal, options) {
  const body = { title: goal.title, deadline: goal.deadline || null, progressMode: goal.progressMode }
  return apiRequest(`/goals/${encodeURIComponent(id)}`, { method: 'PUT', body, signal: options?.signal })
}
// The server validates 0–100 and rejects this operation for task-based Goals.
export const updateGoalProgress = (id, manualProgress, options) => apiRequest(`/goals/${encodeURIComponent(id)}/progress`, { method: 'PATCH', body: { manualProgress }, signal: options?.signal })
export const deleteGoal = (id, options) => apiRequest(`/goals/${encodeURIComponent(id)}`, { method: 'DELETE', signal: options?.signal })
