/**
 * Local dialog controller shared by resource pages.
 * kind selects task/goal/event, mode selects create/detail/edit/delete,
 * id identifies an existing record, and defaults prefill a new record.
 */
import { useState } from 'react'

export default function useResourceDialog() {
  // null means closed; changing mode preserves the selected resource and its defaults.
  const [dialog, setDialog] = useState(null)
  return {
    dialog,
    open: (kind, mode = 'detail', id = null, defaults = {}) => setDialog({ kind, mode, id, defaults }),
    close: () => setDialog(null),
    setMode: (mode) => setDialog((current) => ({ ...current, mode })),
  }
}
