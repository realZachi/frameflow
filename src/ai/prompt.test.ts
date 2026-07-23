import { describe, expect, it } from 'vitest'
import { buildInstructions, buildUserMessage } from './prompt'

describe('AI prompt language', () => {
  it('requires English canvas copy and completion summaries', () => {
    const instructions = buildInstructions()

    expect(instructions).toContain(
      'Write all on-canvas copy (headlines, supporting text, labels) in English',
    )
    expect(instructions).toContain(
      'reply in English with a short 2-3 sentence summary',
    )
    expect(instructions).not.toContain(
      'in the same language the user used to describe their app',
    )
  })

  it('keeps the English completion requirement in edit mode', () => {
    const instructions = buildInstructions({ targetSlideId: 'slide-1' })

    expect(instructions).toContain(
      'reply in English with a short 1-2 sentence summary',
    )
  })
})

describe('AI prompt branding', () => {
  it('requires logo placement via add_image in generate mode', () => {
    const instructions = buildInstructions()

    expect(instructions).toContain('When a logo asset is provided, incorporate it with add_image')
    expect(instructions).toContain('Do not place the logo asset inside a device frame')
  })

  it('includes app name and logo asset in the user message', () => {
    const message = buildUserMessage(
      'A calm habit tracker',
      [{ assetId: 'upload-1', name: 'home.png' }],
      { appName: 'Habitly', logoAssetId: 'upload-logo' },
    )

    expect(message).toContain('App name: Habitly')
    expect(message).toContain('App logo asset id: upload-logo')
    expect(message).toContain('use add_image with this id')
    expect(message).toContain('upload-1 — home.png')
  })
})
