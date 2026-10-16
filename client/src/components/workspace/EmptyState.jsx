/**
 * Consistent no-data feedback with an icon, explanation and optional action children.
 * Pages supply context-specific copy for an empty list or unmatched filters.
 */
import Icon from '../Icon.jsx'

export default function EmptyState({ title, description, icon, children }) {
  return <div className="flex flex-col items-center px-5 py-10 text-center"><span className="mb-4 rounded-xl bg-os-primary-soft p-3 text-os-primary"><Icon name={icon} /></span><h2 className="text-lg font-medium">{title}</h2><p className="mt-2 mb-5 max-w-sm text-sm text-os-muted">{description}</p>{children}</div>
}
