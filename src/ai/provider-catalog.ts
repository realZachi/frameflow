export type AiProviderId = 'moonshot' | 'google' | 'qwen' | 'openai' | 'anthropic' | 'xai'

export type AiReasoningEffort =
  | 'minimal'
  | 'low'
  | 'medium'
  | 'high'
  | 'xhigh'

export type AiSdkReasoningEffort = AiReasoningEffort

export type AiModelSelection = {
  provider: AiProviderId
  model: string
  reasoningEffort?: AiReasoningEffort
}

export type AiModelOption = {
  id: string
  label: string
  description: string
  reasoningEfforts?: readonly AiReasoningEffort[]
}

export type AiProviderOption = {
  id: AiProviderId
  label: string
  envVar: string
  transport: 'direct' | 'proxy'
  models: readonly AiModelOption[]
}

export const DEFAULT_AI_REASONING_EFFORT = 'high' as const satisfies AiReasoningEffort

export const AI_REASONING_EFFORT_LABELS: Record<AiReasoningEffort, string> = {
  minimal: 'Minimal',
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  xhigh: 'XHigh',
}

const GOOGLE_REASONING_EFFORTS = [
  'minimal',
  'low',
  'medium',
  'high',
] as const satisfies readonly AiReasoningEffort[]

const STANDARD_REASONING_EFFORTS = [
  'low',
  'medium',
  'high',
  'xhigh',
] as const satisfies readonly AiReasoningEffort[]

const XAI_REASONING_EFFORTS = [
  'low',
  'medium',
  'high',
] as const satisfies readonly AiReasoningEffort[]

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
        reasoningEfforts: GOOGLE_REASONING_EFFORTS,
      },
      {
        id: 'gemini-3.1-pro-preview',
        label: 'Gemini 3.1 Pro Preview',
        description: 'Highest quality for complex layouts',
        reasoningEfforts: GOOGLE_REASONING_EFFORTS,
      },
      {
        id: 'gemini-3.5-flash-lite',
        label: 'Gemini 3.5 Flash Lite',
        description: 'Fast and cost-efficient',
        reasoningEfforts: GOOGLE_REASONING_EFFORTS,
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
        reasoningEfforts: STANDARD_REASONING_EFFORTS,
      },
      {
        id: 'qwen3.6-plus',
        label: 'Qwen 3.6 Plus',
        description: 'Strong quality and long context',
        reasoningEfforts: STANDARD_REASONING_EFFORTS,
      },
      {
        id: 'qwen3.6-flash',
        label: 'Qwen 3.6 Flash',
        description: 'Fast and cost-efficient',
        reasoningEfforts: STANDARD_REASONING_EFFORTS,
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
        reasoningEfforts: STANDARD_REASONING_EFFORTS,
      },
      {
        id: 'gpt-5.6-sol',
        label: 'GPT-5.6 Sol',
        description: 'Highest quality for agentic work',
        reasoningEfforts: STANDARD_REASONING_EFFORTS,
      },
      {
        id: 'gpt-5.6-luna',
        label: 'GPT-5.6 Luna',
        description: 'Fast and cost-efficient',
        reasoningEfforts: STANDARD_REASONING_EFFORTS,
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
        reasoningEfforts: STANDARD_REASONING_EFFORTS,
      },
      {
        id: 'claude-opus-4-8',
        label: 'Claude Opus 4.8',
        description: 'Highest quality for complex work',
        reasoningEfforts: STANDARD_REASONING_EFFORTS,
      },
      {
        id: 'claude-haiku-4-5',
        label: 'Claude Haiku 4.5',
        description: 'Fast and cost-efficient',
        reasoningEfforts: STANDARD_REASONING_EFFORTS,
      },
    ],
  },
  {
    id: 'xai',
    label: 'xAI',
    envVar: 'VITE_XAI_API_KEY',
    transport: 'direct',
    models: [
      {
        id: 'grok-4.5',
        label: 'Grok 4.5',
        description: 'Recommended · flagship reasoning model',
        reasoningEfforts: XAI_REASONING_EFFORTS,
      },
    ],
  },
]

export const DEFAULT_AI_SELECTION: AiModelSelection = {
  provider: 'google',
  model: 'gemini-3.6-flash',
  reasoningEffort: DEFAULT_AI_REASONING_EFFORT,
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

export const findAiModelById = (
  modelId: string,
): { provider: AiProviderOption; model: AiModelOption } => {
  for (const provider of AI_PROVIDERS) {
    const model = provider.models.find((option) => option.id === modelId)
    if (model) return { provider, model }
  }
  throw new Error(`Unknown AI model: ${modelId}`)
}

export const clampAiReasoningEffort = (
  model: AiModelOption,
  reasoningEffort: AiReasoningEffort | undefined,
): AiReasoningEffort | undefined => {
  if (!model.reasoningEfforts) return undefined
  if (reasoningEffort && model.reasoningEfforts.includes(reasoningEffort)) {
    return reasoningEffort
  }
  if (model.reasoningEfforts.includes(DEFAULT_AI_REASONING_EFFORT)) {
    return DEFAULT_AI_REASONING_EFFORT
  }
  if (model.reasoningEfforts.includes('medium')) return 'medium'
  return model.reasoningEfforts[0]
}

export const getAiSdkReasoningEffort = (
  selection: AiModelSelection,
): AiSdkReasoningEffort | undefined => {
  const model = getAiModel(selection)
  if (!model.reasoningEfforts) {
    if (!selection.reasoningEffort) return undefined
    throw new Error(`${model.label} does not support reasoning effort`)
  }
  const reasoningEffort = clampAiReasoningEffort(model, selection.reasoningEffort)
  if (!reasoningEffort) {
    throw new Error(`Unsupported reasoning effort for ${model.label}`)
  }
  return reasoningEffort
}
