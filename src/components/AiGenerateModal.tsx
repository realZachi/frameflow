import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { Sparkles, Upload, X } from './icons'
import type { AiEditorController } from '../ai/controller'
import { runAiGeneration, type AiRunEvent, type AiToolActivity } from '../ai/runner'
import { fileToDataUrl, uid } from '../utils'

type ScreenshotDraft = { id: string; file: File; name: string; dataUrl: string }
type LogEntry = { kind: 'status' | 'tool'; text: string }
type RunPhase = 'idle' | 'running' | 'done' | 'error'

export type AiGenerateModalProps = {
  open: boolean
  onClose: () => void
  controller: AiEditorController
  onPrepareRun: (files: Array<{ name: string; dataUrl: string }>) => Array<{ assetId: string; name: string; dataUrl: string }>
  onFinished: (slidesCreated: number) => void
  onActivity?: (activity: AiToolActivity | null) => void
}

export const AiGenerateModal = ({ open, onClose, controller, onPrepareRun, onFinished, onActivity }: AiGenerateModalProps) => {
  const [description, setDescription] = useState('')
  const [screenshots, setScreenshots] = useState<ScreenshotDraft[]>([])
  const [phase, setPhase] = useState<RunPhase>('idle')
  const [log, setLog] = useState<LogEntry[]>([])
  const [assistantText, setAssistantText] = useState('')
  const [reasoningTail, setReasoningTail] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [doneInfo, setDoneInfo] = useState<{ summary: string; slidesCreated: number } | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const logRef = useRef<HTMLDivElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const cancelledRef = useRef(false)

  useEffect(() => {
    // Scroll only the log container itself — scrollIntoView would cancel the canvas
    // stage's smooth follow-scroll while the AI is working.
    const node = logRef.current
    if (node) node.scrollTop = node.scrollHeight
  }, [log, assistantText])

  const requestClose = () => {
    if (phase === 'running') return
    setPhase('idle')
    onClose()
  }

  useEffect(() => {
    if (!open) return
    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') requestClose()
    }
    window.addEventListener('keydown', handleKeydown)
    return () => window.removeEventListener('keydown', handleKeydown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, phase])

  if (!open) return null

  const canGenerate = Boolean(description.trim()) && screenshots.length > 0

  const handleFiles = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files?.length) return
    const drafts = await Promise.all(Array.from(files).map(async (file) => ({
      id: uid('shot'),
      file,
      name: file.name,
      dataUrl: await fileToDataUrl(file),
    })))
    setScreenshots((current) => [...current, ...drafts])
    event.target.value = ''
  }

  const removeScreenshot = (id: string) => setScreenshots((current) => current.filter((shot) => shot.id !== id))

  const handleEvent = (event: AiRunEvent) => {
    if (cancelledRef.current) return
    if (event.type === 'status') setLog((current) => [...current, { kind: 'status', text: event.message }])
    else if (event.type === 'tool') {
      setLog((current) => [...current, { kind: 'tool', text: `${event.name} — ${event.detail}` }])
      setReasoningTail('')
    } else if (event.type === 'text') {
      setAssistantText((current) => current + event.delta)
      setReasoningTail('')
    } else if (event.type === 'reasoning') {
      setReasoningTail((current) => (current + event.delta).slice(-160))
    }
    else if (event.type === 'done') {
      setDoneInfo({ summary: event.summary, slidesCreated: event.slidesCreated })
      setPhase('done')
      onActivity?.(null)
      onFinished(event.slidesCreated)
    } else if (event.type === 'error') {
      setErrorMessage(event.message)
      setPhase('error')
      onActivity?.(null)
    }
  }

  const handleGenerate = async () => {
    if (!canGenerate || phase === 'running') return
    const prepared = onPrepareRun(screenshots.map((shot) => ({ name: shot.name, dataUrl: shot.dataUrl })))
    const abortController = new AbortController()
    abortControllerRef.current = abortController
    cancelledRef.current = false
    setLog([])
    setAssistantText('')
    setReasoningTail('')
    setErrorMessage(null)
    setDoneInfo(null)
    setPhase('running')
    await runAiGeneration({
      description,
      screenshots: prepared,
      controller,
      signal: abortController.signal,
      onEvent: handleEvent,
      onActivity,
    })
  }

  const handleCancel = () => {
    cancelledRef.current = true
    abortControllerRef.current?.abort()
    setPhase('idle')
    onActivity?.(null)
  }

  const handleRetry = () => {
    setErrorMessage(null)
    setPhase('idle')
  }

  return (
    <div
      className={`ai-modal-overlay${phase !== 'idle' ? ' ai-modal-overlay--live' : ''}`}
      onMouseDown={(event) => { if (event.target === event.currentTarget) requestClose() }}
    >
      <div className="ai-modal-card" role="dialog" aria-modal="true" aria-label="Mit AI generieren">
        <div className="ai-modal-header">
          <div className="ai-modal-title"><Sparkles size={16} /><h2>Mit AI generieren</h2></div>
          <button className="ai-modal-close" onClick={requestClose} disabled={phase === 'running'} aria-label="Schließen"><X size={16} /></button>
        </div>

        <div className="ai-modal-body">
          {phase === 'idle' && (
            <>
              <div className="ai-modal-field">
                <label htmlFor="ai-modal-description">Worum geht es in deiner App?</label>
                <textarea
                  id="ai-modal-description"
                  rows={4}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Beschreibe deine App: Zielgruppe, Kernfeatures, Tonalität …"
                />
              </div>
              <div className="ai-modal-field">
                <label>Screenshots</label>
                <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" multiple hidden onChange={handleFiles} />
                <button type="button" className="ai-modal-dropzone" onClick={() => fileInputRef.current?.click()}>
                  <Upload size={16} /><span>Screenshots auswählen</span>
                </button>
                {screenshots.length > 0 && (
                  <div className="ai-modal-thumbs">
                    {screenshots.map((shot) => (
                      <div className="ai-modal-thumb" key={shot.id}>
                        <img src={shot.dataUrl} alt={shot.name} />
                        <button type="button" onClick={() => removeScreenshot(shot.id)} aria-label={`${shot.name} entfernen`}><X size={11} /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {phase === 'running' && (
            <div className="ai-modal-run">
              <div className="ai-modal-log" ref={logRef}>
                {log.map((entry, index) => (
                  <div className={`ai-modal-log-entry ai-modal-log-entry--${entry.kind}`} key={index}>{entry.text}</div>
                ))}
                <div className="ai-modal-log-entry ai-modal-log-entry--spinner">
                  <span className="ai-modal-spinner" />
                  {reasoningTail ? `Denkt nach … ${reasoningTail}` : 'Generiere …'}
                </div>
              </div>
              {assistantText && <p className="ai-modal-assistant-text">{assistantText}</p>}
            </div>
          )}

          {phase === 'done' && doneInfo && (
            <div className="ai-modal-result ai-modal-result--done">
              <p>Fertig — {doneInfo.slidesCreated} Screens erstellt.</p>
              {(doneInfo.summary || assistantText) && <p className="ai-modal-assistant-text">{doneInfo.summary || assistantText}</p>}
            </div>
          )}

          {phase === 'error' && (
            <div className="ai-modal-result ai-modal-result--error">
              <p>{errorMessage}</p>
            </div>
          )}
        </div>

        <div className="ai-modal-footer">
          {phase === 'idle' && (
            <button className="export-button ai-modal-generate" onClick={handleGenerate} disabled={!canGenerate}>
              <Sparkles size={16} /><b>Generieren</b>
            </button>
          )}
          {phase === 'running' && (
            <button className="ai-modal-btn-secondary" onClick={handleCancel}>Abbrechen</button>
          )}
          {phase === 'done' && (
            <button className="export-button ai-modal-generate" onClick={requestClose}><b>Schließen</b></button>
          )}
          {phase === 'error' && (
            <button className="ai-modal-btn-secondary" onClick={handleRetry}>Erneut versuchen</button>
          )}
        </div>
      </div>
    </div>
  )
}
