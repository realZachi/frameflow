import { tool } from 'ai'
import { z } from 'zod'
import { clamp } from '../utils'
import { buildHighlightHtml } from './richtext'
import {
  clampBorderRadius,
  clampFontSize,
  clampFontWeight,
  clampLetterSpacing,
  clampLineHeight,
  clampOpacity,
  clampRotation,
  clampShadow,
  clampShapeStroke,
  clampTextPadding,
  clampTextStroke,
  clampTiltX,
  clampTiltY,
  clampWidth,
  clampX,
  clampY,
  elementNotFoundMessage,
  getElement,
  getSlide,
  notFound,
  numberField,
  slideNotFoundMessage,
  withMeasurement,
  type ToolContext,
} from './tool-context'
import {
  COORDINATE_NOTE,
  deviceStyleSchema,
  fontFamilySchema,
  highlightsSchema,
  MEASUREMENT_NOTE,
  screenThemeSchema,
  shapeSchema,
} from './tool-schemas'

const updateElementSchema = z.object({
  slideId: z.string(),
  elementId: z.string(),
  x: z.number().optional().describe(COORDINATE_NOTE),
  y: z.number().optional().describe(COORDINATE_NOTE),
  width: z.number().optional().describe(COORDINATE_NOTE),
  rotation: z.number().optional().describe('Rotation in degrees, -180 to 180.'),
  opacity: z.number().optional().describe('Opacity from 0 to 1.'),
  text: z.string().optional().describe('Text elements only.'),
  highlights: highlightsSchema,
  color: z.string().optional().describe('Hex color. Text and shape elements only.'),
  fontFamily: fontFamilySchema.optional(),
  fontSize: z.number().optional().describe(
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
  deviceStyle: deviceStyleSchema.optional(),
  screenTheme: screenThemeSchema.optional(),
  tiltX: z.number().optional().describe('Device elements only, -12 to 12.'),
  tiltY: z.number().optional().describe('Device elements only, -18 to 18.'),
  shadow: z.number().optional().describe('Text, device, image, or shape elements, 0-100.'),
  borderRadius: z.number().optional().describe('Text elements 0-40; image elements 0-100.'),
  shape: shapeSchema.optional().describe('Shape elements only.'),
})

type UpdateElementInput = z.infer<typeof updateElementSchema>
type UpdateFields = Omit<UpdateElementInput, 'slideId' | 'elementId'>

const assignDefined = (
  patch: Record<string, unknown>,
  entries: [string, unknown][],
) => {
  for (const [key, value] of entries) {
    if (value !== undefined) patch[key] = value
  }
}

const buildBasePatch = (fields: UpdateFields) => {
  const patch: Record<string, unknown> = {}
  assignDefined(patch, [
    ['x', fields.x === undefined ? undefined : clampX(fields.x)],
    ['y', fields.y === undefined ? undefined : clampY(fields.y)],
    ['width', fields.width === undefined ? undefined : clampWidth(fields.width)],
    ['rotation', fields.rotation === undefined ? undefined : clampRotation(fields.rotation)],
    ['opacity', fields.opacity === undefined ? undefined : clampOpacity(fields.opacity)],
  ])
  return patch
}

const addTextFields = (
  patch: Record<string, unknown>,
  fields: UpdateFields,
  existingText: string,
) => {
  assignDefined(patch, [
    ['text', fields.text],
    ['color', fields.color],
    ['fontFamily', fields.fontFamily],
    ['fontSize', fields.fontSize === undefined ? undefined : clampFontSize(fields.fontSize)],
    ['fontWeight', fields.fontWeight === undefined ? undefined : clampFontWeight(fields.fontWeight)],
    ['align', fields.align],
    ['lineHeight', fields.lineHeight === undefined ? undefined : clampLineHeight(fields.lineHeight)],
    ['letterSpacing', fields.letterSpacing === undefined ? undefined : clampLetterSpacing(fields.letterSpacing)],
    ['italic', fields.italic],
    ['underline', fields.underline],
    ['strikethrough', fields.strikethrough],
    ['textTransform', fields.textTransform],
    ['backgroundColor', fields.backgroundColor],
    ['backgroundOpacity', fields.backgroundOpacity === undefined
      ? undefined
      : clampOpacity(fields.backgroundOpacity)],
    ['padding', fields.padding === undefined ? undefined : clampTextPadding(fields.padding)],
    ['strokeColor', fields.strokeColor],
    ['strokeWidth', fields.strokeWidth === undefined
      ? undefined
      : clampTextStroke(fields.strokeWidth)],
    ['shadowColor', fields.shadowColor],
    ['shadow', fields.shadow === undefined ? undefined : clampShadow(fields.shadow)],
    ['borderRadius', fields.borderRadius === undefined
      ? undefined
      : clamp(fields.borderRadius, 0, 40)],
  ])

  if (fields.highlights === undefined) return []
  const text = fields.text ?? existingText
  patch['html'] = buildHighlightHtml(text, fields.highlights)
  return fields.highlights
    .filter((highlight) => highlight.text && !text.includes(highlight.text))
    .map((highlight) => highlight.text)
}

const addTypeFields = (
  patch: Record<string, unknown>,
  fields: UpdateFields,
  elementType: string,
) => {
  if (elementType === 'shape') {
    assignDefined(patch, [
      ['color', fields.color],
      ['strokeColor', fields.strokeColor],
      ['strokeWidth', fields.strokeWidth === undefined
        ? undefined
        : clampShapeStroke(fields.strokeWidth)],
      ['shadow', fields.shadow === undefined ? undefined : clampShadow(fields.shadow)],
      ['shape', fields.shape],
    ])
  }
  if (elementType === 'device') {
    assignDefined(patch, [
      ['deviceStyle', fields.deviceStyle],
      ['screenTheme', fields.screenTheme],
      ['tiltX', fields.tiltX === undefined ? undefined : clampTiltX(fields.tiltX)],
      ['tiltY', fields.tiltY === undefined ? undefined : clampTiltY(fields.tiltY)],
      ['shadow', fields.shadow === undefined ? undefined : clampShadow(fields.shadow)],
    ])
  }
  if (elementType === 'image') {
    assignDefined(patch, [
      ['shadow', fields.shadow === undefined ? undefined : clampShadow(fields.shadow)],
      ['borderRadius', fields.borderRadius === undefined
        ? undefined
        : clampBorderRadius(fields.borderRadius)],
    ])
  }
}

export const createUpdateElementTool = ({ controller, emit }: ToolContext) => tool({
  description: `Update fields on an existing element. Only pass the fields you want to change; unknown or type-inapplicable fields are ignored. ${MEASUREMENT_NOTE}`,
  inputSchema: updateElementSchema,
  execute: async ({ slideId, elementId, ...fields }) => {
    if (!getSlide(controller, slideId)) return notFound(slideNotFoundMessage(slideId))
    const existing = getElement(controller, slideId, elementId)
    if (!existing) return notFound(elementNotFoundMessage(elementId, slideId))

    const patch = buildBasePatch(fields)
    const existingText = typeof existing['text'] === 'string' ? existing['text'] : ''
    const unmatchedHighlights = existing['type'] === 'text'
      ? addTextFields(patch, fields, existingText)
      : []
    const elementType = typeof existing['type'] === 'string' ? existing['type'] : ''
    addTypeFields(patch, fields, elementType)

    emit({
      tool: 'update_element',
      slideId,
      elementId,
      x: clamp(
        numberField(patch['x'] ?? existing['x'])
        + numberField(patch['width'] ?? existing['width']) / 2,
        2,
        98,
      ),
      y: clamp(numberField(patch['y'] ?? existing['y']) + 4, 2, 96),
    })
    controller.updateElement(slideId, elementId, patch)
    const { box, slideWarnings } = await withMeasurement(controller, slideId, elementId)
    return {
      ok: true,
      elementId,
      box,
      slideWarnings,
      ...(unmatchedHighlights.length > 0 ? { unmatchedHighlights } : {}),
    }
  },
})
