/**
 * Shared page title/description and optional actions such as Add task.
 * Wrapping layout keeps long headings and action buttons usable on narrow screens.
 */
export default function PageHeading({ title, description, children }) {
  return <div className="mb-8 flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-3xl font-medium tracking-tight">{title}</h1><p className="mt-2 text-os-muted">{description}</p></div>{children}</div>
}
