import { useCallback, useEffect, useState } from 'react'
import AuthContext from './AuthContext.js'
import * as authApi from '../services/authApi.js'
import { TOKEN_KEY } from '../services/apiClient.js'

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(Boolean(localStorage.getItem(TOKEN_KEY)))
  const [sessionError, setSessionError] = useState('')

  const verifySession = useCallback(async () => {
    if (!localStorage.getItem(TOKEN_KEY)) {
      setUser(null)
      setSessionError('')
      setLoading(false)
      return
    }
    try {
      const { data } = await authApi.currentUser()
      setUser(data)
    } catch (error) {
      if (error.status === 401) {
        localStorage.removeItem(TOKEN_KEY)
        setUser(null)
      } else setSessionError(error.message)
    } finally { setLoading(false) }
  }, [])

  useEffect(() => {
    if (localStorage.getItem(TOKEN_KEY)) {
      authApi.currentUser().then(({ data }) => {
        setUser(data)
      }).catch((error) => {
        if (error.status === 401) localStorage.removeItem(TOKEN_KEY)
        else setSessionError(error.message)
      }).finally(() => setLoading(false))
    }
    const handleUnauthorized = () => {
      localStorage.removeItem(TOKEN_KEY)
      setUser(null)
      setLoading(false)
      setSessionError('')
    }
    window.addEventListener('lifeos:unauthorized', handleUnauthorized)
    return () => window.removeEventListener('lifeos:unauthorized', handleUnauthorized)
  }, [])

  async function authenticate(action, credentials) {
    const { data } = await action(credentials)
    localStorage.setItem(TOKEN_KEY, data.token)
    setUser(data.user)
    setSessionError('')
    return data.user
  }

  async function retrySession() {
    setLoading(true)
    setSessionError('')
    await verifySession()
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY)
    setUser(null)
    setSessionError('')
  }

  const value = {
    user,
    loading,
    sessionError,
    retrySession,
    login: (values) => authenticate(authApi.login, values),
    register: (values) => authenticate(authApi.register, values),
    logout,
  }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
