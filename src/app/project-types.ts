export type SaveStatus = 'loading' | 'dirty' | 'saving' | 'saved' | 'error'

export const saveStatusLabels: Record<SaveStatus, string> = {
  loading: 'Lokales Projekt wird geladen …',
  dirty: 'Noch nicht gespeichert',
  saving: 'Wird lokal gespeichert …',
  saved: 'Lokal gespeichert',
  error: 'Speichern fehlgeschlagen',
}
