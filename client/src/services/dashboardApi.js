import { request } from './apiClient.js'

export async function getSummary() {
  const result = await request('/dashboard/summary')
  return result.data
}
