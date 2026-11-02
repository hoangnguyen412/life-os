/** Goals use server records and progress; local state holds the current page and dialog. */
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'
import { listGoals } from '../services/goalApi.js'
import { formatTaskDate } from '../utils/taskForm.js'
import PageHeading from '../components/workspace/PageHeading.jsx'
import GoalCard from '../components/workspace/GoalCard.jsx'
import EmptyState from '../components/workspace/EmptyState.jsx'
import GoalDialog from '../components/goals/GoalDialog.jsx'

const GOALS_PER_PAGE = 8

export default function GoalsPage() {
  const [params, setParams] = useSearchParams()
  const requested = Number(params.get('page') || 1)
  const page = Number.isInteger(requested) && requested > 0 ? requested : 1
  const [reload, setReload] = useState(0)
  const [dialog, setDialog] = useState(null)
  const [notice, setNotice] = useState('')
  const [data, setData] = useState({ key: '', goals: [], pagination: { total: 0, totalPages: 0 }, error: '' })
  const requestKey = `${page}|${reload}`
  const loading = data.key !== requestKey

  useEffect(() => {
    let active = true
    const controller = new AbortController()
    listGoals({ page, limit: GOALS_PER_PAGE }, { signal: controller.signal }).then((result) => {
      if (!active) return
      const last = Math.max(1, result.pagination.totalPages)
      if (page > last) { setParams(last === 1 ? {} : { page: String(last) }, { replace: true }); return }
      setData({ key: requestKey, goals: result.data, pagination: result.pagination, error: '' })
    }).catch((failure) => {
      if (active) setData((current) => ({ ...current, key: requestKey, error: failure.message || 'Could not load your goals.' }))
    })
    return () => { active = false; controller.abort() }
  }, [page, requestKey, setParams])

  function add() { setDialog({ mode: 'create' }) }
  function saved(message) { setNotice(message); setReload((value) => value + 1) }
  function goTo(next) { setNotice(''); setParams(next === 1 ? {} : { page: String(next) }) }

  return <>
    <PageHeading title="Goals" description="Manage your saved goals and track progress."><button className="os-button os-button-primary" disabled={loading || Boolean(data.error)} onClick={add}>+ Add goal</button></PageHeading>
    {notice && <p role="status" className="mb-5 text-sm text-os-primary">{notice}</p>}
    <section aria-label="Goal list" aria-busy={loading}>
      {loading ? <div className="os-card py-12 text-center" role="status">Loading goals…</div>
        : data.error ? <div className="os-card"><p role="alert" className="text-red-700">{data.error}</p><button className="os-button mt-4" onClick={() => setReload((value) => value + 1)}>Try again</button></div>
          : data.goals.length ? <div className="grid gap-6 xl:grid-cols-2">{data.goals.map((goal) => <GoalCard key={goal._id} goal={goal} formatDeadline={formatTaskDate} onView={(id) => setDialog({ mode: 'detail', id })} />)}</div>
            : <div className="os-card"><EmptyState icon="goals" title="No goals yet" description="Create your first goal to get started."><button className="os-button os-button-primary" onClick={add}>+ Add goal</button></EmptyState></div>}
    </section>
    {!loading && !data.error && <div className="mt-5 flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-os-muted">{data.pagination.total} goals{data.pagination.totalPages > 0 ? ` · Page ${page} of ${data.pagination.totalPages}` : ''}</p><div className="flex gap-2"><button className="os-button" disabled={page <= 1} onClick={() => goTo(page - 1)}>← Previous</button><button className="os-button" disabled={page >= data.pagination.totalPages} onClick={() => goTo(page + 1)}>Next →</button></div></div>}
    {dialog && <GoalDialog key={dialog.id || 'create'} dialog={dialog} onClose={() => setDialog(null)} onSaved={saved} />}
  </>
}
