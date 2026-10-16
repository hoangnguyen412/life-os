/**
 * Present a goal's status, deadline, progress percentage and progress mode.
 * The store supplies progress; ARIA exposes the same number as the visual progress bar.
 * onView passes the goal id back to the parent page's dialog controller.
 */
import { formatDate } from '../../utils/dates.js'

export default function GoalCard({ goal, onView }) {
  return <article className="os-card flex flex-col"><div className="mb-4 flex flex-wrap items-start justify-between gap-3"><h2 className="min-w-0 flex-1 text-lg font-medium break-words">{goal.title}</h2><span className="rounded-full bg-os-primary-soft px-2.5 py-1 text-xs text-os-primary">{goal.status === 'completed' ? 'Completed' : 'Active'}</span></div><p className="text-xs text-os-muted">Deadline {formatDate(goal.deadline)}</p><div className="mt-6 flex justify-between text-sm"><span>Progress</span><strong className="font-medium text-os-primary">{goal.progress}%</strong></div><div role="progressbar" aria-label={goal.title} aria-valuenow={goal.progress} aria-valuemin={0} aria-valuemax={100} className="mt-3 h-2 overflow-hidden rounded-full bg-os-soft"><div className="h-full rounded-full bg-os-primary" style={{ width: `${goal.progress}%` }} /></div><p className="mt-3 mb-6 text-xs text-os-muted">{goal.progressMode === 'manual' ? 'Manual progress' : 'Calculated from completed tasks'}</p><button className="os-button mt-auto self-start" aria-label={`View goal ${goal.title}`} onClick={() => onView(goal._id)}>View goal</button></article>
}
