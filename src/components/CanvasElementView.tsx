import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { photoMockups, type PhotoMockupDefinition } from '../mockups/catalog'
import { hexToRgba, richTextHasFormatting, richTextToPlain, sanitizeRichText } from '../utils'
import { Bold, Italic, LockKeyhole, Underline } from './icons'
import { ShapeGraphic } from './ShapeGraphic'
import type { CanvasElement } from '../types'

const FakeScreen = ({ theme }: { theme: Extract<CanvasElement, { type: 'device' }>['screenTheme'] }) => (
  <div className={`fake-screen fake-screen--${theme}`}>
    <div className="fake-status"><span>9:41</span><span>● ● ◒</span></div>
    <div className="fake-appbar"><span className="fake-avatar" /><strong>Northstar</strong><span className="fake-more">•••</span></div>
    <div className="fake-hero">
      <span className="fake-kicker">WEEKLY FOCUS</span>
      <strong>{theme === 'night' ? 'Move with intention.' : theme === 'sun' ? 'Your day, at a glance.' : theme === 'mint' ? 'Calm starts here.' : 'Make space for joy.'}</strong>
      <span className="fake-chip">Explore now →</span>
    </div>
    <div className="fake-section-title"><strong>Made for you</strong><span>See all</span></div>
    <div className="fake-cards">
      <span /><span /><span />
    </div>
    <div className="fake-stat-row">
      <div><small>PROGRESS</small><b>84%</b></div>
      <div><small>STREAK</small><b>12d</b></div>
    </div>
    <div className="fake-tabs"><span>⌂</span><span>◇</span><span>＋</span><span>◎</span></div>
  </div>
)

const solveLinearSystem = (matrix: number[][], vector: number[]) => {
  const size = vector.length
  const augmented = matrix.map((row, index) => [...row, vector[index]])

  for (let column = 0; column < size; column += 1) {
    let pivot = column
    for (let row = column + 1; row < size; row += 1) {
      const candidate = augmented[row]?.[column] ?? 0
      const currentPivot = augmented[pivot]?.[column] ?? 0
      if (Math.abs(candidate) > Math.abs(currentPivot)) pivot = row
    }
    const columnRow = augmented[column]
    const pivotRow = augmented[pivot]
    if (!columnRow || !pivotRow) return null
    augmented[column] = pivotRow
    augmented[pivot] = columnRow
    const activeRow = pivotRow
    const divisor = activeRow[column]
    if (divisor === undefined) return null
    if (Math.abs(divisor) < 1e-10) return null
    for (let item = column; item <= size; item += 1) {
      activeRow[item] = (activeRow[item] ?? 0) / divisor
    }
    for (let row = 0; row < size; row += 1) {
      if (row === column) continue
      const targetRow = augmented[row]
      if (!targetRow) return null
      const factor = targetRow[column] ?? 0
      for (let item = column; item <= size; item += 1) {
        targetRow[item] = (targetRow[item] ?? 0) - factor * (activeRow[item] ?? 0)
      }
    }
  }

  return augmented.map((row) => row[size] ?? 0)
}

const perspectiveMatrix = (width: number, height: number, definition: PhotoMockupDefinition) => {
  const sourceWidth = 139.2
  const sourceHeight = sourceWidth / definition.sourceAspectRatio
  const source: [number, number][] = [
    [0, 0],
    [sourceWidth, 0],
    [sourceWidth, sourceHeight],
    [0, sourceHeight],
  ]
  const target: [number, number][] = definition.screenQuad.map(
    (point) => [point.x * width, point.y * height],
  )
  const equations: number[][] = []
  const values: number[] = []

  for (let index = 0; index < 4; index += 1) {
    const sourcePoint = source[index]
    const targetPoint = target[index]
    if (!sourcePoint || !targetPoint) {
      return { transform: 'none', sourceWidth, sourceHeight }
    }
    const [x, y] = sourcePoint
    const [targetX, targetY] = targetPoint
    equations.push([x, y, 1, 0, 0, 0, -targetX * x, -targetX * y])
    values.push(targetX)
    equations.push([0, 0, 0, x, y, 1, -targetY * x, -targetY * y])
    values.push(targetY)
  }

  const solved = solveLinearSystem(equations, values)
  if (!solved) return { transform: 'none', sourceWidth, sourceHeight }
  const [a = 0, b = 0, c = 0, d = 0, e = 0, f = 0, g = 0, h = 0] = solved
  return {
    transform: `matrix3d(${a},${d},0,${g},${b},${e},0,${h},0,0,1,0,${c},${f},0,1)`,
    sourceWidth,
    sourceHeight,
  }
}

const runRichTextCommand = (command: string, value?: string) => {
  // execCommand is the only browser API that preserves an arbitrary
  // contenteditable selection while applying inline formatting.
  // eslint-disable-next-line @typescript-eslint/no-deprecated
  document.execCommand(command, false, value)
}

const PhotoMockup = ({ element, definition }: { element: Extract<CanvasElement, { type: 'device' }>; definition: PhotoMockupDefinition }) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })

  useLayoutEffect(() => {
    const node = containerRef.current
    if (!node) return
    const updateSize = () => setSize({ width: node.clientWidth, height: node.clientHeight })
    updateSize()
    const observer = new ResizeObserver(updateSize)
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  const mapping = perspectiveMatrix(size.width, size.height, definition)
  const screenClip = definition.screenMask
    ? `inset(${definition.screenMask.top * mapping.sourceHeight}px ${definition.screenMask.right * mapping.sourceWidth}px ${definition.screenMask.bottom * mapping.sourceHeight}px ${definition.screenMask.left * mapping.sourceWidth}px round ${definition.screenMask.cornerRadius * mapping.sourceWidth}px)`
    : undefined

  return (
    <div ref={containerRef} className="photo-mockup" style={{ aspectRatio: definition.canvasAspectRatio }}>
      {size.width > 0 && (
        <div
          className="photo-mockup-screen"
          style={{ width: mapping.sourceWidth, height: mapping.sourceHeight, transform: mapping.transform, clipPath: screenClip }}
        >
          {element.screenshot
            ? <img src={element.screenshot} alt="Inserted app screenshot" draggable={false} />
            : <FakeScreen theme={element.screenTheme} />}
        </div>
      )}
      <img className="photo-mockup-overlay" src={definition.overlay} alt="Photorealistic iPhone mockup" draggable={false} />
    </div>
  )
}

export const DeviceMockup = ({ element }: { element: Extract<CanvasElement, { type: 'device' }> }) => {
  const photoDefinition = photoMockups[element.deviceStyle]
  return <PhotoMockup element={element} definition={photoDefinition} />
}

const getTextElementStyle = (element: Extract<CanvasElement, { type: 'text' }>): CSSProperties => {
  const decoration = [element.underline ? 'underline' : '', element.strikethrough ? 'line-through' : ''].filter(Boolean).join(' ')
  const shadow = element.shadow ?? 0
  return {
    color: element.color,
    fontFamily: element.fontFamily,
    fontSize: element.fontSize,
    fontWeight: element.fontWeight,
    fontStyle: element.italic ? 'italic' : 'normal',
    textAlign: element.align,
    lineHeight: element.lineHeight,
    letterSpacing: element.letterSpacing,
    textDecorationLine: decoration || 'none',
    textTransform: element.textTransform ?? 'none',
    backgroundColor: hexToRgba(element.backgroundColor ?? '#ffffff', element.backgroundOpacity ?? 0),
    padding: `${element.padding ?? 0}px`,
    borderRadius: `${element.borderRadius ?? 0}px`,
    WebkitTextStroke: `${element.strokeWidth ?? 0}px ${element.strokeColor ?? '#111116'}`,
    textShadow: shadow > 0
      ? `0 ${Math.max(1, shadow * 0.035)}px ${Math.max(2, shadow * 0.12)}px ${hexToRgba(element.shadowColor ?? '#000000', Math.min(0.65, shadow * 0.0065))}`
      : 'none',
  }
}

const escapeHtml = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const textToSeedHtml = (element: Extract<CanvasElement, { type: 'text' }>) =>
  element.html ?? escapeHtml(element.text).replace(/\n/g, '<br>')

export const ElementContent = ({ element }: { element: CanvasElement }) => {
  if (element.type === 'text') {
    const style = getTextElementStyle(element)
    if (element.html) {
      return <div className="canvas-text" style={style} dangerouslySetInnerHTML={{ __html: element.html }} />
    }
    return <div className="canvas-text" style={style}>{element.text}</div>
  }

  if (element.type === 'device') return <DeviceMockup element={element} />

  if (element.type === 'image') {
    const shadow = element.shadow ?? 32
    return (
      <img
        className="canvas-image"
        src={element.src}
        alt="Uploaded image"
        draggable={false}
        style={{
          borderRadius: `${element.borderRadius}%`,
          boxShadow: shadow > 0 ? `0 ${shadow * 0.28}px ${shadow * 0.7}px rgba(0, 0, 0, ${Math.min(0.42, shadow * 0.006)})` : 'none',
        }}
      />
    )
  }

  return <ShapeGraphic element={element} />
}

type CanvasItemProps = {
  element: CanvasElement
  selected: boolean
  showTransformHandles: boolean
  exporting: boolean
  onSelect: (additive: boolean) => void
  onBeginDrag: (event: ReactPointerEvent, element: CanvasElement) => void
  onBeginResize: (event: ReactPointerEvent, element: CanvasElement) => void
  onBeginRotate: (event: ReactPointerEvent, element: CanvasElement) => void
  onCommitText: (patch: { text: string; html?: string }) => void
}

export const CanvasItem = ({ element, selected, showTransformHandles, exporting, onSelect, onBeginDrag, onBeginResize, onBeginRotate, onCommitText }: CanvasItemProps) => {
  const [editing, setEditing] = useState(false)
  const editableRef = useRef<HTMLDivElement>(null)
  const committedRef = useRef(false)
  const savedSelectionRef = useRef<Range | null>(null)

  useEffect(() => {
    if (!editing || element.type !== 'text') return
    const node = editableRef.current
    if (!node) return
    node.innerHTML = textToSeedHtml(element)
    committedRef.current = false
    node.focus()
    const selection = document.getSelection()
    if (selection) {
      const range = document.createRange()
      range.selectNodeContents(node)
      selection.removeAllRanges()
      selection.addRange(range)
    }
    // Seed content only when entering edit mode; the div stays uncontrolled while editing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing])

  const commitEdit = () => {
    if (committedRef.current) return
    committedRef.current = true
    const node = editableRef.current
    setEditing(false)
    if (!node) return
    const sanitized = sanitizeRichText(node.innerHTML)
    const plain = richTextToPlain(sanitized)
    if (plain.trim().length === 0) return
    onCommitText({
      text: plain,
      ...(richTextHasFormatting(sanitized) ? { html: sanitized } : {}),
    })
  }

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      commitEdit()
    }
  }

  const saveSelection = () => {
    const selection = document.getSelection()
    if (selection && selection.rangeCount > 0) savedSelectionRef.current = selection.getRangeAt(0).cloneRange()
  }

  const restoreSelection = () => {
    const selection = document.getSelection()
    if (selection && savedSelectionRef.current) {
      selection.removeAllRanges()
      selection.addRange(savedSelectionRef.current)
    }
  }

  const style: CSSProperties = {
    left: `${element.x}%`,
    top: `${element.y}%`,
    width: `${element.width}%`,
    opacity: element.opacity,
    transform: `rotate(${element.rotation}deg)`,
    zIndex: selected ? 80 : undefined,
  }

  return (
    <div
      className={`canvas-item canvas-item--${element.type}${selected && !exporting ? ' is-selected' : ''}${element.locked ? ' is-locked' : ''}${editing ? ' is-editing-text' : ''}`}
      style={style}
      onPointerDown={(event) => {
        event.stopPropagation()
        if (editing) return
        onSelect(event.shiftKey)
        if (!element.locked && !(event.shiftKey && selected)) onBeginDrag(event, element)
      }}
      onDoubleClick={() => {
        if (element.type !== 'text' || element.locked || exporting) return
        setEditing(true)
      }}
      onBlur={(event) => {
        // Focus moving to the toolbar (e.g. the color input) must not end the edit session.
        if (!editing || event.currentTarget.contains(event.relatedTarget)) return
        commitEdit()
      }}
      data-element-id={element.id}
    >
      {editing && element.type === 'text'
        ? (
            <div
              ref={editableRef}
              className="canvas-text"
              style={getTextElementStyle(element)}
              contentEditable
              suppressContentEditableWarning
              data-editing="true"
              onKeyDown={handleKeyDown}
            />
          )
        : (
            <ElementContent element={element} />
          )}
      {editing && element.type === 'text' && !exporting && (
        <div className="text-edit-toolbar" role="toolbar" aria-label="Text formatting" onPointerDown={(event) => event.stopPropagation()}>
          <input
            type="color"
            defaultValue={element.color}
            title="Text color"
            onPointerDown={(event) => {
              event.stopPropagation()
              saveSelection()
            }}
            onChange={(event) => {
              editableRef.current?.focus()
              restoreSelection()
              runRichTextCommand('styleWithCSS', 'true')
              runRichTextCommand('foreColor', event.target.value)
            }}
          />
          <button
            onPointerDown={(event) => {
              event.preventDefault()
              event.stopPropagation()
            }}
            onClick={(event) => {
              event.stopPropagation()
              runRichTextCommand('styleWithCSS', 'false')
              runRichTextCommand('bold')
            }}
            title="Bold"
          >
            <Bold size={13} />
          </button>
          <button
            onPointerDown={(event) => {
              event.preventDefault()
              event.stopPropagation()
            }}
            onClick={(event) => {
              event.stopPropagation()
              runRichTextCommand('styleWithCSS', 'false')
              runRichTextCommand('italic')
            }}
            title="Italic"
          >
            <Italic size={13} />
          </button>
          <button
            onPointerDown={(event) => {
              event.preventDefault()
              event.stopPropagation()
            }}
            onClick={(event) => {
              event.stopPropagation()
              runRichTextCommand('styleWithCSS', 'false')
              runRichTextCommand('underline')
            }}
            title="Underline"
          >
            <Underline size={13} />
          </button>
        </div>
      )}
      {selected && !exporting && !editing && (
        <div className={`selection-frame${showTransformHandles ? '' : ' selection-frame--group'}`} aria-hidden="true">
          {element.locked
            ? (
                <span className="lock-indicator"><LockKeyhole size={12} /></span>
              )
            : showTransformHandles
              ? (
                  <>
                    <button className="resize-handle resize-handle--nw" onPointerDown={(e) => onBeginResize(e, element)} tabIndex={-1} />
                    <button className="resize-handle resize-handle--ne" onPointerDown={(e) => onBeginResize(e, element)} tabIndex={-1} />
                    <button className="resize-handle resize-handle--sw" onPointerDown={(e) => onBeginResize(e, element)} tabIndex={-1} />
                    <button className="resize-handle resize-handle--se" onPointerDown={(e) => onBeginResize(e, element)} tabIndex={-1} />
                    <button className="rotate-handle" onPointerDown={(e) => onBeginRotate(e, element)} tabIndex={-1}><span /></button>
                  </>
                )
              : null}
        </div>
      )}
    </div>
  )
}
