/**
 * Read the shared preview data and actions from React Context.
 * Fail explicitly outside MockDataProvider rather than returning unusable data.
 */
import { useContext } from 'react'
import MockDataContext from '../mocks/MockDataContext.js'

export default function useMockData() {
  const context = useContext(MockDataContext)
  if (!context) throw new Error('MockDataProvider is required')
  return context
}
