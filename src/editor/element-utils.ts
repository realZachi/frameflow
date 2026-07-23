import { uid } from '../utils'
import type { CanvasElement } from '../types'

export const freshElementIds = (elements: CanvasElement[]) =>
  elements.map((element) => ({ ...element, id: uid(element.type) }))
