import { tool } from 'ai'
import { z } from 'zod'
import { clamp } from '../utils'
import { measureSlide, type ElementBox } from './measure'
import { captureSlidePreview } from './preview'
import type { AiEditorController } from './controller'
import type { DeviceElement, ImageElement, ShapeElement, TextElement } from '../types'

// --- shared clamp ranges -----------------------------------------------------
const clampX = (v: number) => clamp(v, -35, 97)
const clampY = (v: number) => clamp(v, -35, 97)
const clampWidth = (v: number) => clamp(v, 8, 140)
const clampFontSize = (v: number) => clamp(v, 6, 120)
const clampFontWeight = (v: number) => clamp(v, 100, 900)
const clampLineHeight = (v: number) => clamp(v, 0.7, 1.8)
const clampLetterSpacing = (v: number) => clamp(v, -4, 8)
const clampAngle = (v: number) => clamp(v, 0, 360)
const clampTiltX = (v: number) => clamp(v, -12, 12)
const clampTiltY = (v: number) => clamp(v, -18, 18)
const clampShadow = (v: number) => clamp(v, 0, 100)
const clampBorderRadius = (v: number) => clamp(v, 0, 100)
const clampRotation = (v: number) => clamp(v, -180, 180)
const clampOpacity = (v: number) => clamp(v, 0, 1)

const COORD_NOTE = 'Percent of the 1290x2796 canvas. x/y is the top-left corner of the element, width is percent of canvas width; height is automatic.'

const notFound = (message: string) => ({ ok: false as const, error: message })

const slideNotFoundMessage = (slideId: string) => `No slide with id ${slideId}. Call get_canvas_state to see current ids.`

const elementNotFoundMessage = (elementId: string, slideId: string) =>
  `No element with id ${elementId} on slide ${slideId}. Call get_canvas_state to see current ids.`

const assetNotFoundMessage = (assetId: string) => `No asset with id ${assetId}. Call get_canvas_state to see available asset ids.`

const fontFamilyEnum = z
  .enum(['Bricolage Grotesque Variable', 'Instrument Sans Variable', 'Fraunces', 'Arial, sans-serif'])
  .describe(
    "Font to use. 'Bricolage Grotesque Variable' = expressive display grotesque for headlines (weights 200-800). 'Instrument Sans Variable' = clean neutral sans for body/UI text (weights 400-700). 'Fraunces' = editorial serif, only weight 600 is loaded so always pair it with fontWeight 600. 'Arial, sans-serif' = plain fallback, avoid unless asked.",
  )

const deviceStyleEnum = z
  .enum(['midnight', 'natural', 'graphite', 'android', 'tilted-hand'])
  .describe(
    "Device mockup to render. 'midnight'/'natural'/'graphite' are flat iPhone CSS mockups (dark/titanium/graphite finishes). 'android' is a flat Android CSS mockup. 'tilted-hand' is a photorealistic hand holding a phone at an angle - use a wide width (~110-120) and x/y positioned so the whole hand is visible.",
  )

const screenThemeEnum = z.enum(['coral', 'mint', 'night', 'sun']).describe('Tint applied to the device chrome/background behind the screenshot.')

// --- helpers to look up existing slide/element via the controller's snapshot -
const getSlide = (controller: AiEditorController, slideId: string) => controller.snapshot().slides.find((slide) => slide.id === slideId)

const getElement = (controller: AiEditorController, slideId: string, elementId: string) => {
  const slide = getSlide(controller, slideId)
  if (!slide) return undefined
  return slide.elements.find((element) => element.id === elementId)
}

const buildElementTypes = (controller: AiEditorController, slideId: string): Record<string, string> => {
  const slide = getSlide(controller, slideId)
  if (!slide) return {}
  const map: Record<string, string> = {}
  for (const element of slide.elements) {
    const id = element.id
    const type = element.type
    if (typeof id === 'string' && typeof type === 'string') map[id] = type
  }
  return map
}

// Re-measures the slide after a mutation and picks out the affected element's rendered box.
// Every mutating tool returns this alongside `ok: true` so the model can immediately see the
// real, rendered result instead of trusting its own guess about where things ended up.
const withMeasurement = async (
  controller: AiEditorController,
  slideId: string,
  elementId: string,
): Promise<{ box: ElementBox | null; slideWarnings: string[] }> => {
  const elementTypes = buildElementTypes(controller, slideId)
  const measurement = await measureSlide(slideId, elementTypes)
  const box = measurement?.boxes.find((candidate) => candidate.elementId === elementId) ?? null
  return { box, slideWarnings: measurement?.warnings ?? [] }
}

const MEASUREMENT_NOTE = "The result includes the element's actually rendered bounding box and any slide layout warnings — address warnings before moving on."

export function createEditorTools(controller: AiEditorController) {
  const get_canvas_state = tool({
    description:
      'Get the current state of the project: every slide (with id, name, background, elements) and every uploaded screenshot asset (with id, name). Always call this first, and again whenever you need up-to-date ids.',
    inputSchema: z.object({}),
    execute: async () => controller.snapshot(),
  })

  const add_slide = tool({
    description: 'Create a new, empty slide and append it to the end of the project. Returns the new slide id.',
    inputSchema: z.object({
      name: z.string().optional().describe('Slide name shown in the editor sidebar. Defaults to "Screen N".'),
      background: z
        .object({
          type: z.enum(['solid', 'gradient']),
          color1: z.string().describe('Primary color as a hex string, e.g. #111116.'),
          color2: z.string().describe('Secondary color as a hex string. For solid backgrounds, set this equal to color1.'),
          angle: z.number().describe('Gradient angle in degrees, 0-360. Ignored for solid backgrounds.'),
        })
        .optional()
        .describe('Background for the new slide. Defaults to a near-black solid color.'),
    }),
    execute: async ({ name, background }) => {
      const slideId = controller.addSlide({ name, background })
      return { ok: true, slideId }
    },
  })

  const rename_slide = tool({
    description: 'Rename an existing slide.',
    inputSchema: z.object({
      slideId: z.string(),
      name: z.string(),
    }),
    execute: async ({ slideId, name }) => {
      if (!getSlide(controller, slideId)) return notFound(slideNotFoundMessage(slideId))
      controller.renameSlide(slideId, name)
      return { ok: true }
    },
  })

  const set_slide_background = tool({
    description: 'Change a slide background. Solid fills use color1 only; gradients blend color1 to color2 at the given angle.',
    inputSchema: z.object({
      slideId: z.string(),
      type: z.enum(['solid', 'gradient']),
      color1: z.string().describe('Primary color as a hex string, e.g. #111116.'),
      color2: z.string().optional().describe('Secondary color as a hex string, used for gradients.'),
      angle: z.number().optional().describe('Gradient angle in degrees, 0-360.'),
    }),
    execute: async ({ slideId, type, color1, color2, angle }) => {
      if (!getSlide(controller, slideId)) return notFound(slideNotFoundMessage(slideId))
      controller.setSlideBackground(slideId, {
        type,
        color1,
        ...(color2 !== undefined ? { color2 } : {}),
        ...(angle !== undefined ? { angle: clampAngle(angle) } : {}),
      })
      return { ok: true }
    },
  })

  const delete_slide = tool({
    description: 'Delete a slide. Refuses if it is the last remaining slide in the project.',
    inputSchema: z.object({ slideId: z.string() }),
    execute: async ({ slideId }) => {
      if (!getSlide(controller, slideId)) return notFound(slideNotFoundMessage(slideId))
      const ok = controller.deleteSlide(slideId)
      if (!ok) return notFound('Cannot delete the last remaining slide in the project.')
      return { ok: true }
    },
  })

  const add_text = tool({
    description: `Add a text element to a slide. ${COORD_NOTE} ${MEASUREMENT_NOTE}`,
    inputSchema: z.object({
      slideId: z.string(),
      text: z.string().describe('The copy to display. Use \\n for line breaks.'),
      x: z.number().describe(COORD_NOTE),
      y: z.number().describe(COORD_NOTE),
      width: z.number().describe(COORD_NOTE),
      fontFamily: fontFamilyEnum,
      fontSize: z
        .number()
        .describe(
          'Font size in px on the internal 330px-wide canvas base (not the 1290px export size). Hero headlines 32-46, sub-headlines 18-24, supporting/body copy 13-17, small labels 9-12. Rule of thumb: fontSize 45 is roughly a capital letter spanning ~13% of canvas width. Values above ~52 are almost always a mistake.',
        ),
      fontWeight: z.number().describe('Font weight, 100-900.'),
      color: z.string().describe('Text color as a hex string.'),
      align: z.enum(['left', 'center', 'right']),
      lineHeight: z.number().optional().describe('Line height multiplier. Defaults to 1.05.'),
      letterSpacing: z.number().optional().describe('Letter spacing in px. Defaults to 0.'),
      italic: z.boolean().optional().describe('Defaults to false.'),
      rotation: z.number().optional().describe('Rotation in degrees, -180 to 180. Defaults to 0.'),
      opacity: z.number().optional().describe('Opacity from 0 to 1. Defaults to 1.'),
    }),
    execute: async ({ slideId, text, x, y, width, fontFamily, fontSize, fontWeight, color, align, lineHeight, letterSpacing, italic, rotation, opacity }) => {
      if (!getSlide(controller, slideId)) return notFound(slideNotFoundMessage(slideId))
      const element: Omit<TextElement, 'id'> = {
        type: 'text',
        x: clampX(x),
        y: clampY(y),
        width: clampWidth(width),
        rotation: clampRotation(rotation ?? 0),
        opacity: clampOpacity(opacity ?? 1),
        text,
        color,
        fontFamily,
        fontSize: clampFontSize(fontSize),
        fontWeight: clampFontWeight(fontWeight),
        align,
        lineHeight: clampLineHeight(lineHeight ?? 1.05),
        letterSpacing: clampLetterSpacing(letterSpacing ?? 0),
        italic: italic ?? false,
      }
      const elementId = controller.addElement(slideId, element)
      if (!elementId) return notFound(slideNotFoundMessage(slideId))
      const { box, slideWarnings } = await withMeasurement(controller, slideId, elementId)
      return { ok: true, elementId, box, slideWarnings }
    },
  })

  const add_device = tool({
    description: `Add a device mockup to a slide, optionally pre-loaded with an uploaded screenshot. ${COORD_NOTE} ${MEASUREMENT_NOTE}`,
    inputSchema: z.object({
      slideId: z.string(),
      deviceStyle: deviceStyleEnum,
      screenshotAssetId: z.string().optional().describe('Asset id (from get_canvas_state) of an uploaded screenshot to place inside the device screen.'),
      x: z.number().describe(COORD_NOTE),
      y: z.number().describe(COORD_NOTE),
      width: z.number().describe(COORD_NOTE),
      rotation: z.number().optional().describe('Rotation in degrees, -180 to 180. Defaults to -4 (0 for tilted-hand).'),
      tiltX: z.number().optional().describe('3D tilt around the horizontal axis, -12 to 12. Defaults to 0.'),
      tiltY: z.number().optional().describe('3D tilt around the vertical axis, -18 to 18. Defaults to 0.'),
      shadow: z.number().optional().describe('Drop shadow intensity, 0-100. Defaults to 55.'),
      screenTheme: screenThemeEnum.optional().describe('Defaults to "coral".'),
      opacity: z.number().optional().describe('Opacity from 0 to 1. Defaults to 1.'),
    }),
    execute: async ({ slideId, deviceStyle, screenshotAssetId, x, y, width, rotation, tiltX, tiltY, shadow, screenTheme, opacity }) => {
      if (!getSlide(controller, slideId)) return notFound(slideNotFoundMessage(slideId))
      let screenshot: string | undefined
      if (screenshotAssetId !== undefined) {
        screenshot = controller.getAssetSrc(screenshotAssetId)
        if (!screenshot) return notFound(assetNotFoundMessage(screenshotAssetId))
      }
      const element: Omit<DeviceElement, 'id'> = {
        type: 'device',
        x: clampX(x),
        y: clampY(y),
        width: clampWidth(width),
        rotation: clampRotation(rotation ?? (deviceStyle === 'tilted-hand' ? 0 : -4)),
        opacity: clampOpacity(opacity ?? 1),
        deviceStyle,
        screenTheme: screenTheme ?? 'coral',
        tiltX: clampTiltX(tiltX ?? 0),
        tiltY: clampTiltY(tiltY ?? 0),
        shadow: clampShadow(shadow ?? 55),
        ...(screenshot ? { screenshot } : {}),
      }
      const elementId = controller.addElement(slideId, element)
      if (!elementId) return notFound(slideNotFoundMessage(slideId))
      const { box, slideWarnings } = await withMeasurement(controller, slideId, elementId)
      return { ok: true, elementId, box, slideWarnings }
    },
  })

  const add_shape = tool({
    description: `Add a decorative shape accent to a slide. ${COORD_NOTE} ${MEASUREMENT_NOTE}`,
    inputSchema: z.object({
      slideId: z.string(),
      shape: z.enum(['circle', 'pill', 'spark']),
      color: z.string().describe('Shape color as a hex string.'),
      x: z.number().describe(COORD_NOTE),
      y: z.number().describe(COORD_NOTE),
      width: z.number().describe(COORD_NOTE),
      rotation: z.number().optional().describe('Rotation in degrees, -180 to 180. Defaults to 0.'),
      opacity: z.number().optional().describe('Opacity from 0 to 1. Defaults to 1.'),
    }),
    execute: async ({ slideId, shape, color, x, y, width, rotation, opacity }) => {
      if (!getSlide(controller, slideId)) return notFound(slideNotFoundMessage(slideId))
      const element: Omit<ShapeElement, 'id'> = {
        type: 'shape',
        x: clampX(x),
        y: clampY(y),
        width: clampWidth(width),
        rotation: clampRotation(rotation ?? 0),
        opacity: clampOpacity(opacity ?? 1),
        shape,
        color,
      }
      const elementId = controller.addElement(slideId, element)
      if (!elementId) return notFound(slideNotFoundMessage(slideId))
      const { box, slideWarnings } = await withMeasurement(controller, slideId, elementId)
      return { ok: true, elementId, box, slideWarnings }
    },
  })

  const add_image = tool({
    description: `Add a free-floating uploaded image to a slide (not inside a device frame). ${COORD_NOTE} ${MEASUREMENT_NOTE}`,
    inputSchema: z.object({
      slideId: z.string(),
      assetId: z.string().describe('Asset id (from get_canvas_state) of the uploaded image to place.'),
      x: z.number().describe(COORD_NOTE),
      y: z.number().describe(COORD_NOTE),
      width: z.number().describe(COORD_NOTE),
      borderRadius: z.number().optional().describe('Corner radius, 0-100. Defaults to 4.'),
      rotation: z.number().optional().describe('Rotation in degrees, -180 to 180. Defaults to 0.'),
      opacity: z.number().optional().describe('Opacity from 0 to 1. Defaults to 1.'),
    }),
    execute: async ({ slideId, assetId, x, y, width, borderRadius, rotation, opacity }) => {
      if (!getSlide(controller, slideId)) return notFound(slideNotFoundMessage(slideId))
      const src = controller.getAssetSrc(assetId)
      if (!src) return notFound(assetNotFoundMessage(assetId))
      const element: Omit<ImageElement, 'id'> = {
        type: 'image',
        x: clampX(x),
        y: clampY(y),
        width: clampWidth(width),
        rotation: clampRotation(rotation ?? 0),
        opacity: clampOpacity(opacity ?? 1),
        src,
        borderRadius: clampBorderRadius(borderRadius ?? 4),
      }
      const elementId = controller.addElement(slideId, element)
      if (!elementId) return notFound(slideNotFoundMessage(slideId))
      const { box, slideWarnings } = await withMeasurement(controller, slideId, elementId)
      return { ok: true, elementId, box, slideWarnings }
    },
  })

  const set_device_screenshot = tool({
    description: `Replace the screenshot shown inside an existing device element. ${MEASUREMENT_NOTE}`,
    inputSchema: z.object({
      slideId: z.string(),
      elementId: z.string(),
      assetId: z.string().describe('Asset id (from get_canvas_state) of the uploaded screenshot to place inside the device.'),
    }),
    execute: async ({ slideId, elementId, assetId }) => {
      if (!getSlide(controller, slideId)) return notFound(slideNotFoundMessage(slideId))
      const element = getElement(controller, slideId, elementId)
      if (!element) return notFound(elementNotFoundMessage(elementId, slideId))
      if (element.type !== 'device') return notFound(`Element ${elementId} on slide ${slideId} is not a device element.`)
      const src = controller.getAssetSrc(assetId)
      if (!src) return notFound(assetNotFoundMessage(assetId))
      controller.updateElement(slideId, elementId, { screenshot: src })
      const { box, slideWarnings } = await withMeasurement(controller, slideId, elementId)
      return { ok: true, elementId, box, slideWarnings }
    },
  })

  const update_element = tool({
    description: `Update fields on an existing element. Only pass the fields you want to change; unknown or type-inapplicable fields are ignored. ${MEASUREMENT_NOTE}`,
    inputSchema: z.object({
      slideId: z.string(),
      elementId: z.string(),
      x: z.number().optional().describe(COORD_NOTE),
      y: z.number().optional().describe(COORD_NOTE),
      width: z.number().optional().describe(COORD_NOTE),
      rotation: z.number().optional().describe('Rotation in degrees, -180 to 180.'),
      opacity: z.number().optional().describe('Opacity from 0 to 1.'),
      text: z.string().optional().describe('Text elements only.'),
      color: z.string().optional().describe('Hex color. Text and shape elements only.'),
      fontFamily: fontFamilyEnum.optional(),
      fontSize: z
        .number()
        .optional()
        .describe(
          'Text elements only. Same px-on-330px-base sizing as add_text: hero headlines 32-46, sub-headlines 18-24, body 13-17, labels 9-12, rarely above ~52.',
        ),
      fontWeight: z.number().optional().describe('Text elements only, 100-900.'),
      align: z.enum(['left', 'center', 'right']).optional().describe('Text elements only.'),
      lineHeight: z.number().optional().describe('Text elements only.'),
      letterSpacing: z.number().optional().describe('Text elements only.'),
      italic: z.boolean().optional().describe('Text elements only.'),
      deviceStyle: deviceStyleEnum.optional(),
      screenTheme: screenThemeEnum.optional(),
      tiltX: z.number().optional().describe('Device elements only, -12 to 12.'),
      tiltY: z.number().optional().describe('Device elements only, -18 to 18.'),
      shadow: z.number().optional().describe('Device elements only, 0-100.'),
      borderRadius: z.number().optional().describe('Image elements only, 0-100.'),
      shape: z.enum(['circle', 'pill', 'spark']).optional().describe('Shape elements only.'),
    }),
    execute: async ({ slideId, elementId, ...fields }) => {
      if (!getSlide(controller, slideId)) return notFound(slideNotFoundMessage(slideId))
      if (!getElement(controller, slideId, elementId)) return notFound(elementNotFoundMessage(elementId, slideId))

      const patch: Record<string, unknown> = {}
      if (fields.x !== undefined) patch.x = clampX(fields.x)
      if (fields.y !== undefined) patch.y = clampY(fields.y)
      if (fields.width !== undefined) patch.width = clampWidth(fields.width)
      if (fields.rotation !== undefined) patch.rotation = clampRotation(fields.rotation)
      if (fields.opacity !== undefined) patch.opacity = clampOpacity(fields.opacity)
      if (fields.text !== undefined) patch.text = fields.text
      if (fields.color !== undefined) patch.color = fields.color
      if (fields.fontFamily !== undefined) patch.fontFamily = fields.fontFamily
      if (fields.fontSize !== undefined) patch.fontSize = clampFontSize(fields.fontSize)
      if (fields.fontWeight !== undefined) patch.fontWeight = clampFontWeight(fields.fontWeight)
      if (fields.align !== undefined) patch.align = fields.align
      if (fields.lineHeight !== undefined) patch.lineHeight = clampLineHeight(fields.lineHeight)
      if (fields.letterSpacing !== undefined) patch.letterSpacing = clampLetterSpacing(fields.letterSpacing)
      if (fields.italic !== undefined) patch.italic = fields.italic
      if (fields.deviceStyle !== undefined) patch.deviceStyle = fields.deviceStyle
      if (fields.screenTheme !== undefined) patch.screenTheme = fields.screenTheme
      if (fields.tiltX !== undefined) patch.tiltX = clampTiltX(fields.tiltX)
      if (fields.tiltY !== undefined) patch.tiltY = clampTiltY(fields.tiltY)
      if (fields.shadow !== undefined) patch.shadow = clampShadow(fields.shadow)
      if (fields.borderRadius !== undefined) patch.borderRadius = clampBorderRadius(fields.borderRadius)
      if (fields.shape !== undefined) patch.shape = fields.shape

      controller.updateElement(slideId, elementId, patch)
      const { box, slideWarnings } = await withMeasurement(controller, slideId, elementId)
      return { ok: true, elementId, box, slideWarnings }
    },
  })

  const delete_element = tool({
    description: 'Delete an element from a slide.',
    inputSchema: z.object({
      slideId: z.string(),
      elementId: z.string(),
    }),
    execute: async ({ slideId, elementId }) => {
      if (!getSlide(controller, slideId)) return notFound(slideNotFoundMessage(slideId))
      const ok = controller.deleteElement(slideId, elementId)
      if (!ok) return notFound(elementNotFoundMessage(elementId, slideId))
      return { ok: true }
    },
  })

  const inspect_slide = tool({
    description:
      "Get the true rendered bounding box of every element on a slide (x/width as percent of canvas width, y/height as percent of canvas height) plus layout warnings (overflow, overlaps). Call it whenever you need to verify a slide's layout before moving on.",
    inputSchema: z.object({ slideId: z.string() }),
    execute: async ({ slideId }) => {
      if (!getSlide(controller, slideId)) return notFound(slideNotFoundMessage(slideId))
      const elementTypes = buildElementTypes(controller, slideId)
      const measurement = await measureSlide(slideId, elementTypes)
      if (!measurement) return notFound(slideNotFoundMessage(slideId))
      return { ok: true, boxes: measurement.boxes, warnings: measurement.warnings }
    },
  })

  const render_slide_preview = tool({
    description:
      'Render the slide to an image and return it so you can SEE your actual design. Use it after finishing each slide to check for text overflow, overlaps, poor contrast, and visual consistency with the other slides. Also returns the same layout warnings as inspect_slide.',
    inputSchema: z.object({ slideId: z.string() }),
    execute: async ({
      slideId,
    }): Promise<
      { ok: true; warnings: string[]; image: string; mediaType: 'image/jpeg' } | { ok: false; error: string }
    > => {
      if (!getSlide(controller, slideId)) return notFound(slideNotFoundMessage(slideId))
      const elementTypes = buildElementTypes(controller, slideId)
      const [capture, measurement] = await Promise.all([captureSlidePreview(slideId), measureSlide(slideId, elementTypes)])
      if (!capture) return { ok: false, error: `Failed to render a preview for slide ${slideId}.` }
      return { ok: true, warnings: measurement?.warnings ?? [], image: capture.base64, mediaType: capture.mediaType }
    },
    toModelOutput: ({ output }) => {
      if (output.ok) {
        return {
          type: 'content',
          value: [
            { type: 'text', text: JSON.stringify({ ok: true, warnings: output.warnings }) },
            { type: 'file', mediaType: output.mediaType, data: { type: 'data', data: output.image } },
          ],
        }
      }
      return { type: 'text', value: JSON.stringify(output) }
    },
  })

  return {
    get_canvas_state,
    add_slide,
    rename_slide,
    set_slide_background,
    delete_slide,
    add_text,
    add_device,
    add_shape,
    add_image,
    set_device_screenshot,
    update_element,
    delete_element,
    inspect_slide,
    render_slide_preview,
  }
}

export type EditorTools = ReturnType<typeof createEditorTools>
