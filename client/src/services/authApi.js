import { request } from './apiClient.js'

export const register = (body) => request('/auth/register', { method: 'POST', body, token: null })
export const login = (body) => request('/auth/login', { method: 'POST', body, token: null })
export const currentUser = () => request('/auth/me')
