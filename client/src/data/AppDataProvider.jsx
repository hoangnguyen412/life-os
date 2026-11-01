import { useCallback, useEffect, useState } from 'react'
import AppDataContext from './AppDataContext.js'
import * as taskApi from '../services/taskApi.js'
import * as goalApi from '../services/goalApi.js'
import * as eventApi from '../services/eventApi.js'
import { getSummary } from '../services/dashboardApi.js'

function loadWorkspaceData() {
  return Promise.all([taskApi.listTasks(), goalApi.listGoals(), eventApi.listEvents(), getSummary()])
    .then(([tasks, goals, events, dashboard]) => ({ tasks, goals, events, dashboard }))
}

export default function AppDataProvider({ children }) {
  const [tasks, setTasks] = useState([])
  const [goals, setGoals] = useState([])
  const [events, setEvents] = useState([])
  const [dashboard, setDashboard] = useState({ totalTasks: 0, completedTasks: 0, overdueTasks: 0, avgGoalProgress: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const refresh = useCallback(async ({ showLoading = true } = {}) => {
    if (showLoading) setLoading(true)
    setError('')
    try {
      const result = await loadWorkspaceData()
      setTasks(result.tasks)
      setGoals(result.goals)
      setEvents(result.events)
      setDashboard(result.dashboard)
    } catch (cause) {
      setError(cause.message)
      throw cause
    } finally {
      if (showLoading) setLoading(false)
    }
  }, [])

  useEffect(() => {
    let active = true
    loadWorkspaceData().then((result) => {
      if (!active) return
      setTasks(result.tasks)
      setGoals(result.goals)
      setEvents(result.events)
      setDashboard(result.dashboard)
      setLoading(false)
    }).catch((cause) => {
      if (!active) return
      setError(cause.message)
      setLoading(false)
    })
    return () => { active = false }
  }, [])

  async function save(kind, payload, id) {
    setSaving(true)
    try {
      if (kind === 'task') id ? await taskApi.updateTask(id, payload) : await taskApi.createTask(payload)
      else if (kind === 'goal') id ? await goalApi.updateGoal(id, payload) : await goalApi.createGoal(payload)
      else id ? await eventApi.updateEvent(id, payload) : await eventApi.createEvent(payload)
      await refresh({ showLoading: false })
    } finally { setSaving(false) }
  }

  async function remove(kind, id) {
    setSaving(true)
    try {
      if (kind === 'task') await taskApi.deleteTask(id)
      else if (kind === 'goal') await goalApi.deleteGoal(id)
      else await eventApi.deleteEvent(id)
      await refresh({ showLoading: false })
    } finally { setSaving(false) }
  }

  async function updateProgress(id, value) {
    setSaving(true)
    try { await goalApi.updateProgress(id, value); await refresh({ showLoading: false }) }
    finally { setSaving(false) }
  }

  const value = { tasks, goals, events, dashboard, loading, error, saving, refresh, save, remove, updateProgress }
  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>
}
