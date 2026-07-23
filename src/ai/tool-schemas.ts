import { z } from 'zod'

export const COORDINATE_NOTE = 'Percent of the 1290x2796 canvas. x/y is the top-left corner of the element, width is percent of canvas width; height is automatic. x/y may be negative (down to -35) and width may exceed 100 (up to 140), so elements can deliberately bleed off the canvas edges for cropped, dynamic compositions.'

export const MEASUREMENT_NOTE = "The result includes the element's actually rendered bounding box and any slide layout warnings — address warnings before moving on."

export const fontFamilySchema = z
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

export const shapeSchema = z.enum([
  'circle',
  'square',
  'rounded-square',
  'pill',
  'triangle',
  'diamond',
  'star',
  'burst',
  'spark',
  'blob',
  'arch',
  'ring',
  'line',
  'arrow',
  'wave',
])

export const backgroundPatternSchema = z.enum([
  'none',
  'dots',
  'grid',
  'diagonal',
  'waves',
])

export const deviceStyleSchema = z
  .enum([
    'iphone-17-a',
    'iphone-17-b',
    'iphone-17-c',
    'iphone-17-d',
    'iphone-17-e',
    'iphone-17-f',
    'tilted-hand',
  ])
  .describe(
    "Photorealistic iPhone mockup. 'iphone-17-a' and 'iphone-17-b' are upright/front views (width 58-72 fully in frame). 'iphone-17-c', 'iphone-17-d', and 'iphone-17-e' are low angled views (width 90-112, or up to 115-140 with negative x/y for a dramatic cropped close-up). 'iphone-17-f' is a leaning portrait phone (width 88-105). 'tilted-hand' is a hand holding the phone (width 110-125, usually cropped by a canvas edge). Perspective, light, and shadow are baked into every overlay.",
  )

export const screenThemeSchema = z
  .enum(['coral', 'mint', 'night', 'sun'])
  .describe('Tint applied to the device chrome/background behind the screenshot.')

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

export const highlightsSchema = z
  .array(textHighlightSchema)
  .optional()
  .describe(
    'Style parts of the text differently from the rest: accent-colored key words, highlight pills, mixed bold/italic. Each entry must be an exact substring of the text. Pass [] to remove all part-level styling. Whenever you change `text` without passing highlights, existing highlights are cleared.',
  )
