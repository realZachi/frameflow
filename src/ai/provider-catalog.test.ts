import { describe, expect, it } from 'vitest'
import {
  AI_PROVIDERS,
  DEFAULT_AI_SELECTION,
  getAiModel,
  getAiProvider,
  getDefaultAiModel,
  isAiProviderId,
} from './provider-catalog'

describe('AI provider catalog', () => {
  it('contains the existing and four new providers with local Vite environment variables', () => {
    expect(AI_PROVIDERS.map((provider) => provider.id)).toEqual([
      'moonshot',
      'google',
      'qwen',
      'openai',
      'anthropic',
    ])
    expect(AI_PROVIDERS.map((provider) => provider.envVar)).toEqual([
      'VITE_MOONSHOT_API_KEY',
      'VITE_GOOGLE_GENERATIVE_AI_API_KEY',
      'VITE_ALIBABA_API_KEY',
      'VITE_OPENAI_API_KEY',
      'VITE_ANTHROPIC_API_KEY',
    ])
    expect(AI_PROVIDERS.filter((provider) => provider.transport === 'proxy').map(
      (provider) => provider.id,
    )).toEqual(['moonshot'])
  })

  it('provides a valid default model for every provider', () => {
    for (const provider of AI_PROVIDERS) {
      expect(getDefaultAiModel(provider.id)).toBe(provider.models[0])
      expect(provider.models.length).toBeGreaterThanOrEqual(1)
    }
    expect(getAiModel(DEFAULT_AI_SELECTION).id).toBe(DEFAULT_AI_SELECTION.model)
  })

  it('validates provider and model identifiers at the UI boundary', () => {
    expect(isAiProviderId('openai')).toBe(true)
    expect(isAiProviderId('moonshot')).toBe(true)
    expect(isAiProviderId('unknown')).toBe(false)
    expect(isAiProviderId(null)).toBe(false)
    expect(() => getAiModel({ provider: 'google', model: 'not-a-model' })).toThrow(
      'Unknown google model',
    )
    expect(getAiProvider('qwen').label).toBe('Qwen')
  })
})
