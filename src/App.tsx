import { useCallback, useEffect, useRef, useState } from 'react'
import { getFontEmbedCSS, toBlob } from 'html-to-image'
import JSZip from 'jszip'
import {
  AlertCircle,
  Check,
  ChevronDown,
  Cloud,
  Copy,
  Download,
  Minus,
  Plus,
  Redo2,
  Save,
  Share2,
  Sparkles,
  Trash2,
  Undo2,
  X,
} from './components/icons'
import { createInitialSlides, makeTemplate } from './data'
import { createAiController } from './ai/controller'
import type { AiToolActivity } from './ai/tools'
import { AiGenerateModal } from './components/AiGenerateModal'
import { EditorCanvas } from './components/EditorCanvas'
import { PropertiesPanel, ToolRail } from './components/Sidebar'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from './components/ui/alert-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from './components/ui/dropdown-menu'
import { getDevicePlacement } from './mockups/catalog'
import {
  deleteProject,
  loadLegacyProject,
  loadProject,
  loadProjectWorkspace,
  removeLegacyProject,
  saveProject,
  setActiveProjectId,
  type PersistedProject,
  type ProjectSummary,
} from './persistence'
import type { Background, CanvasElement, DeviceElement, ShapeElement, Slide, TemplateId, TextElement, TextPreset, ToolId, UploadAsset } from './types'
import { downloadBlob, fileToDataUrl, uid } from './utils'

const DEFAULT_PROJECT_NAME = 'Summer Launch'

const loadInitialState = (): { projectName: string; slides: Slide[]; uploads: UploadAsset[] } => {
  const legacy = loadLegacyProject()
  if (legacy) return { projectName: DEFAULT_PROJECT_NAME, ...legacy }
  return { projectName: DEFAULT_PROJECT_NAME, slides: createInitialSlides(), uploads: [] }
}

type SaveStatus = 'loading' | 'dirty' | 'saving' | 'saved' | 'error'

const saveStatusLabels: Record<SaveStatus, string> = {
  loading: 'Lokales Projekt wird geladen …',
  dirty: 'Noch nicht gespeichert',
  saving: 'Wird lokal gespeichert …',
  saved: 'Lokal gespeichert',
  error: 'Speichern fehlgeschlagen',
}

const sortProjectSummaries = (projects: ProjectSummary[]) => [...projects].sort((a, b) => b.savedAt - a.savedAt)

const upsertProjectSummary = (projects: ProjectSummary[], project: PersistedProject) => sortProjectSummaries([
  ...projects.filter((item) => item.id !== project.id),
  {
    id: project.id,
    projectName: project.projectName,
    createdAt: project.createdAt,
    savedAt: project.savedAt,
  },
])

const getUniqueProjectName = (projects: ProjectSummary[], desiredName: string) => {
  const names = new Set(projects.map((project) => project.projectName.toLocaleLowerCase('de-DE')))
  if (!names.has(desiredName.toLocaleLowerCase('de-DE'))) return desiredName
  let suffix = 2
  while (names.has(`${desiredName} ${suffix}`.toLocaleLowerCase('de-DE'))) suffix += 1
  return `${desiredName} ${suffix}`
}

const formatProjectTime = (timestamp: number) => new Date(timestamp).toLocaleString('de-DE', {
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
})

const freshElementIds = (elements: CanvasElement[]) => elements.map((element) => ({ ...element, id: uid(element.type) }))

// Eases the stage scroll by hand: native smooth scrolling and requestAnimationFrame both
// stall while the document is hidden (and smooth scrolling misbehaves with the CSS-zoomed
// artboards), so animate when visible and jump instantly otherwise.
let stageScrollAnimation = 0

const animateStageScroll = (stage: HTMLElement, targetLeft: number) => {
  cancelAnimationFrame(stageScrollAnimation)
  const from = stage.scrollLeft
  const delta = targetLeft - from
  if (Math.abs(delta) < 1) return
  if (document.visibilityState === 'hidden') {
    stage.scrollLeft = targetLeft
    return
  }
  const duration = 550
  const start = performance.now()
  const step = (now: number) => {
    const t = Math.min(1, (now - start) / duration)
    stage.scrollLeft = from + delta * (1 - Math.pow(1 - t, 3))
    if (t < 1) stageScrollAnimation = requestAnimationFrame(step)
  }
  stageScrollAnimation = requestAnimationFrame(step)
}

// A freshly added slide has no artboard DOM node yet when its first AI activity arrives,
// so retry briefly until React has rendered it before giving up on the scroll.
const scrollStageToArtboard = (slideId: string, attempt = 0) => {
  const node = document.getElementById(`artboard-${slideId}`)
  if (!node) {
    if (attempt < 10) window.setTimeout(() => scrollStageToArtboard(slideId, attempt + 1), 32)
    return
  }
  const stage = node.closest('.canvas-stage')
  if (!(stage instanceof HTMLElement)) return
  const nodeRect = node.getBoundingClientRect()
  const stageRect = stage.getBoundingClientRect()
  const delta = nodeRect.left + nodeRect.width / 2 - (stageRect.left + stageRect.width / 2)
  animateStageScroll(stage, stage.scrollLeft + delta)
}

export default function App() {
  const [initial] = useState(loadInitialState)
  const [slides, setSlides] = useState<Slide[]>(initial.slides)
  const slidesRef = useRef(slides)
  const [uploads, setUploads] = useState<UploadAsset[]>(initial.uploads)
  const uploadsRef = useRef(uploads)
  const [activeSlideId, setActiveSlideId] = useState(initial.slides[0].id)
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null)
  const [activeTool, setActiveTool] = useState<ToolId>('templates')
  const [projectName, setProjectName] = useState(initial.projectName)
  const projectNameRef = useRef(initial.projectName)
  const [currentProjectId, setCurrentProjectId] = useState('current')
  const currentProjectIdRef = useRef('current')
  const currentProjectCreatedAtRef = useRef(0)
  const [projects, setProjects] = useState<ProjectSummary[]>([])
  const [deleteProjectDialogOpen, setDeleteProjectDialogOpen] = useState(false)
  const [deletingProject, setDeletingProject] = useState(false)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('loading')
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null)
  const [persistenceReady, setPersistenceReady] = useState(false)
  const persistenceReadyRef = useRef(false)
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve())
  const changeRevisionRef = useRef(0)
  const saveAttemptRef = useRef(0)
  const skipNextAutoSaveRef = useRef(false)
  const projectTransitionRef = useRef(false)
  const [zoom, setZoom] = useState(0.9)
  const [exporting, setExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState(0)
  const [toast, setToast] = useState<string | null>(null)
  const [historyState, setHistoryState] = useState({ undo: false, redo: false })
  const [aiOpen, setAiOpen] = useState(false)
  const [aiActivity, setAiActivity] = useState<(AiToolActivity & { seq: number }) | null>(null)
  const aiActivitySeqRef = useRef(0)
  const past = useRef<Slide[][]>([])
  const future = useRef<Slide[][]>([])
  const preAiSlideIdsRef = useRef<Set<string>>(new Set())

  const replaceEditorProject = useCallback((project: PersistedProject) => {
    currentProjectIdRef.current = project.id
    currentProjectCreatedAtRef.current = project.createdAt
    projectNameRef.current = project.projectName
    slidesRef.current = project.slides
    uploadsRef.current = project.uploads
    setCurrentProjectId(project.id)
    setProjectName(project.projectName)
    setSlides(project.slides)
    setUploads(project.uploads)
    setActiveSlideId(project.slides[0].id)
    setSelectedElementId(null)
    setLastSavedAt(project.savedAt)
    setAiActivity(null)
    past.current = []
    future.current = []
    setHistoryState({ undo: false, redo: false })
  }, [])

  useEffect(() => {
    slidesRef.current = slides
  }, [slides])

  useEffect(() => {
    uploadsRef.current = uploads
  }, [uploads])

  useEffect(() => {
    let cancelled = false

    const hydrateProject = async () => {
      try {
        const workspace = await loadProjectWorkspace()
        if (cancelled) return

        if (workspace.activeProject) {
          replaceEditorProject(workspace.activeProject)
          setProjects(workspace.projects)
          await setActiveProjectId(workspace.activeProject.id)
        } else {
          const now = Date.now()
          const project: PersistedProject = {
            id: uid('project'),
            projectName: projectNameRef.current,
            slides: slidesRef.current,
            uploads: uploadsRef.current,
            createdAt: now,
            savedAt: now,
          }
          await saveProject(project)
          await setActiveProjectId(project.id)
          if (cancelled) return
          replaceEditorProject(project)
          setProjects(upsertProjectSummary([], project))
        }

        removeLegacyProject()
        skipNextAutoSaveRef.current = true
        setSaveStatus('saved')
      } catch {
        if (!cancelled) setSaveStatus('error')
      } finally {
        if (!cancelled) {
          persistenceReadyRef.current = true
          setPersistenceReady(true)
        }
      }
    }

    void hydrateProject()
    return () => {
      cancelled = true
    }
  }, [replaceEditorProject])

  const [aiController, setAiController] = useState<ReturnType<typeof createAiController> | null>(null)

  useEffect(() => {
    setAiController(createAiController({
      getSlides: () => slidesRef.current,
      setSlides: (updater) => {
        const next = updater(slidesRef.current)
        slidesRef.current = next
        setSlides(next)
      },
      getUploads: () => uploadsRef.current,
    }))
  }, [])

  const saveCurrentProject = useCallback(async (showConfirmation = false) => {
    if (!persistenceReadyRef.current || projectTransitionRef.current) return false

    const savedAt = Date.now()
    const revision = changeRevisionRef.current
    const attempt = ++saveAttemptRef.current
    const snapshot = {
      id: currentProjectIdRef.current,
      projectName: projectNameRef.current.trim() || DEFAULT_PROJECT_NAME,
      slides: slidesRef.current,
      uploads: uploadsRef.current,
      createdAt: currentProjectCreatedAtRef.current,
      savedAt,
    }

    setSaveStatus('saving')
    const saveRequest = saveQueueRef.current
      .catch(() => undefined)
      .then(() => saveProject(snapshot))
    saveQueueRef.current = saveRequest

    try {
      await saveRequest
      removeLegacyProject()
      if (attempt === saveAttemptRef.current && revision === changeRevisionRef.current) {
        setSaveStatus('saved')
        setLastSavedAt(savedAt)
      }
      setProjects((current) => upsertProjectSummary(current, snapshot))
      if (showConfirmation) setToast('Projekt lokal gespeichert')
      return true
    } catch {
      if (attempt === saveAttemptRef.current && revision === changeRevisionRef.current) setSaveStatus('error')
      if (showConfirmation) setToast('Lokales Speichern fehlgeschlagen')
      return false
    }
  }, [])

  const openProject = async (projectId: string) => {
    if (projectId === currentProjectIdRef.current || projectTransitionRef.current) return
    const saved = await saveCurrentProject()
    if (!saved) {
      setToast('Projektwechsel abgebrochen – Speichern fehlgeschlagen')
      return
    }

    projectTransitionRef.current = true
    try {
      const project = await loadProject(projectId)
      if (!project) throw new Error('Projekt nicht gefunden')
      await setActiveProjectId(project.id)
      skipNextAutoSaveRef.current = true
      replaceEditorProject(project)
      setSaveStatus('saved')
      setToast(`„${project.projectName}“ geöffnet`)
    } catch {
      setSaveStatus('error')
      setToast('Projekt konnte nicht geöffnet werden')
    } finally {
      projectTransitionRef.current = false
    }
  }

  const createNewProject = async () => {
    if (projectTransitionRef.current) return
    const saved = await saveCurrentProject()
    if (!saved) {
      setToast('Neues Projekt konnte nicht angelegt werden')
      return
    }

    projectTransitionRef.current = true
    const now = Date.now()
    const project: PersistedProject = {
      id: uid('project'),
      projectName: getUniqueProjectName(projects, 'Neues Projekt'),
      slides: createInitialSlides(),
      uploads: [],
      createdAt: now,
      savedAt: now,
    }

    try {
      await saveProject(project)
      await setActiveProjectId(project.id)
      skipNextAutoSaveRef.current = true
      replaceEditorProject(project)
      setProjects((current) => upsertProjectSummary(current, project))
      setSaveStatus('saved')
      setToast('Neues Projekt angelegt')
    } catch {
      setSaveStatus('error')
      setToast('Neues Projekt konnte nicht angelegt werden')
    } finally {
      projectTransitionRef.current = false
    }
  }

  const duplicateCurrentProject = async () => {
    if (projectTransitionRef.current) return
    const saved = await saveCurrentProject()
    if (!saved) {
      setToast('Projekt konnte nicht dupliziert werden')
      return
    }

    projectTransitionRef.current = true
    const now = Date.now()
    const project: PersistedProject = {
      id: uid('project'),
      projectName: getUniqueProjectName(projects, `${projectNameRef.current.trim() || DEFAULT_PROJECT_NAME} Kopie`),
      slides: structuredClone(slidesRef.current),
      uploads: structuredClone(uploadsRef.current),
      createdAt: now,
      savedAt: now,
    }

    try {
      await saveProject(project)
      await setActiveProjectId(project.id)
      skipNextAutoSaveRef.current = true
      replaceEditorProject(project)
      setProjects((current) => upsertProjectSummary(current, project))
      setSaveStatus('saved')
      setToast('Projekt dupliziert')
    } catch {
      setSaveStatus('error')
      setToast('Projekt konnte nicht dupliziert werden')
    } finally {
      projectTransitionRef.current = false
    }
  }

  const deleteCurrentProject = async () => {
    if (projects.length <= 1 || projectTransitionRef.current) return

    projectTransitionRef.current = true
    setDeletingProject(true)
    try {
      await saveQueueRef.current.catch(() => undefined)
      const nextSummary = projects.find((project) => project.id !== currentProjectIdRef.current)
      if (!nextSummary) throw new Error('Kein Ersatzprojekt gefunden')
      const nextProject = await loadProject(nextSummary.id)
      if (!nextProject) throw new Error('Ersatzprojekt nicht gefunden')
      await deleteProject(currentProjectIdRef.current)
      await setActiveProjectId(nextProject.id)
      skipNextAutoSaveRef.current = true
      replaceEditorProject(nextProject)
      setProjects((current) => current.filter((project) => project.id !== currentProjectId))
      setSaveStatus('saved')
      setDeleteProjectDialogOpen(false)
      setToast('Projekt lokal gelöscht')
    } catch {
      setSaveStatus('error')
      setToast('Projekt konnte nicht gelöscht werden')
    } finally {
      projectTransitionRef.current = false
      setDeletingProject(false)
    }
  }

  useEffect(() => {
    if (!persistenceReady) return
    if (skipNextAutoSaveRef.current) {
      skipNextAutoSaveRef.current = false
      return
    }

    changeRevisionRef.current += 1
    setSaveStatus('dirty')
    const timer = window.setTimeout(() => {
      void saveCurrentProject()
    }, 350)
    return () => window.clearTimeout(timer)
  }, [persistenceReady, projectName, saveCurrentProject, slides, uploads])

  useEffect(() => {
    const handleSaveShortcut = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 's') return
      event.preventDefault()
      void saveCurrentProject(true)
    }

    window.addEventListener('keydown', handleSaveShortcut)
    return () => window.removeEventListener('keydown', handleSaveShortcut)
  }, [saveCurrentProject])

  useEffect(() => {
    const flushPendingChanges = () => {
      if (document.visibilityState === 'hidden') void saveCurrentProject()
    }

    document.addEventListener('visibilitychange', flushPendingChanges)
    window.addEventListener('pagehide', flushPendingChanges)
    return () => {
      document.removeEventListener('visibilitychange', flushPendingChanges)
      window.removeEventListener('pagehide', flushPendingChanges)
    }
  }, [saveCurrentProject])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 3200)
    return () => window.clearTimeout(timer)
  }, [toast])

  const aiFollowedSlideRef = useRef<string | null>(null)

  const handleAiActivity = useCallback((activity: AiToolActivity | null) => {
    if (!activity) {
      setAiActivity(null)
      aiFollowedSlideRef.current = null
      return
    }
    aiActivitySeqRef.current += 1
    const seq = aiActivitySeqRef.current
    if (activity.slideId && activity.slideId !== aiFollowedSlideRef.current) {
      aiFollowedSlideRef.current = activity.slideId
      scrollStageToArtboard(activity.slideId)
    }
    setAiActivity((prev) => ({
      tool: activity.tool,
      slideId: activity.slideId ?? prev?.slideId,
      elementId: activity.elementId,
      x: activity.x ?? prev?.x ?? 50,
      y: activity.y ?? prev?.y ?? 30,
      seq,
    }))
  }, [])

  useEffect(() => {
    if (!aiActivity) return
    const t = window.setTimeout(() => setAiActivity(null), 6000)
    return () => window.clearTimeout(t)
  }, [aiActivity])

  const activeSlide = slides.find((slide) => slide.id === activeSlideId) ?? slides[0]
  const selectedElement = activeSlide?.elements.find((element) => element.id === selectedElementId)

  const commit = useCallback((updater: (current: Slide[]) => Slide[]) => {
    const current = slidesRef.current
    const next = updater(current)
    if (next === current) return
    past.current = [...past.current.slice(-39), current]
    future.current = []
    slidesRef.current = next
    setSlides(next)
    setHistoryState({ undo: true, redo: false })
  }, [])

  const checkpoint = useCallback(() => {
    past.current = [...past.current.slice(-39), slidesRef.current]
    future.current = []
    setHistoryState({ undo: true, redo: false })
  }, [])

  const updateElementLive = useCallback((slideId: string, elementId: string, patch: Partial<CanvasElement>) => {
    setSlides((current) => {
      const next = current.map((slide) => slide.id === slideId
        ? { ...slide, elements: slide.elements.map((element) => element.id === elementId ? ({ ...element, ...patch } as CanvasElement) : element) }
        : slide)
      slidesRef.current = next
      return next
    })
  }, [])

  const updateSelected = (patch: Partial<CanvasElement>) => {
    if (!selectedElementId) return
    commit((current) => current.map((slide) => slide.id === activeSlideId
      ? { ...slide, elements: slide.elements.map((element) => element.id === selectedElementId ? ({ ...element, ...patch } as CanvasElement) : element) }
      : slide))
  }

  const commitElementText = useCallback((slideId: string, elementId: string, patch: { text: string; html?: string }) => {
    commit((current) => current.map((slide) => slide.id === slideId
      ? { ...slide, elements: slide.elements.map((element) => element.id === elementId ? ({ ...element, ...patch } as CanvasElement) : element) }
      : slide))
  }, [commit])

  const selectElement = (id: string | null, slideId?: string) => {
    if (slideId) setActiveSlideId(slideId)
    setSelectedElementId(id)
    if (!id) return
    const element = slidesRef.current.flatMap((slide) => slide.elements).find((item) => item.id === id)
    if (element?.type === 'text') setActiveTool('text')
    if (element?.type === 'device') setActiveTool('device')
    if (element?.type === 'shape') setActiveTool('elements')
    if (element?.type === 'image') setActiveTool('uploads')
  }

  const undo = useCallback(() => {
    const previous = past.current.at(-1)
    if (!previous) return
    past.current = past.current.slice(0, -1)
    future.current = [slidesRef.current, ...future.current].slice(0, 40)
    slidesRef.current = previous
    setSlides(previous)
    setSelectedElementId(null)
    setHistoryState({ undo: past.current.length > 0, redo: future.current.length > 0 })
  }, [])

  const redo = useCallback(() => {
    const next = future.current[0]
    if (!next) return
    future.current = future.current.slice(1)
    past.current = [...past.current, slidesRef.current].slice(-40)
    slidesRef.current = next
    setSlides(next)
    setSelectedElementId(null)
    setHistoryState({ undo: past.current.length > 0, redo: future.current.length > 0 })
  }, [])

  const deleteSelected = useCallback(() => {
    if (!selectedElementId) return
    commit((current) => current.map((slide) => slide.id === activeSlideId
      ? { ...slide, elements: slide.elements.filter((element) => element.id !== selectedElementId) }
      : slide))
    setSelectedElementId(null)
  }, [activeSlideId, commit, selectedElementId])

  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement
      const isTyping = Boolean(target.closest?.('input, textarea, select, [contenteditable="true"]'))
      if (isTyping) return
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault()
        if (event.shiftKey) redo()
        else undo()
      }
      if (event.key === 'Delete' || event.key === 'Backspace') deleteSelected()
    }
    window.addEventListener('keydown', handleKeydown)
    return () => window.removeEventListener('keydown', handleKeydown)
  }, [deleteSelected, redo, undo])

  const addText = (preset: TextPreset) => {
    const configs = {
      title: { text: 'Deine Headline', y: 10, fontSize: 42, fontWeight: 760, width: 82, lineHeight: 0.98, letterSpacing: -1.2, fontFamily: 'Bricolage Grotesque Variable' },
      subtitle: { text: 'Die klare zweite Zeile', y: 20, fontSize: 24, fontWeight: 650, width: 78, lineHeight: 1.05, letterSpacing: -0.5, fontFamily: 'Manrope Variable' },
      body: { text: 'Eine kurze Erklärung, die den Mehrwert deiner App auf den Punkt bringt.', y: 24, fontSize: 17, fontWeight: 520, width: 76, lineHeight: 1.25, letterSpacing: -0.2, fontFamily: 'Instrument Sans Variable' },
      label: { text: 'NEUES FEATURE', y: 12, fontSize: 10, fontWeight: 760, width: 45, lineHeight: 1, letterSpacing: 1.4, fontFamily: 'Instrument Sans Variable', textTransform: 'uppercase' as const, backgroundColor: '#d8ff55', backgroundOpacity: 1, padding: 6, borderRadius: 10, color: '#172015' },
      quote: { text: '„Weniger Aufwand.\nMehr Wirkung.“', y: 20, fontSize: 27, fontWeight: 600, width: 80, lineHeight: 1.05, letterSpacing: -0.4, fontFamily: 'Playfair Display', italic: true },
      stat: { text: '98%\nmehr Fokus', y: 18, fontSize: 38, fontWeight: 760, width: 68, lineHeight: 0.92, letterSpacing: -1, fontFamily: 'Syne Variable' },
    }[preset]
    const element: TextElement = {
      id: uid('text'), type: 'text', x: 9, rotation: 0, opacity: 1,
      color: '#ffffff', align: 'left', italic: false, underline: false, strikethrough: false, textTransform: 'none',
      backgroundColor: '#ffffff', backgroundOpacity: 0, padding: 0, borderRadius: 0,
      strokeColor: '#111116', strokeWidth: 0, shadow: 0, shadowColor: '#000000',
      ...configs,
    }
    commit((current) => current.map((slide) => slide.id === activeSlideId ? { ...slide, elements: [...slide.elements, element] } : slide))
    setSelectedElementId(element.id)
  }

  const addShape = (shape: ShapeElement['shape']) => {
    const wideShape = ['pill', 'line', 'arrow', 'wave'].includes(shape)
    const width = shape === 'pill' ? 46 : wideShape ? 38 : 24
    const element: ShapeElement = {
      id: uid('shape'),
      type: 'shape',
      x: 50 - width / 2,
      y: wideShape ? 38 : 34,
      width,
      rotation: 0,
      opacity: 1,
      shape,
      color: '#d8ff55',
      strokeColor: '#171713',
      strokeWidth: ['line', 'arrow', 'wave'].includes(shape) ? 6 : shape === 'ring' ? 4 : 0,
      shadow: 14,
    }
    commit((current) => current.map((slide) => slide.id === activeSlideId ? { ...slide, elements: [...slide.elements, element] } : slide))
    setSelectedElementId(element.id)
    setActiveTool('elements')
  }

  const addDevice = (deviceStyle: DeviceElement['deviceStyle']) => {
    const placement = getDevicePlacement(deviceStyle)
    const element: DeviceElement = {
      id: uid('device'), type: 'device', ...placement, opacity: 1,
      deviceStyle, screenTheme: 'coral', tiltX: 0, tiltY: 0, shadow: 55,
    }
    commit((current) => current.map((slide) => slide.id === activeSlideId ? { ...slide, elements: [...slide.elements, element] } : slide))
    setSelectedElementId(element.id)
  }

  const addImage = (asset: UploadAsset) => {
    const element: CanvasElement = { id: uid('image'), type: 'image', x: 15, y: 28, width: 70, rotation: 0, opacity: 1, src: asset.src, borderRadius: 4, shadow: 32 }
    commit((current) => current.map((slide) => slide.id === activeSlideId ? { ...slide, elements: [...slide.elements, element] } : slide))
    setSelectedElementId(element.id)
  }

  const setDeviceImage = (asset: UploadAsset) => {
    const deviceTarget = selectedElement?.type === 'device' ? selectedElement : activeSlide.elements.find((element) => element.type === 'device')
    if (deviceTarget) {
      setSelectedElementId(deviceTarget.id)
      setActiveTool('device')
      commit((current) => current.map((slide) => slide.id === activeSlideId ? {
        ...slide,
        elements: slide.elements.map((element) => element.id === deviceTarget.id ? { ...element, screenshot: asset.src } : element),
      } : slide))
    } else {
      const deviceStyle: DeviceElement['deviceStyle'] = 'iphone-17-a'
      const element: DeviceElement = {
        id: uid('device'), type: 'device', ...getDevicePlacement(deviceStyle), opacity: 1,
        deviceStyle, screenTheme: 'coral', tiltX: 0, tiltY: 0, shadow: 55, screenshot: asset.src,
      }
      commit((current) => current.map((slide) => slide.id === activeSlideId ? { ...slide, elements: [...slide.elements, element] } : slide))
      setSelectedElementId(element.id)
      setActiveTool('device')
    }
  }

  const uploadFiles = async (files: FileList) => {
    const accepted = Array.from(files).filter((file) => file.type.startsWith('image/'))
    const assets = await Promise.all(accepted.map(async (file) => ({ id: uid('upload'), name: file.name, src: await fileToDataUrl(file) })))
    setUploads((current) => [...assets, ...current])
    if (assets[0]) setToast(`${assets.length} ${assets.length === 1 ? 'Datei' : 'Dateien'} hinzugefügt`)
  }

  const uploadToSelectedDevice = async (file: File) => {
    const src = await fileToDataUrl(file)
    const asset = { id: uid('upload'), name: file.name, src }
    setUploads((current) => [asset, ...current])
    setDeviceImage(asset)
  }

  const uploadBackgroundImage = async (file: File) => {
    const src = await fileToDataUrl(file)
    const asset = { id: uid('upload'), name: file.name, src }
    setUploads((current) => [asset, ...current])
    commit((current) => current.map((slide) => slide.id === activeSlideId ? {
      ...slide,
      background: {
        ...slide.background,
        type: 'image',
        image: src,
        imageFit: 'cover',
        imagePosition: 'center',
        overlayColor: '#111116',
        overlayOpacity: 0.18,
      },
    } : slide))
    setToast('Bild als Hintergrund eingesetzt')
  }

  const applyTemplate = (template: TemplateId) => {
    const replacement = makeTemplate(template, activeSlide.name)
    commit((current) => current.map((slide) => slide.id === activeSlideId ? { ...replacement, id: activeSlideId } : slide))
    setSelectedElementId(null)
    setToast('Vorlage angewendet')
  }

  const duplicateSelected = () => {
    if (!selectedElement) return
    const copy = { ...selectedElement, id: uid(selectedElement.type), x: selectedElement.x + 3, y: selectedElement.y + 2 } as CanvasElement
    commit((current) => current.map((slide) => slide.id === activeSlideId ? { ...slide, elements: [...slide.elements, copy] } : slide))
    setSelectedElementId(copy.id)
  }

  const toggleLock = () => selectedElement && updateSelected({ locked: !selectedElement.locked })

  const moveSelectedLayer = (direction: -1 | 1) => {
    if (!selectedElementId) return
    const index = activeSlide.elements.findIndex((element) => element.id === selectedElementId)
    const target = index + direction
    if (index < 0 || target < 0 || target >= activeSlide.elements.length) return
    commit((current) => current.map((slide) => {
      if (slide.id !== activeSlideId) return slide
      const elements = [...slide.elements]
      ;[elements[index], elements[target]] = [elements[target], elements[index]]
      return { ...slide, elements }
    }))
  }

  const addSlide = () => {
    const slide: Slide = { id: uid('slide'), name: `Screen ${slides.length + 1}`, background: { type: 'solid', color1: '#f2eee5', color2: '#f2eee5', angle: 135 }, elements: [] }
    commit((current) => [...current, slide])
    setActiveSlideId(slide.id)
    setSelectedElementId(null)
    setActiveTool('templates')
  }

  const duplicateSlide = (id: string) => {
    const sourceIndex = slides.findIndex((slide) => slide.id === id)
    const source = slides[sourceIndex]
    if (!source) return
    const copy: Slide = { ...source, id: uid('slide'), name: `${source.name} Copy`, elements: freshElementIds(source.elements) }
    commit((current) => [...current.slice(0, sourceIndex + 1), copy, ...current.slice(sourceIndex + 1)])
    setActiveSlideId(copy.id)
    setSelectedElementId(null)
  }

  const deleteSlide = (id: string) => {
    if (slides.length === 1) return
    const index = slides.findIndex((slide) => slide.id === id)
    const fallback = slides[index - 1] ?? slides[index + 1]
    commit((current) => current.filter((slide) => slide.id !== id))
    if (activeSlideId === id) setActiveSlideId(fallback.id)
    setSelectedElementId(null)
  }

  const moveSlide = (id: string, direction: -1 | 1) => {
    commit((current) => {
      const index = current.findIndex((slide) => slide.id === id)
      const target = index + direction
      if (index < 0 || target < 0 || target >= current.length) return current
      const next = [...current]
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }

  const updateBackground = (patch: Partial<Background>) => commit((current) => current.map((slide) => slide.id === activeSlideId ? { ...slide, background: { ...slide.background, ...patch } } : slide))

  const exportAll = async () => {
    if (exporting) return
    setExporting(true)
    setExportProgress(0)
    setSelectedElementId(null)
    try {
      await document.fonts.ready
      await new Promise((resolve) => window.setTimeout(resolve, 120))
      const zip = new JSZip()
      const firstNode = document.getElementById(`artboard-${slides[0].id}`)
      const fontEmbedCSS = firstNode ? await getFontEmbedCSS(firstNode, { preferredFontFormat: 'woff2' }) : undefined
      for (let index = 0; index < slides.length; index += 1) {
        const slide = slides[index]
        const node = document.getElementById(`artboard-${slide.id}`)
        if (!node) continue
        const blob = await toBlob(node, {
          pixelRatio: 1,
          canvasWidth: 1290,
          canvasHeight: 2796,
          backgroundColor: slide.background.color1,
          fontEmbedCSS,
          preferredFontFormat: 'woff2',
          filter: (candidate) => !(candidate instanceof HTMLElement && candidate.dataset.aiOverlay),
        })
        if (!blob) throw new Error(`Screen ${index + 1} konnte nicht gerendert werden`)
        const safeName = slide.name.replace(/[^a-z0-9äöüß_-]+/gi, '-').replace(/^-|-$/g, '') || `Screen-${index + 1}`
        zip.file(`${String(index + 1).padStart(2, '0')}-${safeName}.png`, blob)
        setExportProgress(Math.round(((index + 1) / slides.length) * 100))
      }
      const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } })
      downloadBlob(blob, `${projectName.trim().replace(/[^a-z0-9äöüß_-]+/gi, '-') || 'Frameflow'}-Screens.zip`)
      setToast(`${slides.length} PNGs als ZIP exportiert`)
    } catch (error) {
      console.error(error)
      setToast('Export fehlgeschlagen – bitte erneut versuchen')
    } finally {
      setExporting(false)
      setExportProgress(0)
    }
  }

  const shareProject = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setToast('Projektlink kopiert')
    } catch {
      setToast('Link konnte nicht kopiert werden')
    }
  }

  const prepareAiRun = (files: Array<{ name: string; dataUrl: string }>) => {
    checkpoint()
    setSelectedElementId(null)
    preAiSlideIdsRef.current = new Set(slidesRef.current.map((slide) => slide.id))
    const bySrc = new Map(uploadsRef.current.map((asset) => [asset.src, asset]))
    const additions: UploadAsset[] = []
    const prepared = files.map((file) => {
      let asset = bySrc.get(file.dataUrl)
      if (!asset) {
        asset = { id: uid('upload'), name: file.name, src: file.dataUrl }
        additions.push(asset)
        bySrc.set(asset.src, asset)
      }
      return { assetId: asset.id, name: asset.name, dataUrl: asset.src }
    })
    if (additions.length > 0) {
      uploadsRef.current = [...additions, ...uploadsRef.current]
      setUploads(uploadsRef.current)
    }
    return prepared
  }

  const handleAiFinished = (slidesCreated: number) => {
    setToast(`${slidesCreated} Screens mit AI erstellt`)
    setAiActivity(null)
    const firstNewSlide = slidesRef.current.find((slide) => !preAiSlideIdsRef.current.has(slide.id))
    if (firstNewSlide) {
      setActiveSlideId(firstNewSlide.id)
      setSelectedElementId(null)
    }
  }

  const canUndo = historyState.undo
  const canRedo = historyState.redo

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-lockup"><div className="brand-symbol"><span>F</span><i /></div><strong>Frameflow</strong><em>STUDIO</em></div>
        <div className="project-meta">
          <span
            className={`save-state save-state--${saveStatus}`}
            title={lastSavedAt ? `Zuletzt gespeichert um ${new Date(lastSavedAt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}` : undefined}
            aria-live="polite"
          >
            {saveStatus === 'error' ? <AlertCircle size={13} /> : <Cloud size={13} />}
            {saveStatusLabels[saveStatus]}
          </span>
          <div className="project-name-control">
            <input
              value={projectName}
              onChange={(event) => {
                projectNameRef.current = event.target.value
                setProjectName(event.target.value)
              }}
              aria-label="Projektname"
            />
            <DropdownMenu>
              <DropdownMenuTrigger className="project-menu-trigger" aria-label="Projektmenü öffnen">
                <ChevronDown size={13} />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" sideOffset={18} className="project-menu-content w-80">
                <DropdownMenuGroup className="project-menu-projects">
                  <DropdownMenuLabel className="project-menu-label">
                    <strong>Lokale Projekte</strong>
                    <span>{projects.length} {projects.length === 1 ? 'Projekt' : 'Projekte'} in diesem Browser</span>
                  </DropdownMenuLabel>
                  <div className="project-menu-list">
                    {projects.map((project) => (
                      <DropdownMenuItem
                        key={project.id}
                        className="project-menu-project"
                        data-active={project.id === currentProjectId}
                        disabled={!persistenceReady || saveStatus === 'saving'}
                        onClick={() => void openProject(project.id)}
                      >
                        <span className="project-menu-check">{project.id === currentProjectId && <Check size={14} />}</span>
                        <span className="project-menu-project-copy">
                          <strong>{project.projectName}</strong>
                          <small>Gespeichert {formatProjectTime(project.savedAt)}</small>
                        </span>
                      </DropdownMenuItem>
                    ))}
                  </div>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem
                    className="project-menu-action"
                    disabled={!persistenceReady || saveStatus === 'saving'}
                    onClick={() => void createNewProject()}
                  >
                    <Plus size={15} />
                    <span>Neues Projekt</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="project-menu-action"
                    disabled={!persistenceReady || saveStatus === 'saving'}
                    onClick={() => void duplicateCurrentProject()}
                  >
                    <Copy size={15} />
                    <span>Projekt duplizieren</span>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="project-menu-action"
                  disabled={!persistenceReady || saveStatus === 'saving'}
                  onClick={() => void saveCurrentProject(true)}
                >
                  <Save size={15} />
                  <span>Jetzt speichern</span>
                  <DropdownMenuShortcut>⌘S</DropdownMenuShortcut>
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="project-menu-action"
                  variant="destructive"
                  disabled={!persistenceReady || projects.length <= 1 || saveStatus === 'saving'}
                  onClick={() => setDeleteProjectDialogOpen(true)}
                >
                  <Trash2 size={15} />
                  <span>Aktuelles Projekt löschen</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <div className="topbar-actions">
          <div className="history-actions"><button onClick={undo} disabled={!canUndo} title="Rückgängig (⌘Z)"><Undo2 size={17} /></button><button onClick={redo} disabled={!canRedo} title="Wiederholen (⇧⌘Z)"><Redo2 size={17} /></button></div>
          <button className="ai-generate-button" onClick={() => setAiOpen(true)} disabled={exporting || !aiController}><Sparkles size={15} /> Mit AI generieren</button>
          <button className="share-button" onClick={shareProject}><Share2 size={16} /> Teilen</button>
          <button className="export-button" onClick={exportAll} disabled={exporting}>
            {exporting ? <><span className="export-spinner" /><b>{exportProgress}%</b></> : <><Download size={17} /><b>Alle als ZIP</b></>}
          </button>
        </div>
      </header>

      <div className="editor-shell">
        <ToolRail activeTool={activeTool} onChange={setActiveTool} />
        <PropertiesPanel
          activeTool={activeTool}
          activeSlide={activeSlide}
          selectedElement={selectedElement}
          uploads={uploads}
          onApplyTemplate={applyTemplate}
          onAddText={addText}
          onAddDevice={addDevice}
          onAddShape={addShape}
          onUpdateSelected={updateSelected}
          onUpdateBackground={updateBackground}
          onUploadFiles={uploadFiles}
          onUploadToDevice={uploadToSelectedDevice}
          onUploadBackground={uploadBackgroundImage}
          onAddImage={addImage}
          onSetDeviceImage={setDeviceImage}
        />
        <EditorCanvas
          slides={slides}
          activeSlideId={activeSlideId}
          selectedElementId={selectedElementId}
          exporting={exporting}
          zoom={zoom}
          aiActivity={aiActivity}
          onSetActiveSlide={setActiveSlideId}
          onSelectElement={selectElement}
          onUpdateElement={updateElementLive}
          onCommitText={commitElementText}
          onCheckpoint={checkpoint}
          onDuplicateElement={duplicateSelected}
          onDeleteElement={deleteSelected}
          onToggleLock={toggleLock}
          onMoveElementLayer={moveSelectedLayer}
          onAddSlide={addSlide}
          onDuplicateSlide={duplicateSlide}
          onDeleteSlide={deleteSlide}
          onMoveSlide={moveSlide}
        />
        <div className="zoom-control">
          <button onClick={() => setZoom((value) => Math.max(0.65, Number((value - 0.1).toFixed(2))))} disabled={zoom <= 0.65}><Minus size={14} /></button>
          <span>{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom((value) => Math.min(1.15, Number((value + 0.1).toFixed(2))))} disabled={zoom >= 1.15}><Plus size={14} /></button>
        </div>
      </div>

      {toast && <div className="toast"><span><Check size={14} /></span><strong>{toast}</strong><button onClick={() => setToast(null)}><X size={14} /></button></div>}
      <AlertDialog
        open={deleteProjectDialogOpen}
        onOpenChange={(open) => {
          if (!deletingProject) setDeleteProjectDialogOpen(open)
        }}
      >
        <AlertDialogContent className="project-delete-dialog">
          <AlertDialogHeader>
            <AlertDialogMedia><Trash2 size={17} /></AlertDialogMedia>
            <AlertDialogTitle>Projekt löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              „{projectName}“ samt Screens und Uploads wird dauerhaft aus diesem Browser gelöscht.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="project-delete-cancel" disabled={deletingProject}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction className="project-delete-confirm" variant="destructive" disabled={deletingProject} onClick={() => void deleteCurrentProject()}>
              {deletingProject ? 'Wird gelöscht …' : 'Projekt löschen'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {aiController && (
        <AiGenerateModal
          open={aiOpen}
          onClose={() => setAiOpen(false)}
          controller={aiController}
          onPrepareRun={prepareAiRun}
          onFinished={handleAiFinished}
          onActivity={handleAiActivity}
        />
      )}
      <div className="mobile-blocker"><div className="brand-symbol"><span>F</span><i /></div><h1>Mehr Platz für gute Ideen.</h1><p>Frameflow ist ein Desktop-Studio. Öffne den Editor auf einem größeren Bildschirm, um Screens präzise zu gestalten.</p></div>
    </div>
  )
}
