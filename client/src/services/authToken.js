/** Store only the JWT; user details are loaded from /auth/me when Auth is connected. */
const TOKEN_KEY = 'life_os_token'

export const getToken = () => localStorage.getItem(TOKEN_KEY)
export const setToken = (token) => localStorage.setItem(TOKEN_KEY, token)
export const clearToken = () => localStorage.removeItem(TOKEN_KEY)
