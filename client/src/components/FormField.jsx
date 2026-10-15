/**
 * Reusable auth input with a label, optional hint, inline error and accessory button.
 * Remaining props carry the input type, value and change handler from AuthForm.
 */
export default function FormField({ name, label, error, hint, children, ...inputProps }) {
  const id = `auth-${name}`
  const showHint = Boolean(hint && !error)
  // ARIA references connect screen-reader feedback to the input; errors replace hints.
  const descriptionIds = [showHint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ')

  // An accessory such as Show/Hide occupies the right side, so the input reserves padding.
  return (
    <div>
      <label htmlFor={id} className="mb-2 block">{label}</label>
      <div className="relative">
        <input
          {...inputProps}
          id={id}
          name={name}
          required
          aria-invalid={Boolean(error)}
          aria-describedby={descriptionIds || undefined}
          className={`min-h-11 w-full rounded-lg border bg-os-bg px-3 py-3 text-base text-os-ink placeholder:text-os-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-os-primary sm:text-sm ${error ? 'border-red-700' : 'border-os-line'} ${children ? 'pr-18' : ''}`}
        />
        {children}
      </div>
      {showHint && <p id={`${id}-hint`} className="mt-2 text-xs text-os-muted">{hint}</p>}
      {error && <p id={`${id}-error`} role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
    </div>
  )
}
