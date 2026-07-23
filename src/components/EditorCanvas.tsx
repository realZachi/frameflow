import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { photoMockups } from '../mockups/catalog'
import { clamp, getBackgroundPatternStyle, getBackgroundStyle } from '../utils'
import { AiCursorOverlay } from './AiCursorOverlay'
import { CanvasItem } from './CanvasElementView'
import { ChevronLeft, ChevronRight, Copy, Plus, Sparkles, Trash2 } from './icons'
import { Button } from './ui/button'
import type { CanvasElement, Slide } from '../types'

type AiActivity = { tool: string; slideId?: string; x?: number; y?: number; seq: number }

const DEFAULT_DRAG_MIN = -35
const DRAG_MAX = 97
const DEVICE_VISIBLE_EDGE = 3
const ARTBOARD_ASPECT_RATIO = 1290 / 2796

const getDragMinX = (element: CanvasElement) => element.type === 'device'
  ? Math.min(DEFAULT_DRAG_MIN, DEVICE_VISIBLE_EDGE - element.width)
  : DEFAULT_DRAG_MIN

const getDragMinY = (element: CanvasElement) => {
  if (element.type !== 'device') return DEFAULT_DRAG_MIN
  const height = element.width * ARTBOARD_ASPECT_RATIO / photoMockups[element.deviceStyle].canvasAspectRatio
  return Math.min(DEFAULT_DRAG_MIN, DEVICE_VISIBLE_EDGE - height)
}

type Interaction = {
  type: 'drag' | 'resize' | 'rotate'
  slideId: string
  element: CanvasElement
  elements: CanvasElement[]
  startX: number
  startY: number
  artboard: DOMRect
  selectionCenterX?: number
  selectionCenterY?: number
  centerX?: number
  centerY?: number
  startAngle?: number
}

type Props = {
  slides: Slide[]
  activeSlideId: string
  selectedElementIds: string[]
  exporting: boolean
  zoom: number
  aiActivity?: AiActivity | null
  onSetActiveSlide: (id: string) => void
  onSelectElement: (id: string | null, slideId?: string, additive?: boolean) => void
  onUpdateElements: (slideId: string, updates: { id: string; patch: Partial<CanvasElement> }[]) => void
  onCommitText: (slideId: string, id: string, patch: { text: string; html?: string }) => void
  onCheckpoint: () => void
  onAddSlide: () => void
  onDuplicateSlide: (id: string) => void
  onDeleteSlide: (id: string) => void
  onMoveSlide: (id: string, direction: -1 | 1) => void
  onEditSlideWithAi: (id: string) => void
  aiActionsDisabled?: boolean
}

export const EditorCanvas = ({
  slides,
  activeSlideId,
  selectedElementIds,
  exporting,
  zoom,
  aiActivity,
  onSetActiveSlide,
  onSelectElement,
  onUpdateElements,
  onCommitText,
  onCheckpoint,
  onAddSlide,
  onDuplicateSlide,
  onDeleteSlide,
  onMoveSlide,
  onEditSlideWithAi,
  aiActionsDisabled = false,
}: Props) => {
  const interaction = useRef<Interaction | null>(null)
  const [isInteracting, setIsInteracting] = useState(false)
  const [snapGuides, setSnapGuides] = useState<{ slideId: string; vertical: boolean; horizontal: boolean } | null>(null)

  const begin = (type: Interaction['type'], event: ReactPointerEvent, slideId: string, element: CanvasElement) => {
    event.preventDefault()
    event.stopPropagation()
    const artboardNode = event.currentTarget.closest('.artboard-export')
    if (!artboardNode) return
    const rect = artboardNode.getBoundingClientRect()
    const itemNode = event.currentTarget.closest('.canvas-item')
    const itemRect = itemNode?.getBoundingClientRect()
    const centerX = itemRect ? itemRect.left + itemRect.width / 2 : 0
    const centerY = itemRect ? itemRect.top + itemRect.height / 2 : 0
    const slide = slides.find((item) => item.id === slideId)
    const dragIds = type === 'drag' && (selectedElementIds.includes(element.id) || event.shiftKey)
      ? new Set([...selectedElementIds, element.id])
      : new Set([element.id])
    const elements = type === 'drag'
      ? (slide?.elements.filter((item) => dragIds.has(item.id) && !item.locked) ?? [element])
      : [element]
    const elementIds = new Set(elements.map((item) => item.id))
    const selectedRects = Array.from(artboardNode.querySelectorAll<HTMLElement>('[data-element-id]'))
      .filter((node) => elementIds.has(node.dataset['elementId'] ?? ''))
      .map((node) => node.getBoundingClientRect())
    const selectionBounds = selectedRects.length > 0
      ? {
          left: Math.min(...selectedRects.map((item) => item.left)),
          right: Math.max(...selectedRects.map((item) => item.right)),
          top: Math.min(...selectedRects.map((item) => item.top)),
          bottom: Math.max(...selectedRects.map((item) => item.bottom)),
        }
      : null
    interaction.current = {
      type,
      slideId,
      element,
      elements,
      startX: event.clientX,
      startY: event.clientY,
      artboard: rect,
      ...(selectionBounds
        ? {
            selectionCenterX: (
              (selectionBounds.left + selectionBounds.right) / 2 - rect.left
            ) / rect.width * 100,
            selectionCenterY: (
              (selectionBounds.top + selectionBounds.bottom) / 2 - rect.top
            ) / rect.height * 100,
          }
        : {}),
      centerX,
      centerY,
      startAngle: Math.atan2(event.clientY - centerY, event.clientX - centerX) * (180 / Math.PI),
    }
    onCheckpoint()
    setIsInteracting(true)
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const move = (event: ReactPointerEvent) => {
    const current = interaction.current
    if (!current) return
    event.preventDefault()
    const dx = ((event.clientX - current.startX) / current.artboard.width) * 100
    const dy = ((event.clientY - current.startY) / current.artboard.height) * 100

    if (current.type === 'drag') {
      const minDx = Math.max(...current.elements.map((item) => getDragMinX(item) - item.x))
      const maxDx = Math.min(...current.elements.map((item) => DRAG_MAX - item.x))
      const minDy = Math.max(...current.elements.map((item) => getDragMinY(item) - item.y))
      const maxDy = Math.min(...current.elements.map((item) => DRAG_MAX - item.y))
      let nextDx = clamp(dx, minDx, maxDx)
      let nextDy = clamp(dy, minDy, maxDy)
      const snapX = current.selectionCenterX !== undefined
        && Math.abs(current.selectionCenterX + nextDx - 50) <= 5 / current.artboard.width * 100
      const snapY = current.selectionCenterY !== undefined
        && Math.abs(current.selectionCenterY + nextDy - 50) <= 5 / current.artboard.height * 100

      if (snapX) nextDx = clamp(50 - (current.selectionCenterX ?? 50), minDx, maxDx)
      if (snapY) nextDy = clamp(50 - (current.selectionCenterY ?? 50), minDy, maxDy)
      setSnapGuides((previous) => {
        const next = snapX || snapY ? { slideId: current.slideId, vertical: snapX, horizontal: snapY } : null
        if (previous?.slideId === next?.slideId && previous?.vertical === next?.vertical && previous?.horizontal === next?.horizontal) return previous
        return next
      })
      onUpdateElements(current.slideId, current.elements.map((item) => ({
        id: item.id,
        patch: { x: item.x + nextDx, y: item.y + nextDy },
      })))
      return
    }

    if (current.type === 'resize') {
      onUpdateElements(current.slideId, [{
        id: current.element.id,
        patch: { width: clamp(current.element.width + dx, 8, 140) },
      }])
      return
    }

    const angle = Math.atan2(event.clientY - (current.centerY ?? 0), event.clientX - (current.centerX ?? 0)) * (180 / Math.PI)
    onUpdateElements(current.slideId, [{
      id: current.element.id,
      patch: { rotation: Math.round(current.element.rotation + angle - (current.startAngle ?? 0)) },
    }])
  }

  const end = (event: ReactPointerEvent) => {
    if (!interaction.current) return
    interaction.current = null
    setIsInteracting(false)
    setSnapGuides(null)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
  }

  return (
    <main
      className={`canvas-stage${isInteracting ? ' is-interacting' : ''}`}
      onPointerMove={move}
      onPointerUp={end}
      onPointerCancel={end}
    >
      <div className="stage-noise" />
      <div className="artboards" style={{ '--zoom': zoom } as React.CSSProperties}>
        {slides.map((slide, index) => {
          const isActive = slide.id === activeSlideId
          const isAiTarget = aiActivity?.slideId === slide.id
          const backgroundStyle = { ...getBackgroundStyle(slide.background), ...getBackgroundPatternStyle(slide.background) }
          const pattern = slide.background.pattern ?? 'none'
          return (
            <section className={`artboard-wrap${isActive ? ' is-active' : ''}${isAiTarget ? ' is-ai-target' : ''}`} key={slide.id}>
              <div className="artboard-actions">
                <span>{String(index + 1).padStart(2, '0')}</span>
                <strong>{slide.name}</strong>
                <div className="artboard-action-group">
                  <Button
                    className="artboard-ai-action"
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => onEditSlideWithAi(slide.id)}
                    disabled={aiActionsDisabled}
                    title={`${slide.name} mit AI bearbeiten`}
                    aria-label={`${slide.name} mit AI bearbeiten`}
                  >
                    <Sparkles size={13} />
                  </Button>
                  <div className="artboard-secondary-actions">
                    <button onClick={() => onDuplicateSlide(slide.id)} title="Screen duplizieren"><Copy size={13} /></button>
                    <button onClick={() => onMoveSlide(slide.id, -1)} disabled={index === 0} title="Nach links"><ChevronLeft size={14} /></button>
                    <button onClick={() => onMoveSlide(slide.id, 1)} disabled={index === slides.length - 1} title="Nach rechts"><ChevronRight size={14} /></button>
                    <button onClick={() => onDeleteSlide(slide.id)} disabled={slides.length === 1} title="Screen löschen"><Trash2 size={13} /></button>
                  </div>
                </div>
              </div>
              <div
                id={`artboard-${slide.id}`}
                className="artboard-export"
                style={{ backgroundColor: slide.background.color1 }}
                onPointerDown={() => {
                  onSetActiveSlide(slide.id)
                  onSelectElement(null)
                }}
              >
                <div className={`artboard-background pattern-surface pattern--${pattern}`} style={backgroundStyle} />
                {slide.elements.map((element) => (
                  <CanvasItem
                    key={element.id}
                    element={element}
                    selected={selectedElementIds.includes(element.id)}
                    showTransformHandles={selectedElementIds.length === 1}
                    exporting={exporting}
                    onSelect={(additive) => onSelectElement(element.id, slide.id, additive)}
                    onBeginDrag={(event, item) => begin('drag', event, slide.id, item)}
                    onBeginResize={(event, item) => begin('resize', event, slide.id, item)}
                    onBeginRotate={(event, item) => begin('rotate', event, slide.id, item)}
                    onCommitText={(patch) => onCommitText(slide.id, element.id, patch)}
                  />
                ))}
                {snapGuides?.slideId === slide.id && snapGuides.vertical && <div className="snap-guide snap-guide--vertical" data-editor-overlay aria-hidden="true" />}
                {snapGuides?.slideId === slide.id && snapGuides.horizontal && <div className="snap-guide snap-guide--horizontal" data-editor-overlay aria-hidden="true" />}
                {aiActivity?.slideId === slide.id && !exporting && <AiCursorOverlay activity={aiActivity} />}
              </div>
              <div className="artboard-size">1290 × 2796 px</div>
            </section>
          )
        })}
        <button className="add-artboard" onClick={onAddSlide}>
          <span><Plus size={20} /></span>
          <strong>Screen hinzufügen</strong>
          <small>Neues leeres Artboard</small>
        </button>
      </div>
    </main>
  )
}
