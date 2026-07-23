export type AiProviderId = 'moonshot' | 'google' | 'qwen' | 'openai' | 'anthropic'

export type AiModelSelection = {
  provider: AiProviderId
  model: string
}

export type AiModelOption = {
  id: string
  label: string
  description: string
}

export type AiProviderOption = {
  id: AiProviderId
  label: string
  envVar: string
  transport: 'direct' | 'proxy'
  models: readonly AiModelOption[]
}

export const AI_PROVIDERS: readonly AiProviderOption[] = [
  {
    id: 'moonshot',
    label: 'Moonshot',
    envVar: 'VITE_MOONSHOT_API_KEY',
    transport: 'proxy',
    models: [
      {
        id: 'kimi-k3',
        label: 'Kimi K3',
        description: 'Existing Frameflow model · local CORS proxy required',
      },
    ],
  },
  {
    id: 'google',
    label: 'Google',
    envVar: 'VITE_GOOGLE_GENERATIVE_AI_API_KEY',
    transport: 'direct',
    models: [
      {
        id: 'gemini-3.6-flash',
        label: 'Gemini 3.6 Flash',
        description: 'Recommended · latest fast Gemini model',
      },
      {
        id: 'gemini-3.1-pro-preview',
        label: 'Gemini 3.1 Pro Preview',
        description: 'Highest quality for complex layouts',
      },
      {
        id: 'gemini-3.5-flash-lite',
        label: 'Gemini 3.5 Flash Lite',
        description: 'Fast and cost-efficient',
      },
    ],
  },
  {
    id: 'qwen',
    label: 'Qwen',
    envVar: 'VITE_ALIBABA_API_KEY',
    transport: 'direct',
    models: [
      {
        id: 'qwen3.7-plus',
        label: 'Qwen 3.7 Plus',
        description: 'Recommended · flagship vision model',
      },
      {
        id: 'qwen3.6-plus',
        label: 'Qwen 3.6 Plus',
        description: 'Strong quality and long context',
      },
      {
        id: 'qwen3.6-flash',
        label: 'Qwen 3.6 Flash',
        description: 'Fast and cost-efficient',
      },
    ],
  },
  {
    id: 'openai',
    label: 'OpenAI',
    envVar: 'VITE_OPENAI_API_KEY',
    transport: 'direct',
    models: [
      {
        id: 'gpt-5.6-terra',
        label: 'GPT-5.6 Terra',
        description: 'Recommended · balanced quality and cost',
      },
      {
        id: 'gpt-5.6-sol',
        label: 'GPT-5.6 Sol',
        description: 'Highest quality for agentic work',
      },
      {
        id: 'gpt-5.6-luna',
        label: 'GPT-5.6 Luna',
        description: 'Fast and cost-efficient',
      },
    ],
  },
  {
    id: 'anthropic',
    label: 'Anthropic',
    envVar: 'VITE_ANTHROPIC_API_KEY',
    transport: 'direct',
    models: [
      {
        id: 'claude-sonnet-5',
        label: 'Claude Sonnet 5',
        description: 'Recommended · latest balanced Claude model',
      },
      {
        id: 'claude-opus-4-8',
        label: 'Claude Opus 4.8',
        description: 'Highest quality for complex work',
      },
      {
        id: 'claude-haiku-4-5',
        label: 'Claude Haiku 4.5',
        description: 'Fast and cost-efficient',
      },
    ],
  },
]

export const DEFAULT_AI_SELECTION: AiModelSelection = {
  provider: 'google',
  model: 'gemini-3.6-flash',
}

export const isAiProviderId = (value: unknown): value is AiProviderId =>
  typeof value === 'string' && AI_PROVIDERS.some((provider) => provider.id === value)

export const getAiProvider = (providerId: AiProviderId): AiProviderOption => {
  const provider = AI_PROVIDERS.find((option) => option.id === providerId)
  if (!provider) throw new Error(`Unknown AI provider: ${providerId}`)
  return provider
}

export const getDefaultAiModel = (providerId: AiProviderId): AiModelOption => {
  const model = getAiProvider(providerId).models[0]
  if (!model) throw new Error(`AI provider has no models: ${providerId}`)
  return model
}

export const getAiModel = (selection: AiModelSelection): AiModelOption => {
  const model = getAiProvider(selection.provider).models.find(
    (option) => option.id === selection.model,
  )
  if (!model) {
    throw new Error(`Unknown ${selection.provider} model: ${selection.model}`)
  }
  return model
}
