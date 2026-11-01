/**
 * Tasks use the backend for records, filtering and pagination.
 * Local state only holds the current response, dialog and feedback.
 */
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'
import { listTasks } from '../services/taskApi.js'
import { listAllGoals } from '../services/goalApi.js'
import { formatTaskDate } from '../utils/taskForm.js'
import PageHeading from '../components/workspace/PageHeading.jsx'
import TaskRows from '../components/workspace/TaskRows.jsx'
import EmptyState from '../components/workspace/EmptyState.jsx'
import TaskDialog from '../components/tasks/TaskDialog.jsx'

const TASKS_PER_PAGE = 8

function pageNumber(params) {
  const page = Number(params.get('page') || 1)
  return Number.isInteger(page) && page > 0 ? page : 1
}

export default function TasksPage() {
  const [params, setParams] = useSearchParams()
  const [reload, setReload] = useState(0)
  const [dialog, setDialog] = useState(null)
  const [notice, setNotice] = useState('')
  const [data, setData] = useState({ requestKey: '', tasks: [], goals: [], pagination: { total: 0, totalPages: 0 }, error: '' })
  const queryKey = params.toString()
  const requestKey = queryKey + '|' + reload
  // Show loading until the response matches the latest filters and reload count.
  const loading = data.requestKey !== requestKey
  const status = params.get('status') || ''
  const goalId = params.get('goalId') || ''
  const sort = params.get('sort') || 'dueDate_asc'
  const overdue = params.get('overdue') === 'true'
  const page = pageNumber(params)

  useEffect(() => {
    let active = true
    const controller = new AbortController()
    const query = new URLSearchParams(queryKey)
    const requestedPage = pageNumber(query)

    async function load() {
      try {
        const [result, goals] = await Promise.all([
          listTasks({
            status: query.get('status') || undefined,
            goalId: query.get('goalId') || undefined,
            overdue: query.get('overdue') === 'true' ? true : undefined,
            sort: query.get('sort') || 'dueDate_asc', page: requestedPage, limit: TASKS_PER_PAGE,
          }, { signal: controller.signal }),
          listAllGoals({ signal: controller.signal }),
        ])
        if (!active) return
        // Deleting the final record on a page can reduce the number of pages.
        const lastPage = Math.max(1, result.pagination.totalPages)
        if (requestedPage > lastPage) {
          query.set('page', String(lastPage))
          setParams(query, { replace: true })
          return
        }
        setData({ requestKey, tasks: result.data, goals, pagination: result.pagination, error: '' })
      } catch (error) {
        if (active) setData((current) => ({ ...current, requestKey, error: error.message || 'Could not load your tasks.' }))
      }
    }
    void load()
    // Ignore obsolete responses when filters change or the page unmounts.
    return () => { active = false; controller.abort() }
  }, [queryKey, requestKey, setParams])

  function filter(name, value) {
    const next = new URLSearchParams(params)
    if (value) next.set(name, value)
    else next.delete(name)
    if (name !== 'page') next.delete('page')
    setNotice('')
    setParams(next)
  }

  function add() {
    setDialog({ mode: 'create', defaults: {
      status: ['todo', 'in_progress', 'done'].includes(status) ? status : 'todo',
      goalId: data.goals.some((goal) => goal._id === goalId) ? goalId : '',
    } })
  }

  function saved(message) {
    setNotice(message)
    // Reload the server's current list, totals and linked Goal values after a write.
    setReload((current) => current + 1)
  }

  const filtered = Boolean(status || goalId || overdue)
  return <>
    <PageHeading title="Tasks" description="Manage the tasks saved to your account.">
      <button className="os-button os-button-primary" disabled={loading || Boolean(data.error)} onClick={add}>+ Add task</button>
    </PageHeading>
    {notice && <p role="status" className="mb-5 text-sm text-os-primary">{notice}</p>}

    <div className="os-card mb-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <label>Status<select className="os-input" value={status} onChange={(event) => filter('status', event.target.value)}><option value="">All statuses</option><option value="todo">To do</option><option value="in_progress">In progress</option><option value="done">Completed</option></select></label>
        <label>Goal<select className="os-input" value={goalId} disabled={loading || Boolean(data.error)} onChange={(event) => filter('goalId', event.target.value)}><option value="">All goals</option><option value="none">No linked goal</option>{goalId && goalId !== 'none' && !data.goals.some((goal) => goal._id === goalId) && <option value={goalId}>Selected goal unavailable</option>}{data.goals.map((goal) => <option key={goal._id} value={goal._id}>{goal.title}</option>)}</select></label>
        <label>Sort by<select className="os-input" value={sort} onChange={(event) => filter('sort', event.target.value)}><option value="dueDate_asc">Due date</option><option value="priority_desc">Priority</option><option value="createdAt_desc">Newest</option></select></label>
      </div>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={overdue} onChange={(event) => filter('overdue', event.target.checked ? 'true' : '')} className="size-4 accent-os-primary" />Overdue tasks only</label>
        <button className="text-sm text-os-primary underline underline-offset-4" onClick={() => { setNotice(''); setParams({}) }}>Clear filters</button>
      </div>
    </div>

    <section className="task-list-container" aria-label="Task list" aria-busy={loading}>
      {loading ? <div className="os-card py-12 text-center" role="status">Loading tasks…</div>
        : data.error ? <div className="os-card"><p role="alert" className="text-red-700">{data.error}</p><button className="os-button mt-4" onClick={() => setReload((current) => current + 1)}>Try again</button></div>
          : data.tasks.length ? <TaskRows layout="grid" tasks={data.tasks} goals={data.goals} formatDueDate={formatTaskDate} onView={(id) => setDialog({ mode: 'detail', id })} />
            : <div className="os-card"><EmptyState icon="tasks" title={filtered ? 'No matching tasks' : 'No tasks yet'} description={filtered ? 'Change filters or add a new task.' : 'Create your first task to get started.'}><button className="os-button os-button-primary" onClick={add}>+ Add task</button></EmptyState></div>}
    </section>

    {!loading && !data.error && <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
      <p className="text-xs text-os-muted">{data.pagination.total} tasks{data.pagination.totalPages > 0 ? ' · Page ' + page + ' of ' + data.pagination.totalPages : ''}</p>
      <div className="flex gap-2"><button className="os-button" disabled={page <= 1} onClick={() => filter('page', String(page - 1))}>← Previous</button><button className="os-button" disabled={page >= data.pagination.totalPages} onClick={() => filter('page', String(page + 1))}>Next →</button></div>
    </div>}
    {dialog && <TaskDialog key={dialog.id || 'create'} dialog={dialog} goals={data.goals} onClose={() => setDialog(null)} onSaved={saved} />}
  </>
}
