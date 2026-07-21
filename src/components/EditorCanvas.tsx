import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { ChevronLeft, ChevronRight, Copy, Plus, Trash2 } from './icons'
import type { CanvasElement, Slide } from '../types'
import { clamp, getBackgroundPatternStyle, getBackgroundStyle } from '../utils'
import { CanvasItem } from './CanvasElementView'
import { AiCursorOverlay } from './AiCursorOverlay'

type AiActivity = { tool: string; slideId?: string; x?: number; y?: number; seq: number }

type Interaction = {
  type: 'drag' | 'resize' | 'rotate'
  slideId: string
  element: CanvasElement
  startX: number
  startY: number
  artboard: DOMRect
  centerX?: number
  centerY?: number
  startAngle?: number
}

type Props = {
  slides: Slide[]
  activeSlideId: string
  selectedElementId: string | null
  exporting: boolean
  zoom: number
  aiActivity?: AiActivity | null
  onSetActiveSlide: (id: string) => void
  onSelectElement: (id: string | null, slideId?: string) => void
  onUpdateElement: (slideId: string, id: string, patch: Partial<CanvasElement>) => void
  onCommitText: (slideId: string, id: string, patch: { text: string; html?: string }) => void
  onCheckpoint: () => void
  onAddSlide: () => void
  onDuplicateSlide: (id: string) => void
  onDeleteSlide: (id: string) => void
  onMoveSlide: (id: string, direction: -1 | 1) => void
}

export const EditorCanvas = ({
  slides,
  activeSlideId,
  selectedElementId,
  exporting,
  zoom,
  aiActivity,
  onSetActiveSlide,
  onSelectElement,
  onUpdateElement,
  onCommitText,
  onCheckpoint,
  onAddSlide,
  onDuplicateSlide,
  onDeleteSlide,
  onMoveSlide,
}: Props) => {
  const interaction = useRef<Interaction | null>(null)
  const [isInteracting, setIsInteracting] = useState(false)

  const begin = (type: Interaction['type'], event: ReactPointerEvent, slideId: string, element: CanvasElement) => {
    event.preventDefault()
    event.stopPropagation()
    const artboardNode = event.currentTarget.closest('.artboard-export') as HTMLElement | null
    if (!artboardNode) return
    const rect = artboardNode.getBoundingClientRect()
    const itemNode = event.currentTarget.closest('.canvas-item') as HTMLElement | null
    const itemRect = itemNode?.getBoundingClientRect()
    const centerX = itemRect ? itemRect.left + itemRect.width / 2 : 0
    const centerY = itemRect ? itemRect.top + itemRect.height / 2 : 0
    interaction.current = {
      type,
      slideId,
      element,
      startX: event.clientX,
      startY: event.clientY,
      artboard: rect,
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
      onUpdateElement(current.slideId, current.element.id, {
        x: clamp(current.element.x + dx, -35, 97),
        y: clamp(current.element.y + dy, -35, 97),
      })
      return
    }

    if (current.type === 'resize') {
      onUpdateElement(current.slideId, current.element.id, {
        width: clamp(current.element.width + dx, 8, 140),
      })
      return
    }

    const angle = Math.atan2(event.clientY - (current.centerY ?? 0), event.clientX - (current.centerX ?? 0)) * (180 / Math.PI)
    onUpdateElement(current.slideId, current.element.id, {
      rotation: Math.round(current.element.rotation + angle - (current.startAngle ?? 0)),
    })
  }

  const end = (event: ReactPointerEvent) => {
    if (!interaction.current) return
    interaction.current = null
    setIsInteracting(false)
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
                <div>
                  <button onClick={() => onDuplicateSlide(slide.id)} title="Screen duplizieren"><Copy size={13} /></button>
                  <button onClick={() => onMoveSlide(slide.id, -1)} disabled={index === 0} title="Nach links"><ChevronLeft size={14} /></button>
                  <button onClick={() => onMoveSlide(slide.id, 1)} disabled={index === slides.length - 1} title="Nach rechts"><ChevronRight size={14} /></button>
                  <button onClick={() => onDeleteSlide(slide.id)} disabled={slides.length === 1} title="Screen löschen"><Trash2 size={13} /></button>
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
                    selected={selectedElementId === element.id}
                    exporting={exporting}
                    onSelect={() => onSelectElement(element.id, slide.id)}
                    onBeginDrag={(event, item) => begin('drag', event, slide.id, item)}
                    onBeginResize={(event, item) => begin('resize', event, slide.id, item)}
                    onBeginRotate={(event, item) => begin('rotate', event, slide.id, item)}
                    onCommitText={(patch) => onCommitText(slide.id, element.id, patch)}
                  />
                ))}
                {aiActivity && aiActivity.slideId === slide.id && !exporting && <AiCursorOverlay activity={aiActivity} />}
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
