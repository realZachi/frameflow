export type SaveStatus = 'loading' | 'dirty' | 'saving' | 'saved' | 'error'

export const saveStatusLabels: Record<SaveStatus, string> = {
  loading: 'Loading local project …',
  dirty: 'Unsaved',
  saving: 'Saving locally …',
  saved: 'Saved locally',
  error: 'Couldn’t save',
}
