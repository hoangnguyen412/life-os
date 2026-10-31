/** Public login/register calls save the returned JWT; logout only clears local state. */
import { apiRequest, ApiError } from './apiClient.js'
import { clearToken, setToken } from './authToken.js'

async function authenticate(path, body, options) {
  const result = await apiRequest(path, { method: 'POST', body, auth: false, signal: options?.signal })
  if (typeof result.data?.token !== 'string' || !result.data.token.trim()) {
    throw new ApiError('The server did not return a valid login token.', { code: 'INVALID_RESPONSE' })
  }
  setToken(result.data.token)
  return result
}

export const register = ({ name, email, password }, options) => authenticate('/auth/register', { name, email, password }, options)
export const login = ({ email, password }, options) => authenticate('/auth/login', { email, password }, options)
export const getCurrentUser = (options) => apiRequest('/auth/me', { signal: options?.signal })
// There is no logout endpoint in the API contract; navigation belongs to the Auth UI.
export const logout = () => clearToken()
