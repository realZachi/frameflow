import { describe, expect, it } from 'vitest'
import { CODING_ASSISTANT_PROMPT } from './CopyCodingPrompt'

describe('coding assistant prompt', () => {
  it('asks for a paste-ready plain-prose app description', () => {
    expect(CODING_ASSISTANT_PROMPT).toContain('plain-prose paragraph')
    expect(CODING_ASSISTANT_PROMPT).toContain('paste straight into the generator')
  })

  it('covers audience, key features, and the visual theme', () => {
    expect(CODING_ASSISTANT_PROMPT).toContain('who it is for')
    expect(CODING_ASSISTANT_PROMPT).toContain('most important features')
    expect(CODING_ASSISTANT_PROMPT).toContain('the theme the screenshots should match')
  })

  it('forbids inventing features and code-level detail', () => {
    expect(CODING_ASSISTANT_PROMPT).toContain('do not invent features')
    expect(CODING_ASSISTANT_PROMPT).toContain('not the code, tech stack, or file layout')
  })
})
