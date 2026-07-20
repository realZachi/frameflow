export type ElementBox = {
  elementId: string
  x: number
  y: number
  width: number
  height: number
}

export type SlideMeasurement = {
  slideId: string
  boxes: ElementBox[]
  warnings: string[]
}

export async function settleFrames(): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, 0))
  await new Promise<void>((resolve) => {
    let done = false
    const finish = () => {
      if (done) return
      done = true
      resolve()
    }
    requestAnimationFrame(() => requestAnimationFrame(finish))
    // rAF stalls in background tabs; never let a tool call hang on it.
    setTimeout(finish, 250)
  })
}

const EDGE_TOLERANCE = 0.5
const OVERLAP_RATIO_THRESHOLD = 0.12

const textOverflowWarnings = (box: ElementBox): string[] => {
  const warnings: string[] = []
  const right = box.x + box.width
  const bottom = box.y + box.height

  if (box.x < -EDGE_TOLERANCE) {
    warnings.push(`Text ${box.elementId} overflows the left canvas edge by ${(-box.x).toFixed(1)}% — reduce fontSize, shorten the copy, or reposition.`)
  }
  if (box.y < -EDGE_TOLERANCE) {
    warnings.push(`Text ${box.elementId} overflows the top canvas edge by ${(-box.y).toFixed(1)}% — reduce fontSize, shorten the copy, or reposition.`)
  }
  if (right > 100 + EDGE_TOLERANCE) {
    warnings.push(`Text ${box.elementId} overflows the right canvas edge by ${(right - 100).toFixed(1)}% — reduce fontSize, shorten the copy, or reposition.`)
  }
  if (bottom > 100 + EDGE_TOLERANCE) {
    warnings.push(`Text ${box.elementId} overflows the bottom canvas edge by ${(bottom - 100).toFixed(1)}% — reduce fontSize, shorten the copy, or reposition.`)
  }
  return warnings
}

// Only warn when at least one side is text and both sides are text/device — shape and image
// overlaps are usually intentional design (e.g. a shape peeking out from behind a device).
const canWarnAboutOverlap = (typeA: string, typeB: string): boolean => {
  const isTextOrDevice = (type: string) => type === 'text' || type === 'device'
  return (typeA === 'text' || typeB === 'text') && isTextOrDevice(typeA) && isTextOrDevice(typeB)
}

const overlapWarning = (boxA: ElementBox, typeA: string, boxB: ElementBox, typeB: string): string | null => {
  if (!canWarnAboutOverlap(typeA, typeB)) return null

  const left = Math.max(boxA.x, boxB.x)
  const right = Math.min(boxA.x + boxA.width, boxB.x + boxB.width)
  const top = Math.max(boxA.y, boxB.y)
  const bottom = Math.min(boxA.y + boxA.height, boxB.y + boxB.height)
  if (right <= left || bottom <= top) return null

  const intersectionArea = (right - left) * (bottom - top)
  const areaA = boxA.width * boxA.height
  const areaB = boxB.width * boxB.height
  const smallerArea = Math.min(areaA, areaB)
  if (smallerArea <= 0) return null

  const ratio = intersectionArea / smallerArea
  if (ratio <= OVERLAP_RATIO_THRESHOLD) return null

  // Always phrase the warning from the text element's perspective; if both are text, keep encounter order.
  const [textBox, otherBox, otherType] = typeA === 'text' ? [boxA, boxB, typeB] : [boxB, boxA, typeA]
  const base = `Text ${textBox.elementId} overlaps ${otherType} ${otherBox.elementId} by ${(ratio * 100).toFixed(1)}% of the smaller element`
  if (otherType === 'device') {
    return `${base} — fine if this is a deliberate text-over-device composition; confirm legibility in the rendered preview, otherwise reposition.`
  }
  return `${base} — overlapping text is almost always a defect; reposition or resize.`
}

export function measureSlideSync(slideId: string, elementTypes: Record<string, string>): SlideMeasurement | null {
  const artboard = document.getElementById(`artboard-${slideId}`)
  if (!artboard) return null

  const artboardRect = artboard.getBoundingClientRect()
  const nodes = artboard.querySelectorAll<HTMLElement>('[data-element-id]')

  const boxes: ElementBox[] = []
  nodes.forEach((node) => {
    const elementId = node.dataset.elementId
    if (!elementId) return
    const rect = node.getBoundingClientRect()
    boxes.push({
      elementId,
      x: ((rect.left - artboardRect.left) / artboardRect.width) * 100,
      y: ((rect.top - artboardRect.top) / artboardRect.height) * 100,
      width: (rect.width / artboardRect.width) * 100,
      height: (rect.height / artboardRect.height) * 100,
    })
  })

  const warnings: string[] = []
  for (const box of boxes) {
    if (elementTypes[box.elementId] === 'text') warnings.push(...textOverflowWarnings(box))
  }
  for (let i = 0; i < boxes.length; i += 1) {
    for (let j = i + 1; j < boxes.length; j += 1) {
      const boxA = boxes[i]
      const boxB = boxes[j]
      const typeA = elementTypes[boxA.elementId]
      const typeB = elementTypes[boxB.elementId]
      if (!typeA || !typeB) continue
      const warning = overlapWarning(boxA, typeA, boxB, typeB)
      if (warning) warnings.push(warning)
    }
  }

  return { slideId, boxes, warnings }
}

export async function measureSlide(slideId: string, elementTypes: Record<string, string>): Promise<SlideMeasurement | null> {
  await settleFrames()
  return measureSlideSync(slideId, elementTypes)
}
