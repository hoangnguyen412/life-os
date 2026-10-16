/**
 * Own the in-memory preview records and expose CRUD actions through Context.
 * All pages read this same state; refresh recreates fixtures because nothing is persisted.
 * Future API services must replace mock actions and use server-returned records.
 */
import { useState } from 'react'
import MockDataContext from './MockDataContext.js'
import { createSampleData } from './sampleData.js'
import { mutateMockData, recalculateGoals } from './mockStore.js'

export default function MockDataProvider({ children }) {
  // The initializer creates sample records and computes their initial goal progress.
  const [data, setData] = useState(() => recalculateGoals(createSampleData()))
  const [viewState, setViewState] = useState('normal')
  const [notice, setNotice] = useState('')

  // Functional updates always use the latest store, then display common preview feedback.
  function change(action, message) {
    setData((current) => mutateMockData(current, { ...action, now: new Date().toISOString() }))
    setViewState('normal')
    setNotice(message)
  }

  // An existing id means edit; otherwise generate a 24-character hexadecimal preview ID.
  // These IDs resemble backend ObjectIds but do not represent database writes.
  function save(kind, payload, id) {
    const recordId = id ?? Array.from(crypto.getRandomValues(new Uint8Array(12)), (byte) => byte.toString(16).padStart(2, '0')).join('')
    change({ type: 'save', kind, payload, id: recordId }, `${id ? 'Updated' : 'Created'} ${kind} in this preview.`)
  }

  // Consumers receive both collections and named actions, without editing arrays directly.
  const value = {
    ...data, viewState, setViewState, notice, save,
    remove: (kind, id) => change({ type: 'delete', kind, id }, `Deleted ${kind} in this preview.`),
    updateProgress: (id, manualProgress) => change({ type: 'progress', kind: 'goal', id, payload: { manualProgress } }, 'Progress updated in this preview.'),
    reset: () => change({ type: 'reset' }, 'Sample data restored.'),
    empty: () => change({ type: 'empty' }, 'Sample data cleared. You can add items or reset the preview.'),
  }
  return <MockDataContext.Provider value={value}>{children}</MockDataContext.Provider>
}
