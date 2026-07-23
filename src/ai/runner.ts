import { APICallError, isStepCount, streamText } from 'ai'
import { scopeAiControllerToSlide, type AiEditorController } from './controller'
import { buildInstructions, buildUserMessage } from './prompt'
import { getAiModel, getAiProvider, type AiModelSelection } from './provider-catalog'
import { getAiProviderKey } from './provider-config'
import { createEditorTools } from './tools'
import type { AiToolActivity } from './tools'

export type { AiToolActivity } from './tools'

export type AiRunEvent =
  | { type: 'status'; message: string }
  | { type: 'tool'; name: string; detail: string }
  | { type: 'text'; delta: string }
  | { type: 'reasoning'; delta: string }
  | { type: 'done'; summary: string; slidesCreated: number }
  | { type: 'error'; message: string }

type UserContent =
  | { type: 'text'; text: string }
  | { type: 'file'; mediaType: string; data: string }

const truncate = (value: string, max: number) => (value.length > max ? `${value.slice(0, max)}…` : value)

const describeToolCall = (toolName: string, input: unknown): string => {
  const data = (input && typeof input === 'object' ? (input as Record<string, unknown>) : {})
  switch (toolName) {
    case 'get_canvas_state':
      return 'Canvas state retrieved'
    case 'add_slide':
      return 'New screen created'
    case 'rename_slide':
      return typeof data['name'] === 'string'
        ? `Screen renamed: “${truncate(data['name'], 30)}”`
        : 'Screen renamed'
    case 'set_slide_background':
      return 'Background updated'
    case 'delete_slide':
      return 'Screen deleted'
    case 'add_text':
      return typeof data['text'] === 'string'
        ? `Text: “${truncate(data['text'], 30)}”`
        : 'Text added'
    case 'add_device':
      return typeof data['deviceStyle'] === 'string'
        ? `Device added (${data['deviceStyle']})`
        : 'Device added'
    case 'add_shape':
      return typeof data['shape'] === 'string'
        ? `Shape added (${data['shape']})`
        : 'Shape added'
    case 'add_image':
      return 'Image added'
    case 'set_device_screenshot':
      return 'Device screenshot replaced'
    case 'update_element':
      return 'Element updated'
    case 'delete_element':
      return 'Element deleted'
    case 'inspect_slide':
      return 'Layout measured'
    case 'render_slide_preview':
      return 'Preview checked'
    default:
      return `Tool: ${toolName}`
  }
}

const extractMediaType = (dataUrl: string): string => {
  const match = /^data:([^;,]+)/.exec(dataUrl)
  return match?.[1] ?? 'image/png'
}

const createAiModel = async (selection: AiModelSelection) => {
  const apiKey = getAiProviderKey(selection.provider)
  if (!apiKey) {
    throw new Error(`${getAiProvider(selection.provider).envVar} is not configured`)
  }

  switch (selection.provider) {
    case 'moonshot': {
      const { createOpenAI } = await import('@ai-sdk/openai')
      return createOpenAI({
        apiKey,
        baseURL: `${window.location.origin}/api/moonshot/v1`,
      }).chat(selection.model)
    }
    case 'google': {
      const { createGoogle } = await import('@ai-sdk/google')
      return createGoogle({ apiKey })(selection.model)
    }
    case 'qwen': {
      const { createAlibaba } = await import('@ai-sdk/alibaba')
      return createAlibaba({ apiKey })(selection.model)
    }
    case 'openai': {
      const { createOpenAI } = await import('@ai-sdk/openai')
      return createOpenAI({ apiKey })(selection.model)
    }
    case 'anthropic': {
      const { createAnthropic } = await import('@ai-sdk/anthropic')
      return createAnthropic({
        apiKey,
        headers: {
          'anthropic-dangerous-direct-browser-access': 'true',
        },
      })(selection.model)
    }
  }
}

const describeError = (error: unknown, selection: AiModelSelection): string => {
  if (APICallError.isInstance(error)) {
    if (error.statusCode === 401 || error.statusCode === 403) {
      const provider = getAiProvider(selection.provider)
      return `${provider.label} API error (${error.statusCode}) — check ${provider.envVar} in .env.local and restart the app. ${error.message}`
    }
    return error.message
  }
  if (error instanceof Error) return error.message
  return String(error)
}

const isAbortError = (error: unknown): boolean =>
  (error instanceof Error && error.name === 'AbortError') || (error instanceof DOMException && error.name === 'AbortError')

export async function runAiGeneration(options: {
  selection: AiModelSelection
  description: string
  screenshots: { assetId: string; name: string; dataUrl: string }[]
  controller: AiEditorController
  targetSlideId?: string
  signal?: AbortSignal
  onEvent: (event: AiRunEvent) => void
  onActivity?: (activity: AiToolActivity) => void
}): Promise<void> {
  const {
    selection,
    description,
    screenshots,
    controller,
    targetSlideId,
    signal,
    onEvent,
    onActivity,
  } = options

  try {
    const provider = getAiProvider(selection.provider)
    const modelOption = getAiModel(selection)
    const model = await createAiModel(selection)

    const content: UserContent[] = [{
      type: 'text',
      text: buildUserMessage(
        description,
        screenshots.map(({ assetId, name }) => ({ assetId, name })),
        targetSlideId ? { targetSlideId } : {},
      ),
    }]

    for (const shot of screenshots) {
      content.push({ type: 'text', text: `Screenshot asset "${shot.assetId}" (${shot.name}):` })
      content.push({ type: 'file', mediaType: extractMediaType(shot.dataUrl), data: shot.dataUrl })
    }

    onEvent({
      type: 'status',
      message: `Connecting to ${provider.label} · ${modelOption.label}…`,
    })

    const runController = targetSlideId ? scopeAiControllerToSlide(controller, targetSlideId) : controller
    const result = streamText({
      model,
      instructions: buildInstructions(targetSlideId ? { targetSlideId } : {}),
      messages: [{ role: 'user', content }],
      tools: createEditorTools(runController, {
        mode: targetSlideId ? 'edit' : 'generate',
        ...(onActivity ? { onActivity } : {}),
      }),
      stopWhen: isStepCount(64),
      ...(signal ? { abortSignal: signal } : {}),
    })

    let accumulatedText = ''
    let slidesCreated = 0
    let hadError = false

    for await (const part of result.stream) {
      if (signal?.aborted) break
      // The SDK emits transport events that do not affect the visible activity log.
      // eslint-disable-next-line @typescript-eslint/switch-exhaustiveness-check
      switch (part.type) {
        case 'text-delta': {
          accumulatedText += part.text
          onEvent({ type: 'text', delta: part.text })
          break
        }
        case 'reasoning-delta': {
          // kimi-k3 is a reasoning model; without these deltas the run appears
          // frozen for minutes even while the model is working.
          onEvent({ type: 'reasoning', delta: part.text })
          break
        }
        case 'tool-call': {
          if (part.toolName === 'add_slide') slidesCreated += 1
          onEvent({ type: 'tool', name: part.toolName, detail: describeToolCall(part.toolName, part.input) })
          break
        }
        case 'error': {
          hadError = true
          onEvent({ type: 'error', message: describeError(part.error, selection) })
          break
        }
        default:
          break
      }
    }

    if (signal?.aborted) {
      onEvent({ type: 'status', message: 'Cancelled' })
      return
    }
    if (hadError) return

    let finalText = accumulatedText.trim()
    try {
      const resolvedText = await result.text
      if (resolvedText.trim().length > 0) finalText = resolvedText.trim()
    } catch {
      // fall back to accumulated deltas below
    }

    onEvent({ type: 'done', summary: finalText, slidesCreated })
  } catch (error) {
    if (isAbortError(error)) {
      onEvent({ type: 'status', message: 'Cancelled' })
      return
    }
    onEvent({ type: 'error', message: describeError(error, selection) })
  }
}
