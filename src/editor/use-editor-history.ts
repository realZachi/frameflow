import { useCallback, useRef, useState, type Dispatch, type RefObject, type SetStateAction } from 'react'
import type { CanvasElement, Slide } from '../types'

type ElementUpdate = {
  id: string
  patch: Partial<CanvasElement>
}

type EditorHistoryOptions = {
  setSlides: Dispatch<SetStateAction<Slide[]>>
  slidesRef: RefObject<Slide[]>
  clearSelection: () => void
}

const mergeElement = (
  element: CanvasElement,
  patch: Partial<CanvasElement>,
): CanvasElement => ({ ...element, ...patch } as CanvasElement)

export function useEditorHistory({
  setSlides,
  slidesRef,
  clearSelection,
}: EditorHistoryOptions) {
  const past = useRef<Slide[][]>([])
  const future = useRef<Slide[][]>([])
  const [historyState, setHistoryState] = useState({ undo: false, redo: false })

  const commit = useCallback((updater: (current: Slide[]) => Slide[]) => {
    const current = slidesRef.current
    const next = updater(current)
    if (next === current) return

    past.current = [...past.current.slice(-39), current]
    future.current = []
    slidesRef.current = next
    setSlides(next)
    setHistoryState({ undo: true, redo: false })
  }, [setSlides, slidesRef])

  const checkpoint = useCallback(() => {
    past.current = [...past.current.slice(-39), slidesRef.current]
    future.current = []
    setHistoryState({ undo: true, redo: false })
  }, [slidesRef])

  const updateElementsLive = useCallback((slideId: string, updates: ElementUpdate[]) => {
    const updatesById = new Map(updates.map((update) => [update.id, update.patch]))
    setSlides((current) => {
      const next = current.map((slide) => {
        if (slide.id !== slideId) return slide
        return {
          ...slide,
          elements: slide.elements.map((element) => {
            const patch = updatesById.get(element.id)
            return patch ? mergeElement(element, patch) : element
          }),
        }
      })
      slidesRef.current = next
      return next
    })
  }, [setSlides, slidesRef])

  const undo = useCallback(() => {
    const previous = past.current.at(-1)
    if (!previous) return

    past.current = past.current.slice(0, -1)
    future.current = [slidesRef.current, ...future.current].slice(0, 40)
    slidesRef.current = previous
    setSlides(previous)
    clearSelection()
    setHistoryState({ undo: past.current.length > 0, redo: future.current.length > 0 })
  }, [clearSelection, setSlides, slidesRef])

  const redo = useCallback(() => {
    const next = future.current[0]
    if (!next) return

    future.current = future.current.slice(1)
    past.current = [...past.current, slidesRef.current].slice(-40)
    slidesRef.current = next
    setSlides(next)
    clearSelection()
    setHistoryState({ undo: past.current.length > 0, redo: future.current.length > 0 })
  }, [clearSelection, setSlides, slidesRef])

  const resetHistory = useCallback(() => {
    past.current = []
    future.current = []
    setHistoryState({ undo: false, redo: false })
  }, [])

  return {
    canUndo: historyState.undo,
    canRedo: historyState.redo,
    commit,
    checkpoint,
    updateElementsLive,
    undo,
    redo,
    resetHistory,
  }
}
