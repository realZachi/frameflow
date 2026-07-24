import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { AiProviderControls } from './AiProviderControls'
import type { ComponentProps, ReactNode } from 'react'

vi.mock('./ui/select', () => ({
  Select: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children }: { children: ReactNode }) => <span>{children}</span>,
  SelectTrigger: ({ children, ...props }: ComponentProps<'button'>) => (
    <button {...props}>{children}</button>
  ),
  SelectValue: ({ children }: { children: ReactNode }) => <span>{children}</span>,
}))

describe('AI provider controls', () => {
  it('shows the required environment variable when the selected provider has no key', () => {
    const markup = renderToStaticMarkup(
      <AiProviderControls
        selection={{ provider: 'openai', model: 'gpt-5.6-terra' }}
        availability={{
          moonshot: true,
          google: true,
          qwen: true,
          openai: false,
          anthropic: true,
          xai: true,
        }}
        onProviderChange={() => undefined}
        onModelChange={() => undefined}
        onReasoningEffortChange={() => undefined}
      />,
    )

    expect(markup).toContain('API key missing.')
    expect(markup).toContain('OPENAI_API_KEY')
    expect(markup).toContain('.env.local')
  })

  it('does not show a missing-key warning for a configured provider', () => {
    const markup = renderToStaticMarkup(
      <AiProviderControls
        selection={{ provider: 'google', model: 'gemini-3.6-flash' }}
        availability={{
          moonshot: false,
          google: true,
          qwen: false,
          openai: false,
          anthropic: false,
          xai: false,
        }}
        onProviderChange={() => undefined}
        onModelChange={() => undefined}
        onReasoningEffortChange={() => undefined}
      />,
    )

    expect(markup).not.toContain('API key missing.')
  })

  it('shows model-specific reasoning efforts and omits them for Moonshot', () => {
    const openAiMarkup = renderToStaticMarkup(
      <AiProviderControls
        selection={{
          provider: 'openai',
          model: 'gpt-5.6-sol',
          reasoningEffort: 'high',
        }}
        availability={{
          moonshot: false,
          google: false,
          qwen: false,
          openai: true,
          anthropic: false,
          xai: false,
        }}
        onProviderChange={() => undefined}
        onModelChange={() => undefined}
        onReasoningEffortChange={() => undefined}
      />,
    )

    expect(openAiMarkup).toContain('Reasoning effort')
    expect(openAiMarkup).toContain('Provider default')
    expect(openAiMarkup).toContain('Low')
    expect(openAiMarkup).toContain('Medium')
    expect(openAiMarkup).toContain('High')
    expect(openAiMarkup).toContain('XHigh')

    const moonshotMarkup = renderToStaticMarkup(
      <AiProviderControls
        selection={{ provider: 'moonshot', model: 'kimi-k3' }}
        availability={{
          moonshot: true,
          google: false,
          qwen: false,
          openai: false,
          anthropic: false,
          xai: false,
        }}
        onProviderChange={() => undefined}
        onModelChange={() => undefined}
        onReasoningEffortChange={() => undefined}
      />,
    )

    expect(moonshotMarkup).not.toContain('Reasoning effort')
    expect(moonshotMarkup).not.toContain('Provider default')
  })
})
