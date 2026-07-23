import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import { APICallError, isStepCount, streamText } from 'ai'
import { scopeAiControllerToSlide, type AiEditorController } from './controller'
import { buildInstructions, buildUserMessage } from './prompt'
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
      return 'Board-Status abgerufen'
    case 'add_slide':
      return 'Neuer Screen angelegt'
    case 'rename_slide':
      return typeof data['name'] === 'string'
        ? `Screen umbenannt: „${truncate(data['name'], 30)}"`
        : 'Screen umbenannt'
    case 'set_slide_background':
      return 'Hintergrund geändert'
    case 'delete_slide':
      return 'Screen gelöscht'
    case 'add_text':
      return typeof data['text'] === 'string'
        ? `Text: „${truncate(data['text'], 30)}"`
        : 'Text hinzugefügt'
    case 'add_device':
      return typeof data['deviceStyle'] === 'string'
        ? `Gerät hinzugefügt (${data['deviceStyle']})`
        : 'Gerät hinzugefügt'
    case 'add_shape':
      return typeof data['shape'] === 'string'
        ? `Form hinzugefügt (${data['shape']})`
        : 'Form hinzugefügt'
    case 'add_image':
      return 'Bild hinzugefügt'
    case 'set_device_screenshot':
      return 'Screenshot im Gerät ersetzt'
    case 'update_element':
      return 'Element aktualisiert'
    case 'delete_element':
      return 'Element gelöscht'
    case 'inspect_slide':
      return 'Layout vermessen'
    case 'render_slide_preview':
      return 'Vorschau geprüft'
    default:
      return `Werkzeug: ${toolName}`
  }
}

const extractMediaType = (dataUrl: string): string => {
  const match = /^data:([^;,]+)/.exec(dataUrl)
  return match?.[1] ?? 'image/png'
}

const describeError = (error: unknown): string => {
  if (APICallError.isInstance(error)) {
    if (error.statusCode === 400 || error.statusCode === 401 || error.statusCode === 403) {
      return `Moonshot-API-Fehler (${error.statusCode}) — prüfe den MOONSHOT_API_KEY in .env.local und starte den Dev-Server neu. ${error.message}`
    }
    return error.message
  }
  if (error instanceof Error) return error.message
  return String(error)
}

const isAbortError = (error: unknown): boolean =>
  (error instanceof Error && error.name === 'AbortError') || (error instanceof DOMException && error.name === 'AbortError')

export async function runAiGeneration(options: {
  description: string
  screenshots: { assetId: string; name: string; dataUrl: string }[]
  controller: AiEditorController
  targetSlideId?: string
  signal?: AbortSignal
  onEvent: (event: AiRunEvent) => void
  onActivity?: (activity: AiToolActivity) => void
}): Promise<void> {
  const { description, screenshots, controller, targetSlideId, signal, onEvent, onActivity } = options

  try {
    // Der Key wird nicht im Browser gehalten: der Vite-Dev-Server proxied
    // /api/moonshot → api.moonshot.ai und setzt den Authorization-Header
    // aus MOONSHOT_API_KEY (siehe vite.config.ts).
    const moonshot = createOpenAICompatible({
      name: 'moonshot',
      baseURL: `${window.location.origin}/api/moonshot/v1`,
    })

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

    onEvent({ type: 'status', message: 'Verbinde mit Moonshot AI…' })

    const runController = targetSlideId ? scopeAiControllerToSlide(controller, targetSlideId) : controller
    const result = streamText({
      model: moonshot('kimi-k3'),
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
          // kimi-k3 ist ein Reasoning-Modell: ohne diese Deltas wirkt der Lauf
          // minutenlang eingefroren, obwohl das Modell arbeitet.
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
          onEvent({ type: 'error', message: describeError(part.error) })
          break
        }
        default:
          break
      }
    }

    if (signal?.aborted) {
      onEvent({ type: 'status', message: 'Abgebrochen' })
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
      onEvent({ type: 'status', message: 'Abgebrochen' })
      return
    }
    onEvent({ type: 'error', message: describeError(error) })
  }
}
