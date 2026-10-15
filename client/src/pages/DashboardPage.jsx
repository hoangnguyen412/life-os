/**
 * Dashboard derives summary metrics and short task/goal lists from shared data.
 * It has no separate data copy: edits made on another page appear here too.
 */
import { Link } from 'react-router'
import useMockData from '../hooks/useMockData.js'
import useResourceDialog from '../hooks/useResourceDialog.js'
import { dashboardSummary } from '../mocks/mockStore.js'
import { formatDate } from '../utils/dates.js'
import PageHeading from '../components/workspace/PageHeading.jsx'
import TaskRows from '../components/workspace/TaskRows.jsx'
import GoalCard from '../components/workspace/GoalCard.jsx'
import EmptyState from '../components/workspace/EmptyState.jsx'
import PreviewState from '../components/workspace/PreviewState.jsx'
import ResourceDialog from '../components/workspace/ResourceDialog.jsx'

export default function DashboardPage() {
  const store = useMockData()
  const modal = useResourceDialog()
  // The helper centralizes counting rules, including overdue tasks and active goals.
  const summary = dashboardSummary(store, new Date().toISOString())
  const metrics = [['Total tasks', summary.totalTasks], ['Completed tasks', summary.completedTasks], ['Overdue tasks', summary.overdueTasks], ['Average active goal progress', `${summary.avgGoalProgress}%`]]
  // Show the first three unfinished tasks and all active goals, not a second task store.
  const pending = store.tasks.filter((task) => task.status !== 'done').slice(0, 3)
  const active = store.goals.filter((goal) => goal.status === 'active')
  // Render preview feedback first, then metrics, task rows and reusable goal cards.
  // ResourceDialog allows editing the same records without leaving Dashboard.
  return <>
    <PageHeading title="Overview" description={`${formatDate(new Date().toISOString())} · A clear view of your day.`}><button className="os-button os-button-primary" onClick={() => modal.open('task', 'create')}>+ Add task</button></PageHeading>
    {store.viewState !== 'normal' ? <PreviewState /> : <>
      <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{metrics.map(([label, value], index) => <div key={label} className="os-card"><p className="text-xs text-os-muted">{label}</p><p className={`mt-3 text-3xl font-medium ${index === 2 && value > 0 ? 'text-red-700' : 'text-os-primary'}`}>{value}</p></div>)}</div>
      <div className="grid gap-6 xl:grid-cols-[1.15fr_1fr]">
        <section className="os-card"><div className="mb-6 flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-medium">Tasks to work on</h2><Link to="/tasks" className="text-sm font-medium text-os-primary underline underline-offset-4">View all</Link></div>{pending.length ? <TaskRows tasks={pending} onView={(id) => modal.open('task', 'detail', id)} /> : <EmptyState icon="tasks" title="No tasks to work on" description="Create a task to plan your next step."><button className="os-button" onClick={() => modal.open('task', 'create')}>+ Add task</button></EmptyState>}</section>
        <section><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-medium">Active goals</h2><Link to="/goals" className="text-sm font-medium text-os-primary underline underline-offset-4">View goals</Link></div><div className="grid gap-4">{active.length ? active.map((goal) => <GoalCard key={goal._id} goal={goal} onView={(id) => modal.open('goal', 'detail', id)} />) : <div className="os-card"><EmptyState icon="goals" title="No active goals" description="Create a goal to track your progress."><button className="os-button" onClick={() => modal.open('goal', 'create')}>+ Add goal</button></EmptyState></div>}</div></section>
      </div>
    </>}
    <ResourceDialog dialog={modal.dialog} onClose={modal.close} onChangeMode={modal.setMode} />
  </>
}
