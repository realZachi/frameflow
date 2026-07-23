import { useEffect, useRef, useState, type ChangeEvent, type RefObject } from 'react'
import {
  getDefaultAiModel,
  type AiModelSelection,
  type AiProviderId,
} from '../ai/provider-catalog'
import {
  AI_PROVIDER_AVAILABILITY,
  INITIAL_AI_SELECTION,
} from '../ai/provider-config'
import { runAiGeneration, type AiRunEvent, type AiToolActivity } from '../ai/runner'
import { fileToDataUrl, uid } from '../utils'
import { AiProviderControls } from './AiProviderControls'
import { Sparkles, Upload, X } from './icons'
import type { AiEditorController } from '../ai/controller'

type ScreenshotDraft = { id: string; file: File; name: string; dataUrl: string }
type LogEntry = { kind: 'status' | 'tool'; text: string }
type RunPhase = 'idle' | 'running' | 'done' | 'error'

export type AiGenerateModalProps = {
  open: boolean
  onClose: () => void
  controller: AiEditorController
  targetSlide?: { id: string; name: string }
  onPrepareRun: (files: { name: string; dataUrl: string }[]) => { assetId: string; name: string; dataUrl: string }[]
  onFinished: (slidesCreated: number) => void
  onActivity?: (activity: AiToolActivity | null) => void
}

type IdleContentProps = {
  isEditMode: boolean
  description: string
  screenshots: ScreenshotDraft[]
  fileInputRef: RefObject<HTMLInputElement | null>
  onDescriptionChange: (description: string) => void
  onFiles: (event: ChangeEvent<HTMLInputElement>) => void
  onRemoveScreenshot: (id: string) => void
}

const IdleContent = ({
  isEditMode,
  description,
  screenshots,
  fileInputRef,
  onDescriptionChange,
  onFiles,
  onRemoveScreenshot,
}: IdleContentProps) => (
  <>
    <div className="ai-modal-field">
      <label htmlFor="ai-modal-description">
        {isEditMode ? 'What would you like to change?' : 'What is your app about?'}
      </label>
      <textarea
        id="ai-modal-description"
        rows={4}
        value={description}
        onChange={(event) => onDescriptionChange(event.target.value)}
        placeholder={isEditMode
          ? 'For example: shorten the headline, make the device larger, and increase contrast …'
          : 'Describe your app: audience, core features, tone …'}
      />
    </div>
    <div className="ai-modal-field">
      <label>{isEditMode ? 'Screenshots (optional)' : 'Screenshots'}</label>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        multiple
        hidden
        onChange={onFiles}
      />
      <button
        type="button"
        className="ai-modal-dropzone"
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload size={16} />
        <span>{isEditMode ? 'Add screenshot' : 'Choose screenshots'}</span>
      </button>
      {isEditMode && (
        <small className="ai-modal-hint">
          Only needed if you want to use a new image or app screenshot.
        </small>
      )}
      {screenshots.length > 0 && (
        <div className="ai-modal-thumbs">
          {screenshots.map((shot) => (
            <div className="ai-modal-thumb" key={shot.id}>
              <img src={shot.dataUrl} alt={shot.name} />
              <button
                type="button"
                onClick={() => onRemoveScreenshot(shot.id)}
                aria-label={`Remove ${shot.name}`}
              >
                <X size={11} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  </>
)

const RunningContent = ({
  log,
  logRef,
  reasoningTail,
  assistantText,
}: {
  log: LogEntry[]
  logRef: RefObject<HTMLDivElement | null>
  reasoningTail: string
  assistantText: string
}) => (
  <div className="ai-modal-run">
    <div className="ai-modal-log" ref={logRef}>
      {log.map((entry, index) => (
        <div
          className={`ai-modal-log-entry ai-modal-log-entry--${entry.kind}`}
          key={`${entry.kind}-${index}`}
        >
          {entry.text}
        </div>
      ))}
      <div className="ai-modal-log-entry ai-modal-log-entry--spinner">
        <span className="ai-modal-spinner" />
        {reasoningTail ? `Thinking … ${reasoningTail}` : 'Generating …'}
      </div>
    </div>
    {assistantText && <p className="ai-modal-assistant-text">{assistantText}</p>}
  </div>
)

const ResultContent = ({
  phase,
  doneInfo,
  isEditMode,
  assistantText,
  errorMessage,
}: {
  phase: RunPhase
  doneInfo: { summary: string; slidesCreated: number } | null
  isEditMode: boolean
  assistantText: string
  errorMessage: string | null
}) => {
  if (phase === 'done' && doneInfo) {
    return (
      <div className="ai-modal-result ai-modal-result--done">
        <p>
          {isEditMode
            ? 'Screen updated.'
            : `Done: ${doneInfo.slidesCreated} ${doneInfo.slidesCreated === 1 ? 'screen' : 'screens'} created.`}
        </p>
        {(doneInfo.summary || assistantText) && (
          <p className="ai-modal-assistant-text">
            {doneInfo.summary || assistantText}
          </p>
        )}
      </div>
    )
  }
  if (phase === 'error') {
    return <div className="ai-modal-result ai-modal-result--error"><p>{errorMessage}</p></div>
  }
  return null
}

const ModalFooter = ({
  phase,
  isEditMode,
  canGenerate,
  onGenerate,
  onCancel,
  onClose,
  onRetry,
}: {
  phase: RunPhase
  isEditMode: boolean
  canGenerate: boolean
  onGenerate: () => void
  onCancel: () => void
  onClose: () => void
  onRetry: () => void
}) => {
  if (phase === 'idle') {
    return (
      <button className="export-button ai-modal-generate" onClick={onGenerate} disabled={!canGenerate}>
        <Sparkles size={16} /><b>{isEditMode ? 'Edit' : 'Generate'}</b>
      </button>
    )
  }
  if (phase === 'running') {
    return <button className="ai-modal-btn-secondary" onClick={onCancel}>Cancel</button>
  }
  if (phase === 'done') {
    return <button className="export-button ai-modal-generate" onClick={onClose}><b>Close</b></button>
  }
  return <button className="ai-modal-btn-secondary" onClick={onRetry}>Try again</button>
}

export const AiGenerateModal = ({ open, onClose, controller, targetSlide, onPrepareRun, onFinished, onActivity }: AiGenerateModalProps) => {
  const [description, setDescription] = useState('')
  const [screenshots, setScreenshots] = useState<ScreenshotDraft[]>([])
  const [phase, setPhase] = useState<RunPhase>('idle')
  const [log, setLog] = useState<LogEntry[]>([])
  const [assistantText, setAssistantText] = useState('')
  const [reasoningTail, setReasoningTail] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [doneInfo, setDoneInfo] = useState<{ summary: string; slidesCreated: number } | null>(null)
  const [selection, setSelection] = useState<AiModelSelection>(INITIAL_AI_SELECTION)

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

  const isEditMode = Boolean(targetSlide)
  const canGenerate = Boolean(description.trim())
    && (isEditMode || screenshots.length > 0)
    && AI_PROVIDER_AVAILABILITY[selection.provider]

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

  const handleProviderChange = (provider: AiProviderId) => {
    setSelection({
      provider,
      model: getDefaultAiModel(provider).id,
    })
  }

  const handleEvent = (event: AiRunEvent) => {
    if (cancelledRef.current) return
    if (event.type === 'status') setLog((current) => [...current, { kind: 'status', text: event.message }])
    else if (event.type === 'tool') {
      setLog((current) => [...current, { kind: 'tool', text: `${event.name}: ${event.detail}` }])
      setReasoningTail('')
    } else if (event.type === 'text') {
      setAssistantText((current) => current + event.delta)
      setReasoningTail('')
    } else if (event.type === 'reasoning') {
      setReasoningTail((current) => (current + event.delta).slice(-160))
    } else if (event.type === 'done') {
      setDoneInfo({ summary: event.summary, slidesCreated: event.slidesCreated })
      setPhase('done')
      onActivity?.(null)
      onFinished(event.slidesCreated)
    } else {
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
      selection,
      description,
      screenshots: prepared,
      controller,
      ...(targetSlide ? { targetSlideId: targetSlide.id } : {}),
      signal: abortController.signal,
      onEvent: handleEvent,
      ...(onActivity ? { onActivity } : {}),
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
      <div className="ai-modal-card" role="dialog" aria-modal="true" aria-label={isEditMode ? 'Edit screen with AI' : 'Generate with AI'}>
        <div className="ai-modal-header">
          <div className="ai-modal-title">
            <Sparkles size={16} />
            <div>
              <h2>{isEditMode ? 'Edit screen with AI' : 'Generate with AI'}</h2>
              {targetSlide && <span>{targetSlide.name}</span>}
            </div>
          </div>
          <button className="ai-modal-close" onClick={requestClose} disabled={phase === 'running'} aria-label="Close"><X size={16} /></button>
        </div>

        <div className="ai-modal-body">
          {phase === 'idle' && (
            <>
              <AiProviderControls
                selection={selection}
                availability={AI_PROVIDER_AVAILABILITY}
                onProviderChange={handleProviderChange}
                onModelChange={(model) => setSelection((current) => ({ ...current, model }))}
              />
              <IdleContent
                isEditMode={isEditMode}
                description={description}
                screenshots={screenshots}
                fileInputRef={fileInputRef}
                onDescriptionChange={setDescription}
                onFiles={(event) => {
                  void handleFiles(event)
                }}
                onRemoveScreenshot={removeScreenshot}
              />
            </>
          )}

          {phase === 'running' && (
            <RunningContent
              log={log}
              logRef={logRef}
              reasoningTail={reasoningTail}
              assistantText={assistantText}
            />
          )}
          <ResultContent
            phase={phase}
            doneInfo={doneInfo}
            isEditMode={isEditMode}
            assistantText={assistantText}
            errorMessage={errorMessage}
          />
        </div>

        <div className="ai-modal-footer">
          <ModalFooter
            phase={phase}
            isEditMode={isEditMode}
            canGenerate={canGenerate}
            onGenerate={() => void handleGenerate()}
            onCancel={handleCancel}
            onClose={requestClose}
            onRetry={handleRetry}
          />
        </div>
      </div>
    </div>
  )
}
