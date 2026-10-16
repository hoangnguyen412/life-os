/**
 * Reusable task presentation: compact Dashboard rows or a two-column Tasks card grid.
 * Both layouts share the title, linked goal, due date, status and priority rules.
 * onView delegates opening details to the parent; this component does not mutate tasks.
 */
import useMockData from '../../hooks/useMockData.js'
import { formatDate } from '../../utils/dates.js'
import { isOverdue } from '../../mocks/mockStore.js'

// Keep backend status codes in data and translate them only for display.
const STATUS_LABELS = { todo: 'To do', in_progress: 'In progress', done: 'Completed' }

export default function TaskRows({ tasks, onView, layout = 'list' }) {
  const { goals } = useMockData()
  const isGrid = layout === 'grid'

  // The Tasks region controls columns using its available width, including in narrow previews.
  // Wide lists fill four rows on the left first; small screens keep a single reading column.
  return <div className={isGrid ? 'task-card-grid' : 'divide-y divide-os-line'}>
    {tasks.map((task) => <article key={task._id} className={isGrid ? 'flex min-w-0 flex-col rounded-xl border border-os-line bg-os-bg p-4 shadow-sm' : 'flex flex-wrap items-center justify-between gap-4 py-5 first:pt-0 last:pb-0'}>
      <div className={isGrid ? 'min-w-0 flex-1' : 'min-w-0 flex-1 basis-48'}>
        <p className="font-medium break-words">{task.title}</p>
        <p className="mt-1 text-xs break-words text-os-muted">{goals.find((goal) => goal._id === task.goalId)?.title ?? 'No linked goal'} · Due {formatDate(task.dueDate)}</p>
        {!isGrid && isOverdue(task) && <span className="mt-2 inline-block rounded-full bg-red-50 px-2 py-1 text-xs text-red-700">Overdue</span>}
      </div>
      <div className={isGrid ? 'mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-os-line pt-3' : 'contents'}>
        <div className={isGrid ? 'flex min-w-0 flex-1 flex-wrap items-center gap-2 text-xs' : 'text-xs'}>
          <span className={`inline-block rounded-full px-2.5 py-1 ${task.status === 'done' ? 'bg-os-primary-soft text-os-primary' : task.status === 'in_progress' ? 'bg-amber-50 text-amber-800' : 'bg-os-soft text-os-muted'}`}>{STATUS_LABELS[task.status]}</span>
          {isGrid && isOverdue(task) && <span className="inline-block rounded-full bg-red-50 px-2 py-1 text-xs text-red-700">Overdue</span>}
          <p className={isGrid ? 'text-os-muted' : 'mt-2 text-os-muted'}>Priority: <span className={task.priority === 'high' ? 'text-red-700' : ''}>{task.priority[0].toUpperCase() + task.priority.slice(1)}</span></p>
        </div>
        <button className="os-button" aria-label={`View task ${task.title}`} onClick={() => onView(task._id)}>View</button>
      </div>
    </article>)}
  </div>
}
