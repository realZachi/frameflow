import { useLayoutEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react'
import { LockKeyhole } from 'lucide-react'
import type { CanvasElement } from '../types'
import { photoMockups, type PhotoMockupDefinition } from '../mockups/catalog'

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
      if (Math.abs(augmented[row][column]) > Math.abs(augmented[pivot][column])) pivot = row
    }
    ;[augmented[column], augmented[pivot]] = [augmented[pivot], augmented[column]]
    const divisor = augmented[column][column]
    if (Math.abs(divisor) < 1e-10) return null
    for (let item = column; item <= size; item += 1) augmented[column][item] /= divisor
    for (let row = 0; row < size; row += 1) {
      if (row === column) continue
      const factor = augmented[row][column]
      for (let item = column; item <= size; item += 1) augmented[row][item] -= factor * augmented[column][item]
    }
  }

  return augmented.map((row) => row[size])
}

const perspectiveMatrix = (width: number, height: number, definition: PhotoMockupDefinition) => {
  const sourceWidth = 139.2
  const sourceHeight = sourceWidth / definition.sourceAspectRatio
  const source = [[0, 0], [sourceWidth, 0], [sourceWidth, sourceHeight], [0, sourceHeight]]
  const target = definition.screenQuad.map((point) => [point.x * width, point.y * height])
  const equations: number[][] = []
  const values: number[] = []

  for (let index = 0; index < 4; index += 1) {
    const [x, y] = source[index]
    const [targetX, targetY] = target[index]
    equations.push([x, y, 1, 0, 0, 0, -targetX * x, -targetX * y])
    values.push(targetX)
    equations.push([0, 0, 0, x, y, 1, -targetY * x, -targetY * y])
    values.push(targetY)
  }

  const solved = solveLinearSystem(equations, values)
  if (!solved) return { transform: 'none', sourceWidth, sourceHeight }
  const [a, b, c, d, e, f, g, h] = solved
  return {
    transform: `matrix3d(${a},${d},0,${g},${b},${e},0,${h},0,0,1,0,${c},${f},0,1)`,
    sourceWidth,
    sourceHeight,
  }
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

  return (
    <div ref={containerRef} className="photo-mockup" style={{ aspectRatio: definition.canvasAspectRatio }}>
      {size.width > 0 && (
        <div
          className="photo-mockup-screen"
          style={{ width: mapping.sourceWidth, height: mapping.sourceHeight, transform: mapping.transform }}
        >
          {element.screenshot
            ? <img src={element.screenshot} alt="Eingefügter App-Screenshot" draggable={false} />
            : <FakeScreen theme={element.screenTheme} />}
        </div>
      )}
      <img className="photo-mockup-overlay" src={definition.overlay} alt="Gekipptes Smartphone in einer Hand" draggable={false} />
    </div>
  )
}

export const DeviceMockup = ({ element }: { element: Extract<CanvasElement, { type: 'device' }> }) => {
  const photoDefinition = photoMockups[element.deviceStyle]
  if (photoDefinition) return <PhotoMockup element={element} definition={photoDefinition} />

  const style = {
    '--tilt-x': `${element.tiltX}deg`,
    '--tilt-y': `${element.tiltY}deg`,
    '--device-shadow': `${element.shadow / 100}`,
  } as CSSProperties

  return (
    <div className={`device-perspective device-${element.deviceStyle}`} style={style}>
      <div className="device-shell">
        <div className="device-side device-side--left" />
        <div className="device-side device-side--right" />
        <div className="device-screen">
          {element.screenshot ? <img src={element.screenshot} alt="Eingefügter App-Screenshot" draggable={false} /> : <FakeScreen theme={element.screenTheme} />}
        </div>
        <div className="dynamic-island" />
        <div className="device-glint" />
      </div>
    </div>
  )
}

export const ElementContent = ({ element }: { element: CanvasElement }) => {
  if (element.type === 'text') {
    return (
      <div
        className="canvas-text"
        style={{
          color: element.color,
          fontFamily: element.fontFamily,
          fontSize: element.fontSize,
          fontWeight: element.fontWeight,
          fontStyle: element.italic ? 'italic' : 'normal',
          textAlign: element.align,
          lineHeight: element.lineHeight,
          letterSpacing: element.letterSpacing,
        }}
      >
        {element.text}
      </div>
    )
  }

  if (element.type === 'device') return <DeviceMockup element={element} />

  if (element.type === 'image') {
    return <img className="canvas-image" src={element.src} alt="Hochgeladenes Motiv" draggable={false} style={{ borderRadius: `${element.borderRadius}%` }} />
  }

  if (element.shape === 'spark') {
    return <div className="shape-spark" style={{ color: element.color }}>✦</div>
  }

  return <div className={`shape shape--${element.shape}`} style={{ background: element.color }} />
}

type CanvasItemProps = {
  element: CanvasElement
  selected: boolean
  exporting: boolean
  onSelect: () => void
  onBeginDrag: (event: ReactPointerEvent, element: CanvasElement) => void
  onBeginResize: (event: ReactPointerEvent, element: CanvasElement) => void
  onBeginRotate: (event: ReactPointerEvent, element: CanvasElement) => void
}

export const CanvasItem = ({ element, selected, exporting, onSelect, onBeginDrag, onBeginResize, onBeginRotate }: CanvasItemProps) => {
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
      className={`canvas-item canvas-item--${element.type}${selected && !exporting ? ' is-selected' : ''}${element.locked ? ' is-locked' : ''}`}
      style={style}
      onPointerDown={(event) => {
        event.stopPropagation()
        onSelect()
        if (!element.locked) onBeginDrag(event, element)
      }}
      data-element-id={element.id}
    >
      <ElementContent element={element} />
      {selected && !exporting && (
        <div className="selection-frame" aria-hidden="true">
          {element.locked ? (
            <span className="lock-indicator"><LockKeyhole size={12} /></span>
          ) : (
            <>
              <button className="resize-handle resize-handle--nw" onPointerDown={(e) => onBeginResize(e, element)} tabIndex={-1} />
              <button className="resize-handle resize-handle--ne" onPointerDown={(e) => onBeginResize(e, element)} tabIndex={-1} />
              <button className="resize-handle resize-handle--sw" onPointerDown={(e) => onBeginResize(e, element)} tabIndex={-1} />
              <button className="resize-handle resize-handle--se" onPointerDown={(e) => onBeginResize(e, element)} tabIndex={-1} />
              <button className="rotate-handle" onPointerDown={(e) => onBeginRotate(e, element)} tabIndex={-1}><span /></button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
