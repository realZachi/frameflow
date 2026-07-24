import { describe, expect, it } from 'vitest'
import {
  AI_PROVIDERS,
  DEFAULT_AI_SELECTION,
  clampAiReasoningEffort,
  findAiModelById,
  getAiModel,
  getAiProvider,
  getAiSdkReasoningEffort,
  getDefaultAiModel,
  isAiProviderId,
} from './provider-catalog'

describe('AI provider catalog', () => {
  it('contains the existing and five new providers with local Vite environment variables', () => {
    expect(AI_PROVIDERS.map((provider) => provider.id)).toEqual([
      'moonshot',
      'google',
      'qwen',
      'openai',
      'anthropic',
      'xai',
    ])
    expect(AI_PROVIDERS.map((provider) => provider.envVar)).toEqual([
      'VITE_MOONSHOT_API_KEY',
      'VITE_GOOGLE_GENERATIVE_AI_API_KEY',
      'VITE_ALIBABA_API_KEY',
      'VITE_OPENAI_API_KEY',
      'VITE_ANTHROPIC_API_KEY',
      'VITE_XAI_API_KEY',
    ])
    expect(AI_PROVIDERS.filter((provider) => provider.transport === 'proxy').map(
      (provider) => provider.id,
    )).toEqual(['moonshot'])
    expect(getAiProvider('xai').models[0]?.id).toBe('grok-4.5')
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
    expect(findAiModelById('gpt-5.6-sol')).toEqual({
      provider: getAiProvider('openai'),
      model: getAiModel({ provider: 'openai', model: 'gpt-5.6-sol' }),
    })
    expect(() => findAiModelById('not-a-model')).toThrow('Unknown AI model')
  })

  it('clamps reasoning effort to the selected model and defaults to high', () => {
    const openAiModel = getAiModel({ provider: 'openai', model: 'gpt-5.6-terra' })
    expect(clampAiReasoningEffort(openAiModel, 'high')).toBe('high')
    expect(clampAiReasoningEffort(openAiModel, 'minimal')).toBe('high')
    expect(clampAiReasoningEffort(openAiModel, undefined)).toBe('high')
    expect(clampAiReasoningEffort(
      getAiModel({ provider: 'moonshot', model: 'kimi-k3' }),
      'high',
    )).toBeUndefined()
  })

  it('exposes only model-supported reasoning efforts to the AI SDK', () => {
    expect(getAiProvider('openai').models[0]?.reasoningEfforts).toEqual([
      'low',
      'medium',
      'high',
      'xhigh',
    ])
    expect(getAiSdkReasoningEffort({
      provider: 'openai',
      model: 'gpt-5.6-sol',
      reasoningEffort: 'xhigh',
    })).toBe('xhigh')
    expect(getAiSdkReasoningEffort({
      provider: 'openai',
      model: 'gpt-5.6-terra',
    })).toBe('high')
    expect(getAiSdkReasoningEffort({
      provider: 'google',
      model: 'gemini-3.6-flash',
      reasoningEffort: 'xhigh',
    })).toBe('high')
    expect(() => getAiSdkReasoningEffort({
      provider: 'moonshot',
      model: 'kimi-k3',
      reasoningEffort: 'high',
    })).toThrow('does not support reasoning effort')
  })
})
