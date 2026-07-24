import { describe, expect, it } from 'vitest'
import {
  createAiProviderKeys,
  getAiProviderAvailability,
  getInitialAiSelection,
} from './provider-config'

describe('AI provider configuration', () => {
  it('reads and trims public keys from the local Vite environment', () => {
    expect(createAiProviderKeys({
      VITE_MOONSHOT_API_KEY: ' moonshot-key ',
      VITE_GOOGLE_GENERATIVE_AI_API_KEY: ' google-key ',
      VITE_ALIBABA_API_KEY: 'qwen-key',
      VITE_OPENAI_API_KEY: 'openai-key',
      VITE_ANTHROPIC_API_KEY: 'anthropic-key',
      VITE_XAI_API_KEY: ' xai-key ',
    })).toEqual({
      moonshot: 'moonshot-key',
      google: 'google-key',
      qwen: 'qwen-key',
      openai: 'openai-key',
      anthropic: 'anthropic-key',
      xai: 'xai-key',
    })
  })

  it('treats missing, blank, and non-string values as unconfigured', () => {
    const keys = createAiProviderKeys({
      VITE_GOOGLE_GENERATIVE_AI_API_KEY: ' ',
      VITE_ALIBABA_API_KEY: true,
      VITE_OPENAI_API_KEY: 'openai-key',
    })

    expect(keys).toEqual({
      moonshot: '',
      google: '',
      qwen: '',
      openai: 'openai-key',
      anthropic: '',
      xai: '',
    })
    expect(getAiProviderAvailability(keys)).toEqual({
      moonshot: false,
      google: false,
      qwen: false,
      openai: true,
      anthropic: false,
      xai: false,
    })
  })

  it('starts with the first configured provider and otherwise falls back to Google', () => {
    expect(getInitialAiSelection({
      moonshot: false,
      google: false,
      qwen: false,
      openai: true,
      anthropic: true,
      xai: true,
    })).toEqual({
      provider: 'openai',
      model: 'gpt-5.6-terra',
      reasoningEffort: 'high',
    })
    expect(getInitialAiSelection({
      moonshot: false,
      google: false,
      qwen: false,
      openai: false,
      anthropic: false,
      xai: false,
    })).toEqual({
      provider: 'google',
      model: 'gemini-3.6-flash',
      reasoningEffort: 'high',
    })
    expect(getInitialAiSelection({
      moonshot: true,
      google: true,
      qwen: false,
      openai: false,
      anthropic: false,
      xai: false,
    })).toEqual({
      provider: 'moonshot',
      model: 'kimi-k3',
    })
  })
})
