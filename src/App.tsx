import { useCallback, useEffect, useRef, useState } from 'react'
import { getFontEmbedCSS, toBlob } from 'html-to-image'
import JSZip from 'jszip'
import {
  Check,
  ChevronDown,
  Cloud,
  Download,
  Minus,
  Plus,
  Redo2,
  Share2,
  Sparkles,
  Undo2,
  X,
} from 'lucide-react'
import { createInitialSlides, makeTemplate } from './data'
import { createAiController } from './ai/controller'
import { AiGenerateModal } from './components/AiGenerateModal'
import { EditorCanvas } from './components/EditorCanvas'
import { PropertiesPanel, ToolRail } from './components/Sidebar'
import { getDevicePlacement } from './mockups/catalog'
import type { Background, CanvasElement, DeviceElement, ShapeElement, Slide, TemplateId, TextElement, TextPreset, ToolId, UploadAsset } from './types'
import { downloadBlob, fileToDataUrl, uid } from './utils'

const STORAGE_KEY = 'frameflow-project-v5'

const loadInitialState = (): { slides: Slide[]; uploads: UploadAsset[] } => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved) as { slides?: Slide[]; uploads?: UploadAsset[] }
      if (parsed.slides?.length) return { slides: parsed.slides, uploads: parsed.uploads ?? [] }
    }
  } catch {
    // A fresh project is safer than blocking the editor on malformed local data.
  }
  return { slides: createInitialSlides(), uploads: [] }
}

const freshElementIds = (elements: CanvasElement[]) => elements.map((element) => ({ ...element, id: uid(element.type) }))

export default function App() {
  const [initial] = useState(loadInitialState)
  const [slides, setSlides] = useState<Slide[]>(initial.slides)
  const slidesRef = useRef(slides)
  const [uploads, setUploads] = useState<UploadAsset[]>(initial.uploads)
  const uploadsRef = useRef(uploads)
  const [activeSlideId, setActiveSlideId] = useState(initial.slides[0].id)
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null)
  const [activeTool, setActiveTool] = useState<ToolId>('templates')
  const [projectName, setProjectName] = useState('Summer Launch')
  const [zoom, setZoom] = useState(0.9)
  const [exporting, setExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState(0)
  const [toast, setToast] = useState<string | null>(null)
  const [historyState, setHistoryState] = useState({ undo: false, redo: false })
  const [aiOpen, setAiOpen] = useState(false)
  const past = useRef<Slide[][]>([])
  const future = useRef<Slide[][]>([])
  const preAiSlideIdsRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    slidesRef.current = slides
  }, [slides])

  useEffect(() => {
    uploadsRef.current = uploads
  }, [uploads])

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

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ slides, uploads }))
      } catch {
        // Data URLs can exceed a browser's local storage quota; the live project still works.
      }
    }, 350)
    return () => window.clearTimeout(timer)
  }, [slides, uploads])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 3200)
    return () => window.clearTimeout(timer)
  }, [toast])

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
          <span className="save-state"><Cloud size={13} /> Lokal gespeichert</span>
          <label><input value={projectName} onChange={(event) => setProjectName(event.target.value)} aria-label="Projektname" /><ChevronDown size={13} /></label>
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
      {aiController && (
        <AiGenerateModal
          open={aiOpen}
          onClose={() => setAiOpen(false)}
          controller={aiController}
          onPrepareRun={prepareAiRun}
          onFinished={handleAiFinished}
        />
      )}
      <div className="mobile-blocker"><div className="brand-symbol"><span>F</span><i /></div><h1>Mehr Platz für gute Ideen.</h1><p>Frameflow ist ein Desktop-Studio. Öffne den Editor auf einem größeren Bildschirm, um Screens präzise zu gestalten.</p></div>
    </div>
  )
}
