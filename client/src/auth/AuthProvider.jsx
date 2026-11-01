/** Share the signed-in user and basic Auth actions with the whole application. */
import { useEffect, useState } from 'react'
import AuthContext from './AuthContext.js'
import * as authApi from '../services/authApi.js'
import { getToken } from '../services/authToken.js'

export default function AuthProvider({ children }) {
  const [session, setSession] = useState(() => ({
    status: getToken() ? 'loading' : 'anonymous', user: null, error: null,
  }))
  const [attempt, setAttempt] = useState(0)

  // On refresh, verify the saved token before opening any protected page.
  useEffect(() => {
    if (!getToken()) return
    let active = true

    async function checkSession() {
      try {
        const result = await authApi.getCurrentUser()
        if (active) setSession({ status: 'authenticated', user: result.data, error: null })
      } catch (error) {
        if (!active) return
        if (error.status === 401 || error.code === 'UNAUTHORIZED') {
          authApi.logout()
          setSession({ status: 'anonymous', user: null, error: null })
        } else {
          setSession({ status: 'error', user: null, error: error.message })
        }
      }
    }

    void checkSession()
    // Ignore a response if this provider has already unmounted.
    return () => { active = false }
  }, [attempt])

  async function login(values) {
    const result = await authApi.login(values)
    setSession({ status: 'authenticated', user: result.data.user, error: null })
  }

  async function register(values) {
    const result = await authApi.register(values)
    setSession({ status: 'authenticated', user: result.data.user, error: null })
  }

  function logout() {
    authApi.logout()
    setSession({ status: 'anonymous', user: null, error: null })
  }

  // A network failure keeps the token so the user can retry verification.
  function retry() {
    if (!getToken()) { logout(); return }
    setSession({ status: 'loading', user: null, error: null })
    setAttempt((current) => current + 1)
  }

  return <AuthContext.Provider value={{ ...session, login, register, logout, retry }}>{children}</AuthContext.Provider>
}
