import { listAll, request } from './apiClient.js'

export const listGoals = () => listAll('/goals')
export const createGoal = (body) => request('/goals', { method: 'POST', body })
export const updateGoal = (id, body) => request(`/goals/${id}`, { method: 'PUT', body })
export const updateProgress = (id, manualProgress) => request(`/goals/${id}/progress`, { method: 'PATCH', body: { manualProgress } })
export const deleteGoal = (id) => request(`/goals/${id}`, { method: 'DELETE' })
