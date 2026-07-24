import {
  useEffect,
  useRef,
  useState,
  type DragEvent,
  type RefObject,
} from 'react'
import {
  clampAiReasoningEffort,
  findAiModelById,
  type AiModelSelection,
  type AiProviderId,
} from '../ai/provider-catalog'
import {
  AI_PROVIDER_AVAILABILITY,
  INITIAL_AI_SELECTION,
} from '../ai/provider-config'
import { runAiGeneration, type AiRunEvent, type AiToolActivity } from '../ai/runner'
import { fileToDataUrl, uid } from '../utils'
import { filterAcceptedImageFiles } from './ai-modal-image-files'
import { AiProviderControls } from './AiProviderControls'
import { CopyCodingPromptButton } from './CopyCodingPrompt'
import { StartUp02, Upload, X } from './icons'
import type { AiEditorController } from '../ai/controller'

type ImageDraft = { id: string; file: File; name: string; dataUrl: string }
type LogEntry = { kind: 'status' | 'tool'; text: string }
type RunPhase = 'idle' | 'running' | 'done' | 'error'

const toImageDrafts = async (files: File[], idPrefix: 'logo' | 'shot'): Promise<ImageDraft[]> =>
  Promise.all(files.map(async (file) => ({
    id: uid(idPrefix),
    file,
    name: file.name,
    dataUrl: await fileToDataUrl(file),
  })))

export type AiGenerateModalProps = {
  open: boolean
  onClose: () => void
  controller: AiEditorController
  targetSlide?: { id: string; name: string }
  onPrepareRun: (files: { name: string; dataUrl: string }[]) => { assetId: string; name: string; dataUrl: string }[]
  onFinished: (slidesCreated: number) => void
  onActivity?: (activity: AiToolActivity | null) => void
}

type ImageDropzoneProps = {
  label: string
  inputRef: RefObject<HTMLInputElement | null>
  onFiles: (files: File[]) => void
}

type LogoPreviewProps = {
  logo: ImageDraft
  onRemove: () => void
}

const ImageDropzone = ({ label, inputRef, onFiles }: ImageDropzoneProps) => {
  const [isDragging, setIsDragging] = useState(false)
  const dragDepthRef = useRef(0)

  const resetDragState = () => {
    dragDepthRef.current = 0
    setIsDragging(false)
  }

  const handleDragEnter = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.stopPropagation()
    dragDepthRef.current += 1
    if (Array.from(event.dataTransfer.types).includes('Files')) {
      setIsDragging(true)
    }
  }

  const handleDragLeave = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.stopPropagation()
    dragDepthRef.current -= 1
    if (dragDepthRef.current <= 0) resetDragState()
  }

  const handleDragOver = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.stopPropagation()
    event.dataTransfer.dropEffect = 'copy'
  }

  const handleDrop = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.stopPropagation()
    resetDragState()
    const files = filterAcceptedImageFiles(event.dataTransfer.files)
    if (files.length > 0) onFiles(files)
  }

  return (
    <button
      type="button"
      className={`ai-modal-dropzone${isDragging ? ' ai-modal-dropzone--active' : ''}`}
      onClick={() => inputRef.current?.click()}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <Upload size={16} />
      <span>{label}</span>
    </button>
  )
}

const LogoPreview = ({ logo, onRemove }: LogoPreviewProps) => (
  <div className="ai-modal-logo-slot">
    <img src={logo.dataUrl} alt={logo.name} />
    <button
      type="button"
      className="ai-modal-logo-slot__remove"
      onClick={onRemove}
      aria-label={`Remove ${logo.name}`}
    >
      <X size={11} />
    </button>
  </div>
)

type IdleContentProps = {
  isEditMode: boolean
  appName: string
  description: string
  logo: ImageDraft | null
  screenshots: ImageDraft[]
  logoInputRef: RefObject<HTMLInputElement | null>
  fileInputRef: RefObject<HTMLInputElement | null>
  onAppNameChange: (appName: string) => void
  onDescriptionChange: (description: string) => void
  onLogoFiles: (files: File[]) => void
  onRemoveLogo: () => void
  onScreenshotFiles: (files: File[]) => void
  onRemoveScreenshot: (id: string) => void
}

const IdleContent = ({
  isEditMode,
  appName,
  description,
  logo,
  screenshots,
  logoInputRef,
  fileInputRef,
  onAppNameChange,
  onDescriptionChange,
  onLogoFiles,
  onRemoveLogo,
  onScreenshotFiles,
  onRemoveScreenshot,
}: IdleContentProps) => (
  <>
    {!isEditMode && (
      <>
        <div className="ai-modal-field">
          <label htmlFor="ai-modal-app-name">App name</label>
          <input
            id="ai-modal-app-name"
            type="text"
            value={appName}
            onChange={(event) => onAppNameChange(event.target.value)}
            placeholder="e.g. Frameflow"
            autoComplete="off"
          />
        </div>
        <div className="ai-modal-field">
          <label>App logo</label>
          <input
            ref={logoInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            hidden
            onChange={(event) => {
              const files = event.target.files
              if (files?.length) onLogoFiles(Array.from(files))
              event.target.value = ''
            }}
          />
          {logo
            ? <LogoPreview logo={logo} onRemove={onRemoveLogo} />
            : (
                <ImageDropzone
                  label="Drop or upload app logo"
                  inputRef={logoInputRef}
                  onFiles={onLogoFiles}
                />
              )}
          <small className="ai-modal-hint">
            The AI will place this logo on the generated screens (not inside device frames).
          </small>
        </div>
      </>
    )}
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
      {!isEditMode && (
        <div className="ai-modal-prompt-helper">
          <CopyCodingPromptButton />
          <small className="ai-modal-hint">
            Not sure what to write? Paste this prompt into your coding assistant (Cursor, Claude Code, Copilot …) and it will draft a description from your codebase.
          </small>
        </div>
      )}
    </div>
    <div className="ai-modal-field">
      <label>{isEditMode ? 'Screenshots (optional)' : 'Screenshots'}</label>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        multiple
        hidden
        onChange={(event) => {
          const files = event.target.files
          if (files?.length) onScreenshotFiles(Array.from(files))
          event.target.value = ''
        }}
      />
      <ImageDropzone
        label={isEditMode ? 'Drop or add screenshot' : 'Drop or choose screenshots'}
        inputRef={fileInputRef}
        onFiles={onScreenshotFiles}
      />
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
        <StartUp02 size={16} /><b>{isEditMode ? 'Edit' : 'Generate'}</b>
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
  const [appName, setAppName] = useState('')
  const [description, setDescription] = useState('')
  const [logo, setLogo] = useState<ImageDraft | null>(null)
  const [screenshots, setScreenshots] = useState<ImageDraft[]>([])
  const [phase, setPhase] = useState<RunPhase>('idle')
  const [log, setLog] = useState<LogEntry[]>([])
  const [assistantText, setAssistantText] = useState('')
  const [reasoningTail, setReasoningTail] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [doneInfo, setDoneInfo] = useState<{ summary: string; slidesCreated: number } | null>(null)
  const [selection, setSelection] = useState<AiModelSelection>(INITIAL_AI_SELECTION)

  const logoInputRef = useRef<HTMLInputElement>(null)
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
    && (isEditMode || (Boolean(appName.trim()) && logo !== null && screenshots.length > 0))
    && AI_PROVIDER_AVAILABILITY[selection.provider]

  const handleLogoFiles = async (files: File[]) => {
    const [file] = filterAcceptedImageFiles(files)
    if (!file) return
    const [draft] = await toImageDrafts([file], 'logo')
    if (!draft) return
    setLogo(draft)
  }

  const handleScreenshotFiles = async (files: File[]) => {
    const accepted = filterAcceptedImageFiles(files)
    if (!accepted.length) return
    const drafts = await toImageDrafts(accepted, 'shot')
    setScreenshots((current) => [...current, ...drafts])
  }

  const removeScreenshot = (id: string) => setScreenshots((current) => current.filter((shot) => shot.id !== id))

  const handleModelSelect = (provider: AiProviderId, modelId: string) => {
    const { model } = findAiModelById(modelId)
    const reasoningEffort = clampAiReasoningEffort(model, selection.reasoningEffort)
    setSelection({
      provider,
      model: modelId,
      ...(reasoningEffort ? { reasoningEffort } : {}),
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
    const filesToPrepare = [
      ...screenshots.map((shot) => ({ name: shot.name, dataUrl: shot.dataUrl })),
      ...(!isEditMode && logo ? [{ name: logo.name, dataUrl: logo.dataUrl }] : []),
    ]
    const prepared = onPrepareRun(filesToPrepare)
    const preparedScreenshots = prepared.slice(0, screenshots.length)
    const preparedLogo = !isEditMode && logo ? prepared[screenshots.length] : undefined
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
      screenshots: preparedScreenshots,
      ...(!isEditMode && appName.trim() ? { appName: appName.trim() } : {}),
      ...(preparedLogo ? { logo: preparedLogo } : {}),
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
            <StartUp02 size={16} />
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
                onModelSelect={handleModelSelect}
                onReasoningEffortChange={(reasoningEffort) => {
                  setSelection((current) => ({ ...current, reasoningEffort }))
                }}
              />
              <IdleContent
                isEditMode={isEditMode}
                appName={appName}
                description={description}
                logo={logo}
                screenshots={screenshots}
                logoInputRef={logoInputRef}
                fileInputRef={fileInputRef}
                onAppNameChange={setAppName}
                onDescriptionChange={setDescription}
                onLogoFiles={(files) => {
                  void handleLogoFiles(files)
                }}
                onRemoveLogo={() => setLogo(null)}
                onScreenshotFiles={(files) => {
                  void handleScreenshotFiles(files)
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
