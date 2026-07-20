import { clamp, hexToRgba, sanitizeRichText } from '../utils'

export type TextHighlight = {
  text: string
  color?: string
  backgroundColor?: string
  backgroundOpacity?: number
  borderRadius?: number
  padding?: number
  bold?: boolean
  italic?: boolean
  underline?: boolean
  strikethrough?: boolean
  opacity?: number
}

const escapeHtml = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const toHtmlText = (value: string) => escapeHtml(value).replace(/\n/g, '<br>')

type HighlightRange = { start: number; end: number; highlight: TextHighlight }

// Every exact occurrence of each highlight's `text` becomes a range; later entries never
// split ranges claimed by earlier entries.
const findRanges = (text: string, highlights: TextHighlight[]): HighlightRange[] => {
  const ranges: HighlightRange[] = []
  const overlaps = (start: number, end: number) => ranges.some((range) => start < range.end && end > range.start)
  for (const highlight of highlights) {
    if (!highlight.text) continue
    let from = 0
    while (from <= text.length) {
      const index = text.indexOf(highlight.text, from)
      if (index === -1) break
      const end = index + highlight.text.length
      if (!overlaps(index, end)) ranges.push({ start: index, end, highlight })
      from = end
    }
  }
  return ranges.sort((a, b) => a.start - b.start)
}

const wrapHighlight = (chunk: string, highlight: TextHighlight): string => {
  const styles: string[] = []
  if (highlight.color) styles.push(`color: ${highlight.color}`)
  if (highlight.backgroundColor) {
    styles.push(`background-color: ${hexToRgba(highlight.backgroundColor, clamp(highlight.backgroundOpacity ?? 1, 0, 1))}`)
  }
  if (highlight.borderRadius !== undefined) styles.push(`border-radius: ${clamp(highlight.borderRadius, 0, 24)}px`)
  if (highlight.padding !== undefined) {
    const padding = clamp(highlight.padding, 0, 12)
    styles.push(`padding: ${Math.round(padding * 0.25 * 10) / 10}px ${padding}px`)
  }
  if (highlight.opacity !== undefined) styles.push(`opacity: ${clamp(highlight.opacity, 0, 1)}`)

  let inner = toHtmlText(chunk)
  if (highlight.bold) inner = `<b>${inner}</b>`
  if (highlight.italic) inner = `<i>${inner}</i>`
  if (highlight.underline) inner = `<u>${inner}</u>`
  if (highlight.strikethrough) inner = `<s>${inner}</s>`
  return styles.length > 0 ? `<span style="${styles.join('; ')}">${inner}</span>` : inner
}

// Turns plain text plus highlight specs into the sanitized rich-text HTML the canvas renders.
// Returns undefined when nothing matches, which clears any stored formatting.
export const buildHighlightHtml = (text: string, highlights: TextHighlight[]): string | undefined => {
  const ranges = findRanges(text, highlights)
  if (ranges.length === 0) return undefined
  let html = ''
  let cursor = 0
  for (const range of ranges) {
    html += toHtmlText(text.slice(cursor, range.start))
    html += wrapHighlight(text.slice(range.start, range.end), range.highlight)
    cursor = range.end
  }
  html += toHtmlText(text.slice(cursor))
  return sanitizeRichText(html)
}
