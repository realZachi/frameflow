import { useCallback, useEffect, useRef, useState } from 'react'
import { useAiWorkflow } from './ai/use-ai-workflow'
import { AppHeader } from './app/AppHeader'
import { loadInitialState } from './app/project-utils'
import { ProjectDeleteDialog } from './app/ProjectDeleteDialog'
import { useProjectWorkspace } from './app/use-project-workspace'
import { useSlideExport } from './app/use-slide-export'
import { AiGenerateModal } from './components/AiGenerateModal'
import { EditorCanvas } from './components/EditorCanvas'
import { ElementToolbar } from './components/ElementToolbar'
import { Check, Minus, Plus, X } from './components/icons'
import { PropertiesPanel, ToolRail } from './components/Sidebar'
import { useEditorActions } from './editor/use-editor-actions'
import { useEditorHistory } from './editor/use-editor-history'
import { useEditorKeyboard } from './editor/use-editor-keyboard'
import type { Slide, ToolId } from './types'

const getActiveSlide = (slides: Slide[], activeSlideId: string) => {
  const slide = slides.find((item) => item.id === activeSlideId) ?? slides[0]
  if (!slide) throw new Error('A project must contain at least one screen')
  return slide
}

export default function App() {
  const [initial] = useState(loadInitialState)
  const [slides, setSlides] = useState<Slide[]>(initial.slides)
  const slidesRef = useRef(slides)
  const [uploads, setUploads] = useState(initial.uploads)
  const uploadsRef = useRef(uploads)
  const [activeSlideId, setActiveSlideId] = useState(initial.slides[0]?.id ?? '')
  const [selectedElementIds, setSelectedElementIds] = useState<string[]>([])
  const [activeTool, setActiveTool] = useState<ToolId>('templates')
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [zoom, setZoom] = useState(0.9)
  const [toast, setToast] = useState<string | null>(null)

  const selectedElementId = selectedElementIds.at(-1) ?? null
  const clearSelection = useCallback(() => setSelectedElementIds([]), [])
  const setSelectedElementId = useCallback((id: string | null) => {
    setSelectedElementIds(id ? [id] : [])
  }, [])

  const history = useEditorHistory({
    setSlides,
    slidesRef,
    clearSelection,
  })

  const ai = useAiWorkflow({
    slides,
    setSlides,
    slidesRef,
    setUploads,
    uploadsRef,
    checkpoint: history.checkpoint,
    setActiveSlideId,
    clearSelection,
    setToast,
  })
  const { close: closeAi, handleActivity: handleAiActivity } = ai
  const { commit, resetHistory } = history

  const handleProjectReplaced = useCallback((project: {
    slides: Slide[]
  }) => {
    const firstSlide = project.slides[0]
    if (!firstSlide) throw new Error('A project must contain at least one screen')
    setActiveSlideId(firstSlide.id)
    clearSelection()
    handleAiActivity(null)
    closeAi()
    resetHistory()
  }, [clearSelection, closeAi, handleAiActivity, resetHistory])

  const project = useProjectWorkspace({
    initialProjectName: initial.projectName,
    slides,
    setSlides,
    slidesRef,
    uploads,
    setUploads,
    uploadsRef,
    onProjectReplaced: handleProjectReplaced,
    setToast,
  })

  const activeSlide = getActiveSlide(slides, activeSlideId)
  const selectedElement = activeSlide.elements.find(
    (element) => element.id === selectedElementId,
  )

  const selectElement = useCallback((
    id: string | null,
    slideId?: string,
    additive = false,
  ) => {
    if (slideId) setActiveSlideId(slideId)
    if (!id) {
      clearSelection()
      return
    }

    setSelectedElementIds((current) => {
      if (!additive || (slideId && slideId !== activeSlideId)) {
        return current.includes(id) && !additive ? current : [id]
      }
      return current.includes(id)
        ? current.filter((elementId) => elementId !== id)
        : [...current, id]
    })
    const element = slidesRef.current
      .flatMap((slide) => slide.elements)
      .find((item) => item.id === id)
    if (element?.type === 'text') setActiveTool('text')
    if (element?.type === 'device') setActiveTool('device')
    if (element?.type === 'shape') setActiveTool('elements')
    if (element?.type === 'image') setActiveTool('uploads')
  }, [activeSlideId, clearSelection])

  const deleteSelected = useCallback(() => {
    if (selectedElementIds.length === 0) return
    const selectedIds = new Set(selectedElementIds)
    commit((current) => current.map((slide) => slide.id === activeSlideId
      ? {
          ...slide,
          elements: slide.elements.filter((element) => !selectedIds.has(element.id)),
        }
      : slide))
    clearSelection()
  }, [activeSlideId, clearSelection, commit, selectedElementIds])

  const commitElementText = useCallback((
    slideId: string,
    elementId: string,
    patch: { text: string; html?: string },
  ) => {
    commit((current) => current.map((slide) => slide.id === slideId
      ? {
          ...slide,
          elements: slide.elements.map((element) => element.id === elementId
            ? { ...element, ...patch }
            : element),
        }
      : slide))
  }, [commit])

  const actions = useEditorActions({
    slides,
    activeSlide,
    activeSlideId,
    selectedElement,
    selectedElementId,
    commit: history.commit,
    setActiveSlideId,
    setSelectedElementId,
    setActiveTool,
    setUploads,
    setToast,
  })

  useEditorKeyboard({
    activeSlide,
    selectedElementIds,
    checkpoint: history.checkpoint,
    updateElementsLive: history.updateElementsLive,
    undo: history.undo,
    redo: history.redo,
    deleteSelected,
  })

  const slideExport = useSlideExport({
    slides,
    projectName: project.projectName,
    clearSelection,
    setToast,
  })

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 3200)
    return () => window.clearTimeout(timer)
  }, [toast])

  const handleToolChange = useCallback((tool: ToolId) => {
    if (tool === activeTool) {
      setIsSidebarOpen((open) => !open)
      return
    }
    setActiveTool(tool)
    setIsSidebarOpen(true)
  }, [activeTool])

  const zoomOut = () => setZoom((value) =>
    Math.max(0.65, Number((value - 0.1).toFixed(2))))
  const zoomIn = () => setZoom((value) =>
    Math.min(1.15, Number((value + 0.1).toFixed(2))))

  return (
    <div
      className={`app-shell${selectedElement ? ' has-selection' : ''}`}
      data-sidebar-open={isSidebarOpen}
    >
      <AppHeader
        projectName={project.projectName}
        saveStatus={project.saveStatus}
        lastSavedAt={project.lastSavedAt}
        projects={project.projects}
        currentProjectId={project.currentProjectId}
        persistenceReady={project.persistenceReady}
        exporting={slideExport.exporting}
        exportProgress={slideExport.exportProgress}
        canUndo={history.canUndo}
        canRedo={history.canRedo}
        aiDisabled={slideExport.exporting || !ai.controller || ai.open}
        onProjectNameChange={project.setProjectName}
        onOpenProject={project.openProject}
        onCreateProject={project.createNewProject}
        onDuplicateProject={project.duplicateCurrentProject}
        onSaveProject={() => void project.saveCurrentProject(true)}
        onRequestProjectDeletion={() => project.setDeleteDialogOpen(true)}
        onUndo={history.undo}
        onRedo={history.redo}
        onOpenAi={ai.openGenerator}
        onExport={(format) => void slideExport.exportAll(format)}
      >
        {selectedElement && selectedElementIds.length === 1 && (
          <ElementToolbar
            element={selectedElement}
            onUpdate={actions.updateSelected}
            onUploadToDevice={(file) => {
              void actions.uploadToSelectedDevice(file)
            }}
            onDuplicate={actions.duplicateSelected}
            onToggleLock={actions.toggleLock}
            onMoveLayer={actions.moveSelectedLayer}
            onDelete={deleteSelected}
          />
        )}
      </AppHeader>

      <div className={`editor-shell${isSidebarOpen ? '' : ' is-sidebar-collapsed'}`}>
        <ToolRail
          activeTool={activeTool}
          isOpen={isSidebarOpen}
          onChange={handleToolChange}
        />
        <PropertiesPanel
          activeTool={activeTool}
          activeSlide={activeSlide}
          uploads={uploads}
          onApplyTemplate={actions.applyTemplate}
          onAddText={actions.addText}
          onAddDevice={actions.addDevice}
          onAddShape={actions.addShape}
          onUpdateBackground={actions.updateBackground}
          onUploadFiles={(files) => {
            void actions.uploadFiles(files)
          }}
          onUploadBackground={(file) => {
            void actions.uploadBackgroundImage(file)
          }}
          onAddImage={actions.addImage}
          onSetDeviceImage={actions.setDeviceImage}
        />
        <EditorCanvas
          slides={slides}
          activeSlideId={activeSlideId}
          selectedElementIds={selectedElementIds}
          exporting={slideExport.exporting}
          zoom={zoom}
          aiActivity={ai.activity}
          onSetActiveSlide={setActiveSlideId}
          onSelectElement={selectElement}
          onUpdateElements={history.updateElementsLive}
          onCommitText={commitElementText}
          onCheckpoint={history.checkpoint}
          onAddSlide={actions.addSlide}
          onDuplicateSlide={actions.duplicateSlide}
          onDeleteSlide={actions.deleteSlide}
          onMoveSlide={actions.moveSlide}
          onEditSlideWithAi={ai.openEditor}
          aiActionsDisabled={slideExport.exporting || ai.open}
        />
        <div className="zoom-control">
          <button onClick={zoomOut} disabled={zoom <= 0.65}>
            <Minus size={14} />
          </button>
          <span>{Math.round(zoom * 100)}%</span>
          <button onClick={zoomIn} disabled={zoom >= 1.15}>
            <Plus size={14} />
          </button>
        </div>
      </div>

      {toast && (
        <div className="toast">
          <span><Check size={14} /></span>
          <strong>{toast}</strong>
          <button onClick={() => setToast(null)}><X size={14} /></button>
        </div>
      )}
      <ProjectDeleteDialog
        open={project.deleteDialogOpen}
        deleting={project.deletingProject}
        projectName={project.projectName}
        onOpenChange={project.setDeleteDialogOpen}
        onConfirm={() => void project.deleteCurrentProject()}
      />
      {ai.controller && ai.open && (
        <AiGenerateModal
          open={ai.open}
          onClose={ai.close}
          controller={ai.controller}
          {...(ai.targetSlide ? { targetSlide: ai.targetSlide } : {})}
          onPrepareRun={ai.prepareRun}
          onFinished={ai.handleFinished}
          onActivity={ai.handleActivity}
        />
      )}
      <div className="mobile-blocker">
        <div className="brand-symbol"><span>F</span><i /></div>
        <h1>More room for great ideas.</h1>
        <p>
          Frameflow is a desktop studio. Open the editor on a larger screen to
          design your screens with precision.
        </p>
      </div>
    </div>
  )
}
