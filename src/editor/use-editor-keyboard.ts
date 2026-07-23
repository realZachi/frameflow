import { useEffect } from 'react'
import { getNudgeUpdates, type ElementUpdate } from './nudge'
import type { Slide } from '../types'

type EditorKeyboardOptions = {
  activeSlide: Slide | undefined
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
      if (!activeSlide) return

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
