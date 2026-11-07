/** Server summary and real Task/Goal previews. Existing dialogs handle all writes. */
import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { getDashboardSummary } from '../services/dashboardApi.js'
import { listTasks } from '../services/taskApi.js'
import { listAllGoals } from '../services/goalApi.js'
import { formatTaskDate } from '../utils/taskForm.js'
import PageHeading from '../components/workspace/PageHeading.jsx'
import TaskRows from '../components/workspace/TaskRows.jsx'
import GoalCard from '../components/workspace/GoalCard.jsx'
import EmptyState from '../components/workspace/EmptyState.jsx'
import TaskDialog from '../components/tasks/TaskDialog.jsx'
import GoalDialog from '../components/goals/GoalDialog.jsx'

export default function DashboardPage() {
  const [reload, setReload] = useState(0)
  const [dialog, setDialog] = useState(null)
  const [notice, setNotice] = useState('')
  const [data, setData] = useState({ reload: -1, summary: null, tasks: [], goals: [], error: '' })
  const loading = data.reload !== reload

  useEffect(() => {
    let active = true
    const controller = new AbortController()
    const options = { signal: controller.signal }

    async function load() {
      try {
        // The API accepts one status per request. Fetch three from each unfinished status.
        const [result, todo, inProgress, goals] = await Promise.all([
          getDashboardSummary(options),
          listTasks({ status: 'todo', sort: 'createdAt_desc', page: 1, limit: 3 }, options),
          listTasks({ status: 'in_progress', sort: 'createdAt_desc', page: 1, limit: 3 }, options),
          listAllGoals(options),
        ])
        if (!active) return
        // Keep the three newest unfinished tasks across both statuses.
        const tasks = [...todo.data, ...inProgress.data]
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b._id.localeCompare(a._id))
          .slice(0, 3)
        setData({ reload, summary: result.data, tasks, goals, error: '' })
      } catch (failure) {
        if (active) setData((current) => ({ ...current, reload, error: failure.message || 'Could not load your dashboard.' }))
      }
    }

    void load()
    return () => { active = false; controller.abort() }
  }, [reload])

  function open(kind, mode, id) { setDialog({ kind, mode, id }) }
  function close() { setDialog(null) }
  function saved(message) {
    setNotice(message)
    // Refresh totals and cards after a Task or Goal mutation succeeds.
    setReload((value) => value + 1)
  }

  const summary = data.summary
  const metrics = summary ? [
    ['Total tasks', summary.totalTasks],
    ['Completed tasks', summary.completedTasks],
    ['Overdue tasks', summary.overdueTasks],
    ['Average active goal progress', `${summary.avgGoalProgress}%`],
  ] : []
  const activeGoals = data.goals.filter((goal) => goal.status === 'active')

  return <>
    <PageHeading title="Overview" description={`${formatTaskDate(new Date().toISOString())} · A clear view of your day.`}>
      <button className="os-button" disabled={loading} onClick={() => { setNotice(''); setReload((value) => value + 1) }}>Refresh</button>
      <button className="os-button os-button-primary" disabled={loading || Boolean(data.error)} onClick={() => open('task', 'create')}>+ Add task</button>
    </PageHeading>
    {notice && <p role="status" className="mb-5 text-sm text-os-primary">{notice}</p>}
    {loading ? <div className="os-card py-12 text-center" role="status">Loading dashboard…</div>
      : data.error ? <div className="os-card">
        <p role="alert" className="text-red-700">{data.error}</p>
        <button className="os-button mt-4" onClick={() => setReload((value) => value + 1)}>Try again</button>
      </div>
        : <>
          <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {metrics.map(([label, value], index) => <div key={label} className="os-card">
              <p className="text-xs text-os-muted">{label}</p>
              <p className={`mt-3 text-3xl font-medium ${index === 2 && value > 0 ? 'text-red-700' : 'text-os-primary'}`}>{value}</p>
            </div>)}
          </div>
          <div className="grid gap-6 xl:grid-cols-[1.15fr_1fr]">
            <section className="os-card">
              <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-medium">Tasks to work on</h2>
                <Link to="/tasks" className="text-sm font-medium text-os-primary underline underline-offset-4">View all</Link>
              </div>
              <p className="mb-4 text-xs text-os-muted">Your three newest unfinished tasks.</p>
              {data.tasks.length
                ? <TaskRows tasks={data.tasks} goals={data.goals} formatDueDate={formatTaskDate} onView={(id) => open('task', 'detail', id)} />
                : <EmptyState icon="tasks" title="No tasks to work on" description="Create a task to plan your next step.">
                  <button className="os-button" onClick={() => open('task', 'create')}>+ Add task</button>
                </EmptyState>}
            </section>
            <section>
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-medium">Active goals</h2>
                <Link to="/goals" className="text-sm font-medium text-os-primary underline underline-offset-4">View goals</Link>
              </div>
              <div className="grid gap-4">
                {activeGoals.length ? activeGoals.map((goal) => <GoalCard key={goal._id} goal={goal} formatDeadline={formatTaskDate} onView={(id) => open('goal', 'detail', id)} />)
                  : <div className="os-card"><EmptyState icon="goals" title="No active goals" description="Create a goal to track your progress.">
                    <button className="os-button" onClick={() => open('goal', 'create')}>+ Add goal</button>
                  </EmptyState></div>}
              </div>
            </section>
          </div>
        </>}
    {dialog?.kind === 'task' && <TaskDialog key={dialog.id || 'create-task'} dialog={dialog} goals={data.goals} onClose={close} onSaved={saved} />}
    {dialog?.kind === 'goal' && <GoalDialog key={dialog.id || 'create-goal'} dialog={dialog} onClose={close} onSaved={saved} />}
  </>
}
