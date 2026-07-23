import { describe, expect, it } from 'vitest'
import { buildHighlightHtml } from './richtext'

describe('buildHighlightHtml', () => {
  it('returns undefined when no highlight matches', () => {
    expect(buildHighlightHtml('Frameflow', [{ text: 'missing', bold: true }]))
      .toBeUndefined()
    expect(buildHighlightHtml('Frameflow', [{ text: '', bold: true }]))
      .toBeUndefined()
  })

  it('styles every non-overlapping match and escapes surrounding text', () => {
    const html = buildHighlightHtml(
      '<Fast> Fast\nFast',
      [{ text: 'Fast', color: '#ff0000', bold: true }],
    )

    expect(html).toBe(
      '&lt;<span style="color: rgb(255, 0, 0)"><b>Fast</b></span>&gt; '
      + '<span style="color: rgb(255, 0, 0)"><b>Fast</b></span><br>'
      + '<span style="color: rgb(255, 0, 0)"><b>Fast</b></span>',
    )
  })

  it('clamps visual values and keeps supported text decorations', () => {
    const html = buildHighlightHtml('Launch', [{
      text: 'Launch',
      backgroundColor: '#abc',
      backgroundOpacity: 2,
      borderRadius: 99,
      padding: 20,
      opacity: -1,
      italic: true,
      underline: true,
      strikethrough: true,
    }])

    expect(html).toContain('background-color: rgb(170, 187, 204)')
    expect(html).toContain('border-radius: 24px')
    expect(html).toContain('padding: 3px 12px')
    expect(html).toContain('opacity: 0')
    expect(html).toContain('<s><u><i>Launch</i></u></s>')
  })

  it('gives earlier highlight entries precedence over overlaps', () => {
    const html = buildHighlightHtml('Frameflow', [
      { text: 'Frame', bold: true },
      { text: 'Frameflow', italic: true },
    ])

    expect(html).toBe('<b>Frame</b>flow')
  })
})
