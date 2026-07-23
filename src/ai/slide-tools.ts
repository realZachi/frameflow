import { tool } from 'ai'
import { z } from 'zod'
import { clamp } from '../utils'
import {
  clampAngle,
  clampOpacity,
  clampPatternScale,
  getSlide,
  notFound,
  slideNotFoundMessage,
  assetNotFoundMessage,
  type ToolContext,
} from './tool-context'
import { backgroundPatternSchema } from './tool-schemas'

export const createSlideTools = ({ controller, emit }: ToolContext) => {
  const getCanvasState = tool({
    description:
      'Get the current state of the project: every slide (with id, name, background, elements) and every uploaded screenshot asset (with id, name). Always call this first, and again whenever you need up-to-date ids.',
    inputSchema: z.object({}),
    execute: async () => controller.snapshot(),
  })

  const addSlide = tool({
    description: 'Create a new, empty slide and append it to the end of the project. Returns the new slide id.',
    inputSchema: z.object({
      name: z.string().optional().describe('Slide name shown in the editor sidebar. Defaults to "Screen N".'),
      background: z.object({
        type: z.enum(['solid', 'gradient']),
        color1: z.string().describe('Primary color as a hex string, e.g. #111116.'),
        color2: z.string().describe('Secondary color as a hex string. For solid backgrounds, set this equal to color1.'),
        angle: z.number().describe('Gradient angle in degrees, 0-360. Ignored for solid backgrounds.'),
        gradientKind: z.enum(['linear', 'radial']).optional().describe('Gradient geometry. Defaults to linear.'),
        pattern: backgroundPatternSchema.optional().describe('Optional decorative background pattern.'),
        patternColor: z.string().optional().describe('Hex color for the optional pattern.'),
        patternOpacity: z.number().optional().describe('Pattern opacity, 0-0.8.'),
        patternScale: z.number().optional().describe('Pattern scale on the internal canvas, 10-80.'),
      }).optional().describe('Background for the new slide. Defaults to a near-black solid color.'),
    }),
    execute: async ({ name, background }) => {
      const normalizedBackground = background
        ? {
            type: background.type,
            color1: background.color1,
            color2: background.color2,
            angle: clampAngle(background.angle),
            ...(background.gradientKind !== undefined
              ? { gradientKind: background.gradientKind }
              : {}),
            ...(background.pattern !== undefined
              ? { pattern: background.pattern }
              : {}),
            ...(background.patternColor !== undefined
              ? { patternColor: background.patternColor }
              : {}),
            ...(background.patternOpacity !== undefined
              ? { patternOpacity: clamp(background.patternOpacity, 0, 0.8) }
              : {}),
            ...(background.patternScale !== undefined
              ? { patternScale: clampPatternScale(background.patternScale) }
              : {}),
          }
        : undefined
      const slideId = controller.addSlide({
        ...(name !== undefined ? { name } : {}),
        ...(normalizedBackground ? { background: normalizedBackground } : {}),
      })
      emit({ tool: 'add_slide', slideId, x: 50, y: 16 })
      return { ok: true, slideId }
    },
  })

  const renameSlide = tool({
    description: 'Rename an existing slide.',
    inputSchema: z.object({
      slideId: z.string(),
      name: z.string(),
    }),
    execute: async ({ slideId, name }) => {
      if (!getSlide(controller, slideId)) return notFound(slideNotFoundMessage(slideId))
      emit({ tool: 'rename_slide', slideId, x: 50, y: 6 })
      controller.renameSlide(slideId, name)
      return { ok: true }
    },
  })

  const setSlideBackground = tool({
    description: 'Change a slide background. Supports solid fills, linear/radial gradients, uploaded images with overlays, and optional graphic patterns.',
    inputSchema: z.object({
      slideId: z.string(),
      type: z.enum(['solid', 'gradient', 'image']),
      color1: z.string().describe('Primary color as a hex string, e.g. #111116.'),
      color2: z.string().optional().describe('Secondary color as a hex string, used for gradients.'),
      angle: z.number().optional().describe('Gradient angle in degrees, 0-360.'),
      gradientKind: z.enum(['linear', 'radial']).optional().describe('Gradient geometry. Defaults to linear.'),
      imageAssetId: z.string().optional().describe('Required for image backgrounds. Asset id from get_canvas_state.'),
      imageFit: z.enum(['cover', 'contain']).optional().describe('Image background fitting. Defaults to cover.'),
      imagePosition: z.enum(['center', 'top', 'bottom']).optional().describe('Image focal position. Defaults to center.'),
      overlayColor: z.string().optional().describe('Image overlay color as hex. Defaults to #111116.'),
      overlayOpacity: z.number().optional().describe('Image overlay opacity, 0-1. Defaults to 0.18.'),
      pattern: backgroundPatternSchema.optional().describe('Optional graphic pattern over the background.'),
      patternColor: z.string().optional().describe('Pattern color as hex.'),
      patternOpacity: z.number().optional().describe('Pattern opacity, 0-0.8.'),
      patternScale: z.number().optional().describe('Pattern scale, 10-80 on the internal canvas.'),
    }),
    execute: async ({
      slideId,
      type,
      color1,
      color2,
      angle,
      gradientKind,
      imageAssetId,
      imageFit,
      imagePosition,
      overlayColor,
      overlayOpacity,
      pattern,
      patternColor,
      patternOpacity,
      patternScale,
    }) => {
      if (!getSlide(controller, slideId)) return notFound(slideNotFoundMessage(slideId))

      let image: string | undefined
      if (type === 'image') {
        if (!imageAssetId) return notFound('imageAssetId is required for an image background.')
        image = controller.getAssetSrc(imageAssetId)
        if (!image) return notFound(assetNotFoundMessage(imageAssetId))
      }
      emit({ tool: 'set_slide_background', slideId, x: 50, y: 50 })
      controller.setSlideBackground(slideId, {
        type,
        color1,
        ...(color2 !== undefined ? { color2 } : {}),
        ...(angle !== undefined ? { angle: clampAngle(angle) } : {}),
        ...(gradientKind !== undefined ? { gradientKind } : {}),
        ...(image !== undefined ? { image } : {}),
        ...(imageFit !== undefined ? { imageFit } : {}),
        ...(imagePosition !== undefined ? { imagePosition } : {}),
        ...(overlayColor !== undefined ? { overlayColor } : {}),
        ...(overlayOpacity !== undefined
          ? { overlayOpacity: clampOpacity(overlayOpacity) }
          : {}),
        ...(pattern !== undefined ? { pattern } : {}),
        ...(patternColor !== undefined ? { patternColor } : {}),
        ...(patternOpacity !== undefined
          ? { patternOpacity: clamp(patternOpacity, 0, 0.8) }
          : {}),
        ...(patternScale !== undefined
          ? { patternScale: clampPatternScale(patternScale) }
          : {}),
      })
      return { ok: true }
    },
  })

  const deleteSlide = tool({
    description: 'Delete a slide. Refuses if it is the last remaining slide in the project.',
    inputSchema: z.object({ slideId: z.string() }),
    execute: async ({ slideId }) => {
      if (!getSlide(controller, slideId)) return notFound(slideNotFoundMessage(slideId))
      if (!controller.deleteSlide(slideId)) {
        return notFound('Cannot delete the last remaining slide in the project.')
      }
      emit({ tool: 'delete_slide', slideId })
      return { ok: true }
    },
  })

  return {
    get_canvas_state: getCanvasState,
    add_slide: addSlide,
    rename_slide: renameSlide,
    set_slide_background: setSlideBackground,
    delete_slide: deleteSlide,
  }
}
