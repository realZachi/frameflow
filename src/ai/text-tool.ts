import { tool } from 'ai'
import { z } from 'zod'
import { clamp } from '../utils'
import { buildHighlightHtml } from './richtext'
import {
  clampFontSize,
  clampFontWeight,
  clampLetterSpacing,
  clampLineHeight,
  clampOpacity,
  clampRotation,
  clampShadow,
  clampTextPadding,
  clampTextStroke,
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
  fontFamilySchema,
  highlightsSchema,
  MEASUREMENT_NOTE,
} from './tool-schemas'
import type { TextElement } from '../types'

export const createAddTextTool = ({ controller, emit }: ToolContext) => tool({
  description: `Add a text element to a slide. ${COORDINATE_NOTE} ${MEASUREMENT_NOTE}`,
  inputSchema: z.object({
    slideId: z.string(),
    text: z.string().describe('The copy to display. Use \\n for line breaks.'),
    highlights: highlightsSchema,
    x: z.number().describe(COORDINATE_NOTE),
    y: z.number().describe(COORDINATE_NOTE),
    width: z.number().describe(COORDINATE_NOTE),
    fontFamily: fontFamilySchema,
    fontSize: z.number().describe(
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
  execute: async ({
    slideId,
    text,
    highlights,
    x,
    y,
    width,
    fontFamily,
    fontSize,
    fontWeight,
    color,
    align,
    lineHeight,
    letterSpacing,
    italic,
    underline,
    strikethrough,
    textTransform,
    backgroundColor,
    backgroundOpacity,
    padding,
    borderRadius,
    strokeColor,
    strokeWidth,
    shadow,
    shadowColor,
    rotation,
    opacity,
  }) => {
    if (!getSlide(controller, slideId)) return notFound(slideNotFoundMessage(slideId))

    const html = highlights !== undefined
      ? buildHighlightHtml(text, highlights)
      : undefined
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
    emit({
      tool: 'add_text',
      slideId,
      x: clamp(clampX(x) + clampWidth(width) / 2, 2, 98),
      y: clamp(clampY(y) + 4, 2, 96),
    })
    const elementId = controller.addElement(slideId, element)
    if (!elementId) return notFound(slideNotFoundMessage(slideId))

    const { box, slideWarnings } = await withMeasurement(controller, slideId, elementId)
    const unmatchedHighlights = (highlights ?? [])
      .filter((highlight) => highlight.text && !text.includes(highlight.text))
      .map((highlight) => highlight.text)
    return {
      ok: true,
      elementId,
      box,
      slideWarnings,
      ...(unmatchedHighlights.length > 0 ? { unmatchedHighlights } : {}),
    }
  },
})
