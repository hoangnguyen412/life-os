/**
 * Native dialog shell shared by all resources.
 * showModal provides modal focus handling; Escape closes through the parent callback.
 * The title and children let the same shell display details, forms or confirmation.
 */
import { useEffect, useRef } from 'react'
import Icon from '../Icon.jsx'

export default function Modal({ title, onClose, children }) {
  const ref = useRef(null)
  // Open after mounting; cleanup also supports StrictMode's extra development checks.
  useEffect(() => {
    const dialog = ref.current
    dialog.showModal()
    return () => dialog.close()
  }, [])
  return <dialog ref={ref} aria-labelledby="resource-dialog-title" onCancel={(event) => { event.preventDefault(); onClose() }} className="m-auto max-h-[calc(100dvh-32px)] w-[calc(100%-32px)] max-w-2xl overflow-y-auto rounded-2xl border border-os-line bg-os-bg p-0 text-os-ink shadow-xl backdrop:bg-os-ink/40">
    <div className="flex items-start justify-between gap-4 border-b border-os-line px-6 py-5"><h2 id="resource-dialog-title" className="pt-2 text-xl font-medium break-words">{title}</h2><button type="button" className="os-button shrink-0 px-3" aria-label="Close dialog" onClick={onClose}><Icon name="close" /></button></div><div className="p-6">{children}</div>
  </dialog>
}
