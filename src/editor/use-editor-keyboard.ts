import { useEffect } from 'react'
import type { CanvasElement, Slide } from '../types'

type ElementUpdate = {
  id: string
  patch: Partial<CanvasElement>
}

type EditorKeyboardOptions = {
  activeSlide: Slide
  selectedElementIds: string[]
  checkpoint: () => void
  updateElementsLive: (slideId: string, updates: ElementUpdate[]) => void
  undo: () => void
  redo: () => void
  deleteSelected: () => void
}

const arrowKeys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']

const isTypingTarget = (target: EventTarget | null) =>
  target instanceof HTMLElement
  && Boolean(target.closest('input, textarea, select, [contenteditable="true"]'))

const getArrowDelta = (event: KeyboardEvent) => {
  const step = event.shiftKey ? 10 : 1
  const dx = event.key === 'ArrowLeft' ? -step : event.key === 'ArrowRight' ? step : 0
  const dy = event.key === 'ArrowUp' ? -step : event.key === 'ArrowDown' ? step : 0
  return {
    x: dx / 330 * 100,
    y: dy / (330 * 2796 / 1290) * 100,
  }
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

export function useEditorKeyboard({
  activeSlide,
  selectedElementIds,
  checkpoint,
  updateElementsLive,
  undo,
  redo,
  deleteSelected,
}: EditorKeyboardOptions) {
  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) return

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault()
        if (event.shiftKey) redo()
        else undo()
        return
      }
      if (event.key === 'Delete' || event.key === 'Backspace') {
        deleteSelected()
        return
      }
      if (selectedElementIds.length === 0 || !arrowKeys.includes(event.key)) return

      event.preventDefault()
      const updates = getNudgeUpdates(
        activeSlide.elements,
        selectedElementIds,
        getArrowDelta(event),
      )
      if (updates.length === 0) return
      if (!event.repeat) checkpoint()
      updateElementsLive(activeSlide.id, updates)
    }

    window.addEventListener('keydown', handleKeydown)
    return () => window.removeEventListener('keydown', handleKeydown)
  }, [
    activeSlide,
    checkpoint,
    deleteSelected,
    redo,
    selectedElementIds,
    undo,
    updateElementsLive,
  ])
}
