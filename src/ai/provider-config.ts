import {
  AI_PROVIDERS,
  DEFAULT_AI_SELECTION,
  getDefaultAiModel,
  type AiModelSelection,
  type AiProviderId,
} from './provider-catalog'

export type AiProviderKeys = Record<AiProviderId, string>
export type AiProviderAvailability = Record<AiProviderId, boolean>

type AiProviderEnvironment = {
  VITE_MOONSHOT_API_KEY?: unknown
  VITE_GOOGLE_GENERATIVE_AI_API_KEY?: unknown
  VITE_ALIBABA_API_KEY?: unknown
  VITE_OPENAI_API_KEY?: unknown
  VITE_ANTHROPIC_API_KEY?: unknown
  VITE_XAI_API_KEY?: unknown
}

const readKey = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : ''

export const createAiProviderKeys = (
  environment: AiProviderEnvironment,
): AiProviderKeys => ({
  moonshot: readKey(environment.VITE_MOONSHOT_API_KEY),
  google: readKey(environment.VITE_GOOGLE_GENERATIVE_AI_API_KEY),
  qwen: readKey(environment.VITE_ALIBABA_API_KEY),
  openai: readKey(environment.VITE_OPENAI_API_KEY),
  anthropic: readKey(environment.VITE_ANTHROPIC_API_KEY),
  xai: readKey(environment.VITE_XAI_API_KEY),
})

export const getAiProviderAvailability = (
  keys: AiProviderKeys,
): AiProviderAvailability => ({
  moonshot: keys.moonshot.length > 0,
  google: keys.google.length > 0,
  qwen: keys.qwen.length > 0,
  openai: keys.openai.length > 0,
  anthropic: keys.anthropic.length > 0,
  xai: keys.xai.length > 0,
})

export const getInitialAiSelection = (
  availability: AiProviderAvailability,
): AiModelSelection => {
  const provider = AI_PROVIDERS.find((option) => availability[option.id])
  if (!provider) return DEFAULT_AI_SELECTION
  return {
    provider: provider.id,
    model: getDefaultAiModel(provider.id).id,
  }
}

export const AI_PROVIDER_KEYS = createAiProviderKeys({
  VITE_MOONSHOT_API_KEY: import.meta.env.VITE_MOONSHOT_API_KEY,
  VITE_GOOGLE_GENERATIVE_AI_API_KEY: import.meta.env.VITE_GOOGLE_GENERATIVE_AI_API_KEY,
  VITE_ALIBABA_API_KEY: import.meta.env.VITE_ALIBABA_API_KEY,
  VITE_OPENAI_API_KEY: import.meta.env.VITE_OPENAI_API_KEY,
  VITE_ANTHROPIC_API_KEY: import.meta.env.VITE_ANTHROPIC_API_KEY,
  VITE_XAI_API_KEY: import.meta.env.VITE_XAI_API_KEY,
})
export const AI_PROVIDER_AVAILABILITY = getAiProviderAvailability(AI_PROVIDER_KEYS)
export const INITIAL_AI_SELECTION = getInitialAiSelection(AI_PROVIDER_AVAILABILITY)

export const getAiProviderKey = (providerId: AiProviderId): string =>
  AI_PROVIDER_KEYS[providerId]
