import { tool } from 'ai'
import { z } from 'zod'
import { clamp } from '../utils'
import {
  clampOpacity,
  clampRotation,
  clampShadow,
  clampWidth,
  clampX,
  clampY,
  getSlide,
  notFound,
  slideNotFoundMessage,
  withMeasurement,
  type ToolContext,
} from './tool-context'
import {
  COORDINATE_NOTE,
  iconSchema,
  MEASUREMENT_NOTE,
} from './tool-schemas'
import type { IconElement } from '../types'

export const createAddIconTool = ({ controller, emit }: ToolContext) => tool({
  description: `Add a Hugeicons vector icon to a slide. Icons render as crisp SVG at any size — use them for feature bullets, status indicators, social proof marks, or decorative accents instead of emoji. ${COORDINATE_NOTE} ${MEASUREMENT_NOTE}`,
  inputSchema: z.object({
    slideId: z.string(),
    icon: iconSchema,
    color: z.string().describe('Icon stroke color as a hex string.'),
    x: z.number().describe(COORDINATE_NOTE),
    y: z.number().describe(COORDINATE_NOTE),
    width: z.number().describe(
      'Icon width as percent of canvas width. Icons are square (height = width). Small inline marks 4-8, feature icons 10-18, large accent icons 20-40.',
    ),
    strokeWidth: z.number().optional().describe('Icon line weight, 1-3. Defaults to 1.5. Use 2-2.5 for bolder icons at large sizes.'),
    shadow: z.number().optional().describe('Drop shadow intensity, 0-100. Defaults to 0.'),
    rotation: z.number().optional().describe('Rotation in degrees, -180 to 180. Defaults to 0.'),
    opacity: z.number().optional().describe('Opacity from 0 to 1. Defaults to 1.'),
  }),
  execute: async ({
    slideId,
    icon,
    color,
    x,
    y,
    width,
    strokeWidth,
    shadow,
    rotation,
    opacity,
  }) => {
    if (!getSlide(controller, slideId)) return notFound(slideNotFoundMessage(slideId))

    const element: Omit<IconElement, 'id'> = {
      type: 'icon',
      x: clampX(x),
      y: clampY(y),
      width: clampWidth(width),
      rotation: clampRotation(rotation ?? 0),
      opacity: clampOpacity(opacity ?? 1),
      icon,
      color,
      strokeWidth: clamp(strokeWidth ?? 1.5, 1, 3),
      shadow: clampShadow(shadow ?? 0),
    }
    emit({
      tool: 'add_icon',
      slideId,
      x: clamp(clampX(x) + clampWidth(width) / 2, 2, 98),
      y: clamp(clampY(y) + 4, 2, 96),
    })
    const elementId = controller.addElement(slideId, element)
    if (!elementId) return notFound(slideNotFoundMessage(slideId))
    const { box, slideWarnings } = await withMeasurement(controller, slideId, elementId)
    return { ok: true, elementId, box, slideWarnings }
  },
})
