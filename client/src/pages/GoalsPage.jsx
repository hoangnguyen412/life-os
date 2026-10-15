/**
 * Goal collection page: render shared goals as cards and open resource dialogs.
 * Progress is calculated by the store, not independently by each card or page.
 */
import useMockData from '../hooks/useMockData.js'
import useResourceDialog from '../hooks/useResourceDialog.js'
import PageHeading from '../components/workspace/PageHeading.jsx'
import GoalCard from '../components/workspace/GoalCard.jsx'
import PreviewState from '../components/workspace/PreviewState.jsx'
import EmptyState from '../components/workspace/EmptyState.jsx'
import ResourceDialog from '../components/workspace/ResourceDialog.jsx'

export default function GoalsPage() {
  const store = useMockData()
  // One local dialog controller handles all goal cards and the Add goal action.
  const modal = useResourceDialog()
  return <><PageHeading title="Goals" description="Manage your goals and track progress."><button className="os-button os-button-primary" onClick={() => modal.open('goal', 'create')}>+ Add goal</button></PageHeading>
    {store.viewState !== 'normal' ? <PreviewState /> : store.goals.length ? <div className="grid gap-6 xl:grid-cols-2">{store.goals.map((goal) => <GoalCard key={goal._id} goal={goal} onView={(id) => modal.open('goal', 'detail', id)} />)}</div> : <div className="os-card"><EmptyState icon="goals" title="No goals yet" description="Create your first goal to get started."><button className="os-button os-button-primary" onClick={() => modal.open('goal', 'create')}>+ Add goal</button></EmptyState></div>}
    <ResourceDialog dialog={modal.dialog} onClose={modal.close} onChangeMode={modal.setMode} />
  </>
}
