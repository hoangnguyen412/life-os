import { apiRequest } from './apiClient.js'

export const getDashboardSummary = (options) => apiRequest('/dashboard/summary', { signal: options?.signal })
