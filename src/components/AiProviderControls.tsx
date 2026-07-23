import {
  AI_PROVIDERS,
  getAiModel,
  getAiProvider,
  isAiProviderId,
  type AiModelSelection,
  type AiProviderId,
} from '../ai/provider-catalog'
import { AlertCircle } from './icons'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select'
import type { AiProviderAvailability } from '../ai/provider-config'

export type AiProviderControlsProps = {
  selection: AiModelSelection
  availability: AiProviderAvailability
  onProviderChange: (providerId: AiProviderId) => void
  onModelChange: (modelId: string) => void
}

export const AiProviderControls = ({
  selection,
  availability,
  onProviderChange,
  onModelChange,
}: AiProviderControlsProps) => {
  const provider = getAiProvider(selection.provider)
  const model = getAiModel(selection)
  const isConfigured = availability[selection.provider]

  return (
    <div className="ai-provider-controls">
      <div className="ai-provider-grid">
        <div className="ai-modal-field ai-modal-field--compact">
          <label htmlFor="ai-provider-trigger">Provider</label>
          <Select
            value={selection.provider}
            onValueChange={(value) => {
              if (isAiProviderId(value)) onProviderChange(value)
            }}
          >
            <SelectTrigger
              id="ai-provider-trigger"
              className="ai-provider-trigger"
              aria-label="AI provider"
            >
              <SelectValue>{provider.label}</SelectValue>
            </SelectTrigger>
            <SelectContent align="start" className="ai-modal-select-content">
              {AI_PROVIDERS.map((option) => (
                <SelectItem key={option.id} value={option.id}>{option.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="ai-modal-field ai-modal-field--compact">
          <label htmlFor="ai-model-trigger">Model</label>
          <Select
            value={selection.model}
            onValueChange={(value) => {
              if (
                typeof value === 'string'
                && provider.models.some((option) => option.id === value)
              ) {
                onModelChange(value)
              }
            }}
          >
            <SelectTrigger
              id="ai-model-trigger"
              className="ai-provider-trigger"
              aria-label="AI model"
            >
              <SelectValue>{model.label}</SelectValue>
            </SelectTrigger>
            <SelectContent align="end" className="ai-modal-select-content">
              {provider.models.map((option) => (
                <SelectItem key={option.id} value={option.id}>{option.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
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
