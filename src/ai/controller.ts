import type { Background, CanvasElement, Slide, UploadAsset } from '../types'
import { uid } from '../utils'

export type ProjectSnapshot = {
  canvas: { width: 1290; height: 2796; coordinates: 'percent' }
  slides: Array<{
    id: string
    name: string
    index: number
    background: Record<string, unknown> // background data WITHOUT data URLs: image is replaced with imageAssetId or hasImage
    elements: Array<Record<string, unknown>> // element data WITHOUT data URLs: for device elements replace `screenshot` with `screenshotAssetId` (matched by comparing src against uploads) or hasScreenshot boolean; for image elements replace `src` with `assetId`
  }>
  assets: Array<{ id: string; name: string }>
}

export type AiEditorController = {
  snapshot(): ProjectSnapshot
  addSlide(input: { name?: string; background?: Background }): string // returns new slide id, appends at end
  renameSlide(slideId: string, name: string): boolean
  setSlideBackground(slideId: string, patch: Partial<Background>): boolean
  deleteSlide(slideId: string): boolean // must refuse (return false) if it would delete the last remaining slide
  addElement(slideId: string, element: Omit<CanvasElement, 'id'>): string | null // returns element id
  updateElement(slideId: string, elementId: string, patch: Record<string, unknown>): boolean
  deleteElement(slideId: string, elementId: string): boolean
  getAssetSrc(assetId: string): string | undefined
}

const DEFAULT_NEW_SLIDE_BACKGROUND: Background = { type: 'solid', color1: '#111116', color2: '#111116', angle: 90 }

// Keys every element type may receive through `update_element`, plus keys specific to each type.
const BASE_UPDATE_KEYS = new Set(['x', 'y', 'width', 'rotation', 'opacity'])
const TYPE_UPDATE_KEYS: Record<CanvasElement['type'], Set<string>> = {
  text: new Set([
    'text', 'color', 'fontFamily', 'fontSize', 'fontWeight', 'align', 'lineHeight', 'letterSpacing', 'italic',
    'underline', 'strikethrough', 'textTransform', 'backgroundColor', 'backgroundOpacity', 'padding', 'borderRadius',
    'strokeColor', 'strokeWidth', 'shadow', 'shadowColor',
  ]),
  device: new Set(['deviceStyle', 'screenshot', 'screenTheme', 'tiltX', 'tiltY', 'shadow']),
  image: new Set(['src', 'borderRadius', 'shadow']),
  shape: new Set(['shape', 'color', 'strokeColor', 'strokeWidth', 'shadow']),
}

const findAssetIdBySrc = (src: string | undefined, uploads: UploadAsset[]): string | undefined => {
  if (!src) return undefined
  return uploads.find((asset) => asset.src === src)?.id
}

const serializeElement = (element: CanvasElement, uploads: UploadAsset[]): Record<string, unknown> => {
  if (element.type === 'device') {
    const { screenshot, ...rest } = element
    const screenshotAssetId = findAssetIdBySrc(screenshot, uploads)
    return {
      ...rest,
      ...(screenshotAssetId ? { screenshotAssetId } : {}),
      hasScreenshot: Boolean(screenshot),
    }
  }
  if (element.type === 'image') {
    const { src, ...rest } = element
    const assetId = findAssetIdBySrc(src, uploads)
    return {
      ...rest,
      ...(assetId ? { assetId } : {}),
      hasSrc: Boolean(src),
    }
  }
  return { ...element }
}

const serializeBackground = (background: Background, uploads: UploadAsset[]): Record<string, unknown> => {
  const { image, ...rest } = background
  const imageAssetId = findAssetIdBySrc(image, uploads)
  return {
    ...rest,
    ...(imageAssetId ? { imageAssetId } : {}),
    hasImage: Boolean(image),
  }
}

export function createAiController(io: {
  getSlides(): Slide[]
  setSlides(updater: (slides: Slide[]) => Slide[]): void
  getUploads(): UploadAsset[]
}): AiEditorController {
  const findSlide = (slideId: string) => io.getSlides().find((slide) => slide.id === slideId)

  const snapshot: AiEditorController['snapshot'] = () => {
    const slides = io.getSlides()
    const uploads = io.getUploads()
    return {
      canvas: { width: 1290, height: 2796, coordinates: 'percent' },
      slides: slides.map((slide, index) => ({
        id: slide.id,
        name: slide.name,
        index,
        background: serializeBackground(slide.background, uploads),
        elements: slide.elements.map((element) => serializeElement(element, uploads)),
      })),
      assets: uploads.map((asset) => ({ id: asset.id, name: asset.name })),
    }
  }

  const addSlide: AiEditorController['addSlide'] = ({ name, background }) => {
    const id = uid('slide')
    io.setSlides((current) => [
      ...current,
      {
        id,
        name: name ?? `Screen ${current.length + 1}`,
        background: background ?? DEFAULT_NEW_SLIDE_BACKGROUND,
        elements: [],
      },
    ])
    return id
  }

  const renameSlide: AiEditorController['renameSlide'] = (slideId, name) => {
    if (!findSlide(slideId)) return false
    io.setSlides((current) => current.map((slide) => (slide.id === slideId ? { ...slide, name } : slide)))
    return true
  }

  const setSlideBackground: AiEditorController['setSlideBackground'] = (slideId, patch) => {
    if (!findSlide(slideId)) return false
    io.setSlides((current) =>
      current.map((slide) => (slide.id === slideId ? { ...slide, background: { ...slide.background, ...patch } } : slide)),
    )
    return true
  }

  const deleteSlide: AiEditorController['deleteSlide'] = (slideId) => {
    const slides = io.getSlides()
    if (slides.length <= 1) return false
    if (!slides.some((slide) => slide.id === slideId)) return false
    io.setSlides((current) => current.filter((slide) => slide.id !== slideId))
    return true
  }

  const addElement: AiEditorController['addElement'] = (slideId, element) => {
    if (!findSlide(slideId)) return null
    const id = uid(element.type)
    const newElement = { ...element, id } as CanvasElement
    io.setSlides((current) =>
      current.map((slide) => (slide.id === slideId ? { ...slide, elements: [...slide.elements, newElement] } : slide)),
    )
    return id
  }

  const updateElement: AiEditorController['updateElement'] = (slideId, elementId, patch) => {
    const slide = findSlide(slideId)
    if (!slide) return false
    const element = slide.elements.find((candidate) => candidate.id === elementId)
    if (!element) return false

    const allowedKeys = new Set([...BASE_UPDATE_KEYS, ...TYPE_UPDATE_KEYS[element.type]])
    const filteredPatch: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(patch)) {
      if (allowedKeys.has(key)) filteredPatch[key] = value
    }

    io.setSlides((current) =>
      current.map((s) =>
        s.id === slideId
          ? {
              ...s,
              elements: s.elements.map((el) => (el.id === elementId ? ({ ...el, ...filteredPatch } as CanvasElement) : el)),
            }
          : s,
      ),
    )
    return true
  }

  const deleteElement: AiEditorController['deleteElement'] = (slideId, elementId) => {
    const slide = findSlide(slideId)
    if (!slide) return false
    if (!slide.elements.some((element) => element.id === elementId)) return false
    io.setSlides((current) =>
      current.map((s) => (s.id === slideId ? { ...s, elements: s.elements.filter((el) => el.id !== elementId) } : s)),
    )
    return true
  }

  const getAssetSrc: AiEditorController['getAssetSrc'] = (assetId) => io.getUploads().find((asset) => asset.id === assetId)?.src

  return {
    snapshot,
    addSlide,
    renameSlide,
    setSlideBackground,
    deleteSlide,
    addElement,
    updateElement,
    deleteElement,
    getAssetSrc,
  }
}
