/**
 * Task list with URL-based filters, sorting and eight records per page.
 * Desktop reads down four cards in the left column, then four in the right.
 * ResourceDialog handles create/detail/edit/delete using the shared mock store.
 */
import { useSearchParams } from 'react-router'
import useMockData from '../hooks/useMockData.js'
import useResourceDialog from '../hooks/useResourceDialog.js'
import { isOverdue, sortTasks } from '../mocks/mockStore.js'
import PageHeading from '../components/workspace/PageHeading.jsx'
import TaskRows from '../components/workspace/TaskRows.jsx'
import PreviewState from '../components/workspace/PreviewState.jsx'
import EmptyState from '../components/workspace/EmptyState.jsx'
import ResourceDialog from '../components/workspace/ResourceDialog.jsx'

const TASKS_PER_PAGE = 8

export default function TasksPage() {
  const store = useMockData()
  const modal = useResourceDialog()
  // Query parameters preserve filter choices in links, refresh and browser history.
  const [params, setParams] = useSearchParams()
  const status = params.get('status') || ''
  const goalId = params.get('goalId') || ''
  const sort = params.get('sort') || 'dueDate_asc'
  const overdue = params.get('overdue') === 'true'
  // Apply all enabled filters together; "none" means tasks without a linked goal.
  const filtered = sortTasks(store.tasks.filter((task) => (!status || task.status === status) && (!goalId || (goalId === 'none' ? !task.goalId : task.goalId === goalId)) && (!overdue || isOverdue(task))), sort)
  const pages = Math.ceil(filtered.length / TASKS_PER_PAGE)
  // Clamp the displayed page when filters or deletions reduce the available pages.
  const page = Math.min(Math.max(1, Math.floor(Number(params.get('page')) || 1)), Math.max(1, pages))
  // Copy search parameters instead of mutating the router's object in place.
  function filter(name, value) {
    const next = new URLSearchParams(params)
    if (value) next.set(name, value); else next.delete(name)
    // A new filter starts at page one; pagination preserves the current filters.
    if (name !== 'page') next.delete('page')
    setParams(next)
  }
  // Prefill the goal only if the current goal filter still references a real record.
  function add() { modal.open('task', 'create', null, { goalId: store.goals.some((goal) => goal._id === goalId) ? goalId : '' }) }
  // The list slices filtered results; empty feedback distinguishes no data from no matches.
  return <>
    <PageHeading title="Tasks" description="Manage tasks and track their status."><button className="os-button os-button-primary" onClick={add}>+ Add task</button></PageHeading>
    {store.viewState !== 'normal' ? <PreviewState /> : <>
      <div className="os-card mb-6"><div className="grid gap-4 sm:grid-cols-3"><label>Status<select className="os-input" value={status} onChange={(event) => filter('status', event.target.value)}><option value="">All statuses</option><option value="todo">To do</option><option value="in_progress">In progress</option><option value="done">Completed</option></select></label><label>Goal<select className="os-input" value={goalId} onChange={(event) => filter('goalId', event.target.value)}><option value="">All goals</option><option value="none">No linked goal</option>{store.goals.map((goal) => <option key={goal._id} value={goal._id}>{goal.title}</option>)}</select></label><label>Sort by<select className="os-input" value={sort} onChange={(event) => filter('sort', event.target.value)}><option value="dueDate_asc">Due date</option><option value="priority_desc">Priority</option><option value="createdAt_desc">Newest</option></select></label></div><div className="mt-5 flex flex-wrap items-center justify-between gap-3"><label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={overdue} onChange={(event) => filter('overdue', event.target.checked ? 'true' : '')} className="size-4 accent-os-primary" />Overdue tasks only</label><button className="text-sm text-os-primary underline underline-offset-4" onClick={() => setParams({})}>Clear filters</button></div></div>
      <section className="task-list-container" aria-label="Task list">{filtered.length ? <TaskRows layout="grid" tasks={filtered.slice((page - 1) * TASKS_PER_PAGE, page * TASKS_PER_PAGE)} onView={(id) => modal.open('task', 'detail', id)} /> : <div className="os-card"><EmptyState icon="tasks" title={store.tasks.length ? 'No matching tasks' : 'No tasks yet'} description={store.tasks.length ? 'Change filters or add a new task.' : 'Create your first task to get started.'}><button className="os-button os-button-primary" onClick={add}>+ Add task</button></EmptyState></div>}</section>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-os-muted">{filtered.length} tasks{pages > 0 ? ` · Page ${page} of ${pages}` : ''}</p><div className="flex gap-2"><button className="os-button" disabled={page <= 1} onClick={() => filter('page', String(page - 1))}>← Previous</button><button className="os-button" disabled={page >= pages} onClick={() => filter('page', String(page + 1))}>Next →</button></div></div>
    </>}
    <ResourceDialog dialog={modal.dialog} onClose={modal.close} onChangeMode={modal.setMode} />
  </>
}
