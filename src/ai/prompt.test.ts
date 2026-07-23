import { describe, expect, it } from 'vitest'
import { buildInstructions } from './prompt'

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
