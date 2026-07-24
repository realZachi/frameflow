import {
  AI_PROVIDERS,
  AI_REASONING_EFFORT_LABELS,
  clampAiReasoningEffort,
  findAiModelById,
  getAiModel,
  getAiProvider,
  type AiModelSelection,
  type AiProviderId,
  type AiReasoningEffort,
} from '../ai/provider-catalog'
import {
  AlertCircle,
  ChatGpt,
  Claude,
  GoogleGemini,
  Grok,
  KimiAi,
  Qwen,
} from './icons'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from './ui/select'
import type { AiProviderAvailability } from '../ai/provider-config'
import type { ComponentType } from 'react'

const AI_PROVIDER_ICONS: Record<AiProviderId, ComponentType<{ className?: string; size?: number }>> = {
  moonshot: KimiAi,
  google: GoogleGemini,
  qwen: Qwen,
  openai: ChatGpt,
  anthropic: Claude,
  xai: Grok,
}

export type AiProviderControlsProps = {
  selection: AiModelSelection
  availability: AiProviderAvailability
  onModelSelect: (providerId: AiProviderId, modelId: string) => void
  onReasoningEffortChange: (reasoningEffort: AiReasoningEffort) => void
}

export const AiProviderControls = ({
  selection,
  availability,
  onModelSelect,
  onReasoningEffortChange,
}: AiProviderControlsProps) => {
  const provider = getAiProvider(selection.provider)
  const model = getAiModel(selection)
  const isConfigured = availability[selection.provider]
  const reasoningEffort = clampAiReasoningEffort(model, selection.reasoningEffort)
  const SelectedIcon = AI_PROVIDER_ICONS[selection.provider]

  return (
    <div className="ai-provider-controls">
      <div className="ai-modal-field ai-modal-field--compact">
        <label htmlFor="ai-model-trigger">Model</label>
        <Select
          value={selection.model}
          onValueChange={(value) => {
            if (typeof value !== 'string') return
            const match = findAiModelById(value)
            onModelSelect(match.provider.id, match.model.id)
          }}
        >
          <SelectTrigger
            id="ai-model-trigger"
            className="ai-provider-trigger"
            aria-label="AI model"
          >
            <SelectValue>
              <SelectedIcon className="ai-provider-icon" size={15} />
              <span>{`${provider.label} · ${model.label}`}</span>
            </SelectValue>
          </SelectTrigger>
          <SelectContent align="start" className="ai-modal-select-content">
            {AI_PROVIDERS.map((option) => {
              const ProviderIcon = AI_PROVIDER_ICONS[option.id]
              return (
                <SelectGroup key={option.id}>
                  <SelectLabel>
                    <ProviderIcon className="ai-provider-icon" size={14} />
                    <span>
                      {availability[option.id] ? option.label : `${option.label} · key missing`}
                    </span>
                  </SelectLabel>
                  {option.models.map((modelOption) => (
                    <SelectItem key={modelOption.id} value={modelOption.id}>
                      {modelOption.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              )
            })}
          </SelectContent>
        </Select>
      </div>
      {model.reasoningEfforts && reasoningEffort && (
        <div className="ai-modal-field ai-modal-field--compact">
          <span className="ai-provider-effort-label" id="ai-effort-label">
            Reasoning effort
          </span>
          <div
            className="ai-effort-segmented"
            role="radiogroup"
            aria-labelledby="ai-effort-label"
          >
            {model.reasoningEfforts.map((option) => (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={reasoningEffort === option}
                className={reasoningEffort === option ? 'is-active' : undefined}
                onClick={() => onReasoningEffortChange(option)}
              >
                {AI_REASONING_EFFORT_LABELS[option]}
              </button>
            ))}
          </div>
        </div>
      )}
      <small className="ai-provider-description">{model.description}</small>
      {!isConfigured && (
        <div className="ai-provider-warning" role="alert">
          <AlertCircle size={15} />
          <span>
            <b>API key missing.</b> Add <code>{provider.envVar}</code> to <code>.env.local</code> and restart the app.
          </span>
        </div>
      )}
    </div>
  )
}
