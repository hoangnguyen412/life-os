import { useContext } from 'react'
import AppDataContext from './AppDataContext.js'

export default function useAppData() {
  const value = useContext(AppDataContext)
  if (!value) throw new Error('AppDataProvider is required')
  return value
}
