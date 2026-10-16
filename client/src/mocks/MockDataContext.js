/**
 * Context identity shared by the provider and useMockData.
 * A null default lets the hook detect a missing provider instead of hiding mistakes.
 */
import { createContext } from 'react'

export default createContext(null)
