import {
  APICallError,
  isStepCount,
  streamText,
  type FinishReason,
  type TextStreamPart,
  type ToolSet,
} from 'ai'
import { scopeAiControllerToSlide, type AiEditorController } from './controller'
import { buildInstructions, buildUserMessage } from './prompt'
import {
  AI_REASONING_EFFORT_LABELS,
  getAiModel,
  getAiProvider,
  getAiSdkReasoningEffort,
  getAiStreamReasoningOptions,
  type AiModelSelection,
} from './provider-catalog'
import { getAiProviderKey } from './provider-config'
import {
  toAiRunTokenUsage,
  type AiRunReport,
  type AiRunTokenUsage,
  type AiRunToolCall,
} from './run-log'
import { saveAiRunReport } from './run-log-client'
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

type PreparedAsset = { assetId: string; name: string; dataUrl: string }

const buildUserContent = (options: {
  description: string
  screenshots: PreparedAsset[]
  appName?: string
  logo?: PreparedAsset
  targetSlideId?: string
}): UserContent[] => {
  const { description, screenshots, appName, logo, targetSlideId } = options
  const content: UserContent[] = [{
    type: 'text',
    text: buildUserMessage(
      description,
      screenshots.map(({ assetId, name }) => ({ assetId, name })),
      {
        ...(targetSlideId ? { targetSlideId } : {}),
        ...(appName?.trim() ? { appName: appName.trim() } : {}),
        ...(logo ? { logoAssetId: logo.assetId } : {}),
      },
    ),
  }]

  for (const shot of screenshots) {
    content.push({ type: 'text', text: `Screenshot asset "${shot.assetId}" (${shot.name}):` })
    content.push({ type: 'file', mediaType: extractMediaType(shot.dataUrl), data: shot.dataUrl })
  }

  if (logo) {
    content.push({
      type: 'text',
      text: `App logo asset "${logo.assetId}" (${logo.name}) — place with add_image, never as a device screenshot:`,
    })
    content.push({ type: 'file', mediaType: extractMediaType(logo.dataUrl), data: logo.dataUrl })
  }

  return content
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
    case 'xai': {
      const { createXai } = await import('@ai-sdk/xai')
      return createXai({ apiKey })(selection.model)
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

type AiRunAccumulator = {
  assistantOutput: string
  reasoningOutput: string
  toolCalls: AiRunToolCall[]
  slidesCreated: number
  usage: AiRunTokenUsage | null
  finishReason: FinishReason | null
  errorMessage: string | null
  hadError: boolean
}

const collectStreamPart = <TOOLS extends ToolSet>(options: {
  part: TextStreamPart<TOOLS>
  selection: AiModelSelection
  runStartedAt: number
  accumulator: AiRunAccumulator
  onEvent: (event: AiRunEvent) => void
}) => {
  const { part, selection, runStartedAt, accumulator, onEvent } = options
  // The SDK emits transport events that do not affect the visible activity log.
  // eslint-disable-next-line @typescript-eslint/switch-exhaustiveness-check
  switch (part.type) {
    case 'text-delta':
      accumulator.assistantOutput += part.text
      onEvent({ type: 'text', delta: part.text })
      break
    case 'reasoning-delta':
      accumulator.reasoningOutput += part.text
      onEvent({ type: 'reasoning', delta: part.text })
      break
    case 'tool-call': {
      if (part.toolName === 'add_slide') accumulator.slidesCreated += 1
      const detail = describeToolCall(part.toolName, part.input)
      accumulator.toolCalls.push({
        name: part.toolName,
        detail,
        offsetMs: Date.now() - runStartedAt,
      })
      onEvent({ type: 'tool', name: part.toolName, detail })
      break
    }
    case 'finish':
      accumulator.usage = toAiRunTokenUsage(part.totalUsage)
      accumulator.finishReason = part.finishReason
      break
    case 'error':
      accumulator.hadError = true
      accumulator.errorMessage = describeError(part.error, selection)
      onEvent({ type: 'error', message: accumulator.errorMessage })
      break
    default:
      break
  }
}

export async function runAiGeneration(options: {
  selection: AiModelSelection
  description: string
  screenshots: PreparedAsset[]
  appName?: string
  logo?: PreparedAsset
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
    appName,
    logo,
    controller,
    targetSlideId,
    signal,
    onEvent,
    onActivity,
  } = options
  const runStartedAt = Date.now()
  const accumulator: AiRunAccumulator = {
    assistantOutput: '',
    reasoningOutput: '',
    toolCalls: [],
    slidesCreated: 0,
    usage: null,
    finishReason: null,
    errorMessage: null,
    hadError: false,
  }

  const finishRun = async (outcome: AiRunReport['outcome']) => {
    const report: AiRunReport = {
      outcome,
      assistantOutput: accumulator.assistantOutput,
      reasoningOutput: accumulator.reasoningOutput,
      toolCalls: accumulator.toolCalls.map((toolCall) => ({ ...toolCall })),
      slidesCreated: accumulator.slidesCreated,
      usage: accumulator.usage,
      finishReason: accumulator.finishReason,
      errorMessage: accumulator.errorMessage,
    }
    await saveAiRunReport({
      startedAt: runStartedAt,
      finishedAt: Date.now(),
      mode: targetSlideId ? 'edit' : 'generate',
      selection,
      descriptionCharacters: description.length,
      screenshotCount: screenshots.length,
      report,
    })
  }

  try {
    const provider = getAiProvider(selection.provider)
    const modelOption = getAiModel(selection)
    const reasoning = getAiSdkReasoningEffort(selection)
    const model = await createAiModel(selection)

    const content = buildUserContent({
      description,
      screenshots,
      ...(appName !== undefined ? { appName } : {}),
      ...(logo ? { logo } : {}),
      ...(targetSlideId ? { targetSlideId } : {}),
    })

    onEvent({
      type: 'status',
      message: `Connecting to ${[
        provider.label,
        modelOption.label,
        ...(reasoning ? [`${AI_REASONING_EFFORT_LABELS[reasoning]} effort`] : []),
      ].join(' · ')}…`,
    })

    const runController = targetSlideId ? scopeAiControllerToSlide(controller, targetSlideId) : controller
    const reasoningOptions = getAiStreamReasoningOptions(selection)
    const result = streamText({
      model,
      instructions: buildInstructions(targetSlideId ? { targetSlideId } : {}),
      messages: [{ role: 'user', content }],
      tools: createEditorTools(runController, {
        mode: targetSlideId ? 'edit' : 'generate',
        ...(onActivity ? { onActivity } : {}),
      }),
      stopWhen: isStepCount(64),
      ...(reasoningOptions ?? {}),
      ...(signal ? { abortSignal: signal } : {}),
    })

    for await (const part of result.stream) {
      if (signal?.aborted) break
      collectStreamPart({
        part,
        selection,
        runStartedAt,
        accumulator,
        onEvent,
      })
    }

    if (signal?.aborted) {
      onEvent({ type: 'status', message: 'Cancelled' })
      await finishRun('cancelled')
      return
    }
    if (accumulator.hadError) {
      await finishRun('failed')
      return
    }

    let finalText = accumulator.assistantOutput.trim()
    try {
      const resolvedText = await result.text
      if (resolvedText.trim().length > 0) finalText = resolvedText.trim()
    } catch {
      // fall back to accumulated deltas below
    }

    if (!accumulator.usage) {
      try {
        accumulator.usage = toAiRunTokenUsage(await result.usage)
      } catch {
        // Some providers omit usage even when the text stream completes.
      }
    }
    if (!accumulator.finishReason) {
      try {
        accumulator.finishReason = await result.finishReason
      } catch {
        // The visible completion remains valid if finish metadata is unavailable.
      }
    }

    accumulator.assistantOutput = finalText
    onEvent({
      type: 'done',
      summary: finalText,
      slidesCreated: accumulator.slidesCreated,
    })
    await finishRun('completed')
  } catch (error) {
    if (isAbortError(error)) {
      onEvent({ type: 'status', message: 'Cancelled' })
      await finishRun('cancelled')
      return
    }
    accumulator.errorMessage = describeError(error, selection)
    onEvent({ type: 'error', message: accumulator.errorMessage })
    await finishRun('failed')
  }
}
