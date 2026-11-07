import { useContext } from 'react'
import AuthContext from '../auth/AuthContext.js'

export default function useAuth() {
  const auth = useContext(AuthContext)
  if (!auth) throw new Error('useAuth must be used inside AuthProvider')
  return auth
}
