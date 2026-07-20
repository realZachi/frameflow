import { tool } from 'ai'
import { z } from 'zod'
import { clamp } from '../utils'
import { buildHighlightHtml } from './richtext'
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
const clampTextPadding = (v: number) => clamp(v, 0, 24)
const clampTextStroke = (v: number) => clamp(v, 0, 3)
const clampShapeStroke = (v: number) => clamp(v, 0, 12)
const clampRotation = (v: number) => clamp(v, -180, 180)
const clampOpacity = (v: number) => clamp(v, 0, 1)
const clampPatternScale = (v: number) => clamp(v, 10, 80)

const COORD_NOTE = 'Percent of the 1290x2796 canvas. x/y is the top-left corner of the element, width is percent of canvas width; height is automatic. x/y may be negative (down to -35) and width may exceed 100 (up to 140), so elements can deliberately bleed off the canvas edges for cropped, dynamic compositions.'

const notFound = (message: string) => ({ ok: false as const, error: message })

const slideNotFoundMessage = (slideId: string) => `No slide with id ${slideId}. Call get_canvas_state to see current ids.`

const elementNotFoundMessage = (elementId: string, slideId: string) =>
  `No element with id ${elementId} on slide ${slideId}. Call get_canvas_state to see current ids.`

const assetNotFoundMessage = (assetId: string) => `No asset with id ${assetId}. Call get_canvas_state to see available asset ids.`

const fontFamilyEnum = z
  .enum([
    'Bricolage Grotesque Variable',
    'Syne Variable',
    'Bebas Neue',
    'Instrument Sans Variable',
    'Manrope Variable',
    'Fraunces',
    'Playfair Display',
    'DM Serif Display',
    'Space Mono',
    'Caveat',
    'Arial, sans-serif',
  ])
  .describe(
    "Font to use. Display: 'Bricolage Grotesque Variable', 'Syne Variable', 'Bebas Neue' (400 only). Sans: 'Instrument Sans Variable', 'Manrope Variable'. Serif: 'Fraunces' (600), 'Playfair Display' (600/700), 'DM Serif Display' (400). Mono: 'Space Mono' (400/700). Handwritten: 'Caveat' (400/700). 'Arial, sans-serif' is a plain fallback.",
  )

const shapeEnum = z.enum([
  'circle', 'square', 'rounded-square', 'pill', 'triangle', 'diamond', 'star', 'burst', 'spark', 'blob', 'arch', 'ring', 'line', 'arrow', 'wave',
])

const backgroundPatternEnum = z.enum(['none', 'dots', 'grid', 'diagonal', 'waves'])

const deviceStyleEnum = z
  .enum(['iphone-17-a', 'iphone-17-b', 'iphone-17-c', 'iphone-17-d', 'iphone-17-e', 'iphone-17-f', 'tilted-hand'])
  .describe(
    "Photorealistic iPhone mockup. 'iphone-17-a' and 'iphone-17-b' are upright/front views (width 58-72 fully in frame). 'iphone-17-c', 'iphone-17-d', and 'iphone-17-e' are low angled views (width 90-112, or up to 115-140 with negative x/y for a dramatic cropped close-up). 'iphone-17-f' is a leaning portrait phone (width 88-105). 'tilted-hand' is a hand holding the phone (width 110-125, usually cropped by a canvas edge). Perspective, light, and shadow are baked into every overlay.",
  )

const screenThemeEnum = z.enum(['coral', 'mint', 'night', 'sun']).describe('Tint applied to the device chrome/background behind the screenshot.')

const textHighlightSchema = z.object({
  text: z.string().describe('Exact substring of the element text to style. Every exact occurrence of it gets this styling.'),
  color: z.string().optional().describe('Hex text color for just this part, e.g. the accent color.'),
  backgroundColor: z.string().optional().describe('Hex background color behind just this part — the highlighter-pen / pill look.'),
  backgroundOpacity: z.number().optional().describe('Opacity of that background, 0-1. Defaults to 1.'),
  borderRadius: z.number().optional().describe('Corner radius of that background in px on the internal 330px canvas base, 0-24. Only visible together with backgroundColor.'),
  padding: z.number().optional().describe('Horizontal padding around the highlighted part in internal px, 0-12. Use with backgroundColor for a pill.'),
  bold: z.boolean().optional().describe('Render just this part bold.'),
  italic: z.boolean().optional().describe('Render just this part italic.'),
  underline: z.boolean().optional().describe('Underline just this part.'),
  strikethrough: z.boolean().optional().describe('Strike through just this part.'),
  opacity: z.number().optional().describe('Opacity of just this part, 0-1, e.g. to de-emphasize a word.'),
})

const highlightsParam = z
  .array(textHighlightSchema)
  .optional()
  .describe(
    'Style parts of the text differently from the rest: accent-colored key words, highlight pills, mixed bold/italic. Each entry must be an exact substring of the text. Pass [] to remove all part-level styling. Whenever you change `text` without passing highlights, existing highlights are cleared.',
  )

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
          gradientKind: z.enum(['linear', 'radial']).optional().describe('Gradient geometry. Defaults to linear.'),
          pattern: backgroundPatternEnum.optional().describe('Optional decorative background pattern.'),
          patternColor: z.string().optional().describe('Hex color for the optional pattern.'),
          patternOpacity: z.number().optional().describe('Pattern opacity, 0-0.8.'),
          patternScale: z.number().optional().describe('Pattern scale on the internal canvas, 10-80.'),
        })
        .optional()
        .describe('Background for the new slide. Defaults to a near-black solid color.'),
    }),
    execute: async ({ name, background }) => {
      const normalizedBackground = background ? {
        ...background,
        angle: clampAngle(background.angle),
        ...(background.patternOpacity !== undefined ? { patternOpacity: clamp(background.patternOpacity, 0, 0.8) } : {}),
        ...(background.patternScale !== undefined ? { patternScale: clampPatternScale(background.patternScale) } : {}),
      } : undefined
      const slideId = controller.addSlide({ name, background: normalizedBackground })
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
      pattern: backgroundPatternEnum.optional().describe('Optional graphic pattern over the background.'),
      patternColor: z.string().optional().describe('Pattern color as hex.'),
      patternOpacity: z.number().optional().describe('Pattern opacity, 0-0.8.'),
      patternScale: z.number().optional().describe('Pattern scale, 10-80 on the internal canvas.'),
    }),
    execute: async ({ slideId, type, color1, color2, angle, gradientKind, imageAssetId, imageFit, imagePosition, overlayColor, overlayOpacity, pattern, patternColor, patternOpacity, patternScale }) => {
      if (!getSlide(controller, slideId)) return notFound(slideNotFoundMessage(slideId))
      let image: string | undefined
      if (type === 'image') {
        if (!imageAssetId) return notFound('imageAssetId is required for an image background.')
        image = controller.getAssetSrc(imageAssetId)
        if (!image) return notFound(assetNotFoundMessage(imageAssetId))
      }
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
        ...(overlayOpacity !== undefined ? { overlayOpacity: clampOpacity(overlayOpacity) } : {}),
        ...(pattern !== undefined ? { pattern } : {}),
        ...(patternColor !== undefined ? { patternColor } : {}),
        ...(patternOpacity !== undefined ? { patternOpacity: clamp(patternOpacity, 0, 0.8) } : {}),
        ...(patternScale !== undefined ? { patternScale: clampPatternScale(patternScale) } : {}),
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
      highlights: highlightsParam,
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
      underline: z.boolean().optional().describe('Underline the text. Defaults to false.'),
      strikethrough: z.boolean().optional().describe('Strike through the text. Defaults to false.'),
      textTransform: z.enum(['none', 'uppercase', 'lowercase']).optional().describe('Visual text casing. Defaults to none.'),
      backgroundColor: z.string().optional().describe('Optional text-box background color as hex.'),
      backgroundOpacity: z.number().optional().describe('Text-box background opacity, 0-1. Defaults to 0.'),
      padding: z.number().optional().describe('Text-box inner padding in px on the internal canvas, 0-24.'),
      borderRadius: z.number().optional().describe('Text-box corner radius in px on the internal canvas, 0-40.'),
      strokeColor: z.string().optional().describe('Optional text outline color as hex.'),
      strokeWidth: z.number().optional().describe('Text outline width in px on the internal canvas, 0-3.'),
      shadow: z.number().optional().describe('Text shadow intensity, 0-100.'),
      shadowColor: z.string().optional().describe('Text shadow color as hex.'),
      rotation: z.number().optional().describe('Rotation in degrees, -180 to 180. Defaults to 0.'),
      opacity: z.number().optional().describe('Opacity from 0 to 1. Defaults to 1.'),
    }),
    execute: async ({ slideId, text, highlights, x, y, width, fontFamily, fontSize, fontWeight, color, align, lineHeight, letterSpacing, italic, underline, strikethrough, textTransform, backgroundColor, backgroundOpacity, padding, borderRadius, strokeColor, strokeWidth, shadow, shadowColor, rotation, opacity }) => {
      if (!getSlide(controller, slideId)) return notFound(slideNotFoundMessage(slideId))
      const html = highlights !== undefined ? buildHighlightHtml(text, highlights) : undefined
      const element: Omit<TextElement, 'id'> = {
        type: 'text',
        ...(html !== undefined ? { html } : {}),
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
        underline: underline ?? false,
        strikethrough: strikethrough ?? false,
        textTransform: textTransform ?? 'none',
        backgroundColor: backgroundColor ?? '#ffffff',
        backgroundOpacity: clampOpacity(backgroundOpacity ?? 0),
        padding: clampTextPadding(padding ?? 0),
        borderRadius: clamp(borderRadius ?? 0, 0, 40),
        strokeColor: strokeColor ?? '#111116',
        strokeWidth: clampTextStroke(strokeWidth ?? 0),
        shadow: clampShadow(shadow ?? 0),
        shadowColor: shadowColor ?? '#000000',
      }
      const elementId = controller.addElement(slideId, element)
      if (!elementId) return notFound(slideNotFoundMessage(slideId))
      const { box, slideWarnings } = await withMeasurement(controller, slideId, elementId)
      const unmatchedHighlights = (highlights ?? []).filter((h) => h.text && !text.includes(h.text)).map((h) => h.text)
      return { ok: true, elementId, box, slideWarnings, ...(unmatchedHighlights.length > 0 ? { unmatchedHighlights } : {}) }
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
      rotation: z.number().optional().describe('Additional rotation in degrees, -180 to 180. Defaults to 0; the photographic perspective is already baked in.'),
      tiltX: z.number().optional().describe('Reserved device field, -12 to 12. Photo mockups use their baked PSD perspective.'),
      tiltY: z.number().optional().describe('Reserved device field, -18 to 18. Photo mockups use their baked PSD perspective.'),
      shadow: z.number().optional().describe('Reserved device field, 0-100. Photo mockups include their original lighting and shadow.'),
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
        rotation: clampRotation(rotation ?? 0),
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
      shape: shapeEnum,
      color: z.string().describe('Shape color as a hex string.'),
      strokeColor: z.string().optional().describe('Outline color for filled shapes as a hex string.'),
      strokeWidth: z.number().optional().describe('Outline width, or line thickness for line/ring/arrow/wave, 0-12.'),
      shadow: z.number().optional().describe('Drop shadow intensity, 0-100.'),
      x: z.number().describe(COORD_NOTE),
      y: z.number().describe(COORD_NOTE),
      width: z.number().describe(COORD_NOTE),
      rotation: z.number().optional().describe('Rotation in degrees, -180 to 180. Defaults to 0.'),
      opacity: z.number().optional().describe('Opacity from 0 to 1. Defaults to 1.'),
    }),
    execute: async ({ slideId, shape, color, strokeColor, strokeWidth, shadow, x, y, width, rotation, opacity }) => {
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
        strokeColor: strokeColor ?? '#171713',
        strokeWidth: clampShapeStroke(strokeWidth ?? (['line', 'arrow', 'wave'].includes(shape) ? 6 : shape === 'ring' ? 4 : 0)),
        shadow: clampShadow(shadow ?? 10),
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
      shadow: z.number().optional().describe('Drop shadow intensity, 0-100. Defaults to 32.'),
      rotation: z.number().optional().describe('Rotation in degrees, -180 to 180. Defaults to 0.'),
      opacity: z.number().optional().describe('Opacity from 0 to 1. Defaults to 1.'),
    }),
    execute: async ({ slideId, assetId, x, y, width, borderRadius, shadow, rotation, opacity }) => {
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
        shadow: clampShadow(shadow ?? 32),
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
      highlights: highlightsParam,
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
      underline: z.boolean().optional().describe('Text elements only.'),
      strikethrough: z.boolean().optional().describe('Text elements only.'),
      textTransform: z.enum(['none', 'uppercase', 'lowercase']).optional().describe('Text elements only.'),
      backgroundColor: z.string().optional().describe('Text elements only. Text-box background hex color.'),
      backgroundOpacity: z.number().optional().describe('Text elements only, 0-1.'),
      padding: z.number().optional().describe('Text elements only, 0-24 internal px.'),
      strokeColor: z.string().optional().describe('Text or shape elements only. Hex outline color.'),
      strokeWidth: z.number().optional().describe('Text elements 0-3; shape elements 0-12.'),
      shadowColor: z.string().optional().describe('Text elements only. Hex shadow color.'),
      deviceStyle: deviceStyleEnum.optional(),
      screenTheme: screenThemeEnum.optional(),
      tiltX: z.number().optional().describe('Device elements only, -12 to 12.'),
      tiltY: z.number().optional().describe('Device elements only, -18 to 18.'),
      shadow: z.number().optional().describe('Text, device, image, or shape elements, 0-100.'),
      borderRadius: z.number().optional().describe('Text elements 0-40; image elements 0-100.'),
      shape: shapeEnum.optional().describe('Shape elements only.'),
    }),
    execute: async ({ slideId, elementId, ...fields }) => {
      if (!getSlide(controller, slideId)) return notFound(slideNotFoundMessage(slideId))
      const existing = getElement(controller, slideId, elementId)
      if (!existing) return notFound(elementNotFoundMessage(elementId, slideId))

      const patch: Record<string, unknown> = {}
      if (fields.x !== undefined) patch.x = clampX(fields.x)
      if (fields.y !== undefined) patch.y = clampY(fields.y)
      if (fields.width !== undefined) patch.width = clampWidth(fields.width)
      if (fields.rotation !== undefined) patch.rotation = clampRotation(fields.rotation)
      if (fields.opacity !== undefined) patch.opacity = clampOpacity(fields.opacity)
      if (fields.text !== undefined) patch.text = fields.text
      let unmatchedHighlights: string[] = []
      if (fields.highlights !== undefined && existing.type === 'text') {
        const plainText = fields.text ?? (typeof existing.text === 'string' ? existing.text : '')
        patch.html = buildHighlightHtml(plainText, fields.highlights)
        unmatchedHighlights = fields.highlights.filter((h) => h.text && !plainText.includes(h.text)).map((h) => h.text)
      }
      if (fields.color !== undefined) patch.color = fields.color
      if (fields.fontFamily !== undefined) patch.fontFamily = fields.fontFamily
      if (fields.fontSize !== undefined) patch.fontSize = clampFontSize(fields.fontSize)
      if (fields.fontWeight !== undefined) patch.fontWeight = clampFontWeight(fields.fontWeight)
      if (fields.align !== undefined) patch.align = fields.align
      if (fields.lineHeight !== undefined) patch.lineHeight = clampLineHeight(fields.lineHeight)
      if (fields.letterSpacing !== undefined) patch.letterSpacing = clampLetterSpacing(fields.letterSpacing)
      if (fields.italic !== undefined) patch.italic = fields.italic
      if (fields.underline !== undefined) patch.underline = fields.underline
      if (fields.strikethrough !== undefined) patch.strikethrough = fields.strikethrough
      if (fields.textTransform !== undefined) patch.textTransform = fields.textTransform
      if (fields.backgroundColor !== undefined) patch.backgroundColor = fields.backgroundColor
      if (fields.backgroundOpacity !== undefined) patch.backgroundOpacity = clampOpacity(fields.backgroundOpacity)
      if (fields.padding !== undefined) patch.padding = clampTextPadding(fields.padding)
      if (fields.strokeColor !== undefined) patch.strokeColor = fields.strokeColor
      if (fields.strokeWidth !== undefined) patch.strokeWidth = existing.type === 'text' ? clampTextStroke(fields.strokeWidth) : clampShapeStroke(fields.strokeWidth)
      if (fields.shadowColor !== undefined) patch.shadowColor = fields.shadowColor
      if (fields.deviceStyle !== undefined) patch.deviceStyle = fields.deviceStyle
      if (fields.screenTheme !== undefined) patch.screenTheme = fields.screenTheme
      if (fields.tiltX !== undefined) patch.tiltX = clampTiltX(fields.tiltX)
      if (fields.tiltY !== undefined) patch.tiltY = clampTiltY(fields.tiltY)
      if (fields.shadow !== undefined) patch.shadow = clampShadow(fields.shadow)
      if (fields.borderRadius !== undefined) patch.borderRadius = existing.type === 'text' ? clamp(fields.borderRadius, 0, 40) : clampBorderRadius(fields.borderRadius)
      if (fields.shape !== undefined) patch.shape = fields.shape

      controller.updateElement(slideId, elementId, patch)
      const { box, slideWarnings } = await withMeasurement(controller, slideId, elementId)
      return { ok: true, elementId, box, slideWarnings, ...(unmatchedHighlights.length > 0 ? { unmatchedHighlights } : {}) }
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
