export function isOverdue(task, now = new Date().toISOString()) {
  return Boolean(task.dueDate && task.status !== 'done' && task.dueDate < now)
}

const priorityOrder = { high: 0, medium: 1, low: 2 }

export function sortTasks(tasks, sort) {
  return [...tasks].sort((a, b) => {
    if (sort === 'priority_desc' && priorityOrder[a.priority] !== priorityOrder[b.priority]) return priorityOrder[a.priority] - priorityOrder[b.priority]
    if (sort === 'createdAt_desc') return b.createdAt.localeCompare(a.createdAt) || b._id.localeCompare(a._id)
    const dateOrder = (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999')
    if (dateOrder) return dateOrder
    if (priorityOrder[a.priority] !== priorityOrder[b.priority]) return priorityOrder[a.priority] - priorityOrder[b.priority]
    return b.createdAt.localeCompare(a.createdAt) || b._id.localeCompare(a._id)
  })
}
