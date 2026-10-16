/**
 * Pure preview business rules: overdue checks, metrics, sorting and record mutations.
 * Functions return new objects/arrays so React can detect changes to shared state.
 * These simulate the contract in the browser; the backend remains authoritative later.
 */
import { createSampleData } from './sampleData.js'

// UTC ISO strings compare chronologically; completed tasks never count as overdue.
export const isOverdue = (task, now = new Date().toISOString()) => Boolean(task.dueDate && task.status !== 'done' && task.dueDate < now)

// Task-based progress = rounded done/linked count; manual goals use manualProgress.
// A goal without linked tasks starts at 0%, and 100% marks the goal completed.
export function recalculateGoals(data) {
  return { ...data, goals: data.goals.map((goal) => {
    const linked = data.tasks.filter((task) => task.goalId === goal._id)
    const progress = goal.progressMode === 'manual' ? goal.manualProgress
      : linked.length ? Math.round(linked.filter((task) => task.status === 'done').length / linked.length * 100) : 0
    return { ...goal, progress, status: progress === 100 ? 'completed' : 'active' }
  }) }
}

// Average only active goals; an empty set yields 0 rather than division by zero.
export function dashboardSummary(data, now) {
  const active = data.goals.filter((goal) => goal.status === 'active')
  return {
    totalTasks: data.tasks.length,
    completedTasks: data.tasks.filter((task) => task.status === 'done').length,
    overdueTasks: data.tasks.filter((task) => isOverdue(task, now)).length,
    avgGoalProgress: active.length ? Math.round(active.reduce((sum, goal) => sum + goal.progress, 0) / active.length) : 0,
  }
}

// Copy before sorting to preserve input order in shared state.
// Tie-breakers keep results deterministic; missing deadlines sort after dated tasks.
export function sortTasks(tasks, sort) {
  const priority = { high: 0, medium: 1, low: 2 }
  const due = (a, b) => (a.dueDate || '9999').localeCompare(b.dueDate || '9999')
  const rank = (a, b) => priority[a.priority] - priority[b.priority]
  const newest = (a, b) => b.createdAt.localeCompare(a.createdAt)
  return [...tasks].sort((a, b) => (
    sort === 'priority_desc' ? rank(a, b) || due(a, b) || newest(a, b)
      : sort === 'createdAt_desc' ? newest(a, b)
        : due(a, b) || rank(a, b) || newest(a, b)
  ) || a._id.localeCompare(b._id))
}

// One action dispatcher implements reset, empty, delete, save and manual-progress updates.
export function mutateMockData(data, action) {
  const { kind, id, payload, now } = action
  const collection = { task: 'tasks', goal: 'goals', event: 'events' }[kind]
  if (action.type === 'reset') return recalculateGoals(createSampleData(now))
  if (action.type === 'empty') return { tasks: [], goals: [], events: [] }
  // Removing a goal unlinks its tasks instead of deleting those tasks.
  if (action.type === 'delete') {
    const next = { ...data, [collection]: data[collection].filter((item) => item._id !== id) }
    if (kind === 'goal') next.tasks = next.tasks.map((task) => task.goalId === id ? { ...task, goalId: null, updatedAt: now } : task)
    return recalculateGoals(next)
  }
  // Merge edited fields into the original record; new records receive createdAt.
  const existing = data[collection].find((item) => item._id === id)
  let record = { ...existing, ...payload, _id: id, createdAt: existing?.createdAt ?? now }
  if (kind === 'task') {
    record.updatedAt = now
    // Preserve completion time on metadata edits; reopening clears it.
    record.completedAt = record.status === 'done' ? existing?.completedAt ?? now : null
  }
  // Switching task_based -> manual starts from the currently displayed progress.
  // Dedicated progress actions can change manualProgress; metadata edits preserve it.
  if (kind === 'goal' && existing) {
    record.manualProgress = action.type === 'progress' ? payload.manualProgress
      : existing.progressMode === 'task_based' && record.progressMode === 'manual' ? existing.progress : existing.manualProgress
  }
  const next = { ...data, [collection]: existing ? data[collection].map((item) => item._id === id ? record : item) : [...data[collection], record] }
  // Recalculate both old and new linked goals after a task is moved or updated.
  return recalculateGoals(next)
}
