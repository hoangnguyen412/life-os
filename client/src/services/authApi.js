/** Public login/register calls save the returned JWT; logout only clears local state. */
import { apiRequest, ApiError } from './apiClient.js'
import { clearToken, setToken } from './authToken.js'

async function authenticate(path, body, options) {
  const result = await apiRequest(path, { method: 'POST', body, auth: false, signal: options?.signal })
  if (typeof result.data?.token !== 'string' || !result.data.token.trim()) {
    throw new ApiError('The server did not return a valid login token.', { code: 'INVALID_RESPONSE' })
  }
  assertUser(result.data.user)
  // A caller that cancels its request must not save a token from that response.
  options?.signal?.throwIfAborted()
  setToken(result.data.token)
  return result
}

export const register = ({ name, email, password }, options) => authenticate('/auth/register', { name, email, password }, options)
export const login = ({ email, password }, options) => authenticate('/auth/login', { email, password }, options)
function assertUser(user) {
  if (typeof user?._id !== 'string' || !user._id.trim()) {
    throw new ApiError('The server did not return a valid user.', { code: 'INVALID_RESPONSE' })
  }
}

export async function getCurrentUser(options) {
  const result = await apiRequest('/auth/me', { signal: options?.signal })
  assertUser(result.data)
  return result
}
// There is no logout endpoint in the API contract; navigation belongs to the Auth UI.
export const logout = () => clearToken()
