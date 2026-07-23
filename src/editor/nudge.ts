import type { CanvasElement } from '../types'

export type ElementUpdate = {
  id: string
  patch: Partial<CanvasElement>
}

export const getNudgeUpdates = (
  elements: CanvasElement[],
  selectedElementIds: string[],
  delta: { x: number; y: number },
): ElementUpdate[] => {
  const selectedIds = new Set(selectedElementIds)
  const movable = elements.filter((element) => selectedIds.has(element.id) && !element.locked)
  if (movable.length === 0) return []

  const minX = Math.max(...movable.map((element) => -35 - element.x))
  const maxX = Math.min(...movable.map((element) => 97 - element.x))
  const minY = Math.max(...movable.map((element) => -35 - element.y))
  const maxY = Math.min(...movable.map((element) => 97 - element.y))
  const x = Math.max(minX, Math.min(maxX, delta.x))
  const y = Math.max(minY, Math.min(maxY, delta.y))

  return movable.map((element) => ({
    id: element.id,
    patch: {
      x: element.x + x,
      y: element.y + y,
    },
  }))
}
