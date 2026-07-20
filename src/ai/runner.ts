import { APICallError, isStepCount, streamText } from 'ai'
import { createGoogle } from '@ai-sdk/google'
import { buildInstructions, buildUserMessage } from './prompt'
import { createEditorTools } from './tools'
import type { AiEditorController } from './controller'

export type AiRunEvent =
  | { type: 'status'; message: string }
  | { type: 'tool'; name: string; detail: string }
  | { type: 'text'; delta: string }
  | { type: 'done'; summary: string; slidesCreated: number }
  | { type: 'error'; message: string }

const truncate = (value: string, max: number) => (value.length > max ? `${value.slice(0, max)}…` : value)

const describeToolCall = (toolName: string, input: unknown): string => {
  const data = (input && typeof input === 'object' ? (input as Record<string, unknown>) : {}) as Record<string, unknown>
  switch (toolName) {
    case 'get_canvas_state':
      return 'Board-Status abgerufen'
    case 'add_slide':
      return 'Neuer Screen angelegt'
    case 'rename_slide':
      return typeof data.name === 'string' ? `Screen umbenannt: „${truncate(data.name, 30)}"` : 'Screen umbenannt'
    case 'set_slide_background':
      return 'Hintergrund geändert'
    case 'delete_slide':
      return 'Screen gelöscht'
    case 'add_text':
      return typeof data.text === 'string' ? `Text: „${truncate(data.text, 30)}"` : 'Text hinzugefügt'
    case 'add_device':
      return typeof data.deviceStyle === 'string' ? `Gerät hinzugefügt (${data.deviceStyle})` : 'Gerät hinzugefügt'
    case 'add_shape':
      return typeof data.shape === 'string' ? `Form hinzugefügt (${data.shape})` : 'Form hinzugefügt'
    case 'add_image':
      return 'Bild hinzugefügt'
    case 'set_device_screenshot':
      return 'Screenshot im Gerät ersetzt'
    case 'update_element':
      return 'Element aktualisiert'
    case 'delete_element':
      return 'Element gelöscht'
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
      return `Gemini-API-Fehler (${error.statusCode}) — prüfe den VITE_GEMINI_API_KEY in .env.local. ${error.message}`
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
  screenshots: Array<{ assetId: string; name: string; dataUrl: string }>
  controller: AiEditorController
  signal?: AbortSignal
  onEvent: (event: AiRunEvent) => void
}): Promise<void> {
  const { description, screenshots, controller, signal, onEvent } = options

  const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string | undefined
  if (!apiKey) {
    onEvent({ type: 'error', message: 'Kein API-Key gefunden — setze VITE_GEMINI_API_KEY in .env.local und starte den Dev-Server neu.' })
    return
  }

  try {
    const google = createGoogle({ apiKey })

    const content: Array<
      | { type: 'text'; text: string }
      | { type: 'file'; mediaType: string; data: string }
    > = [{ type: 'text', text: buildUserMessage(description, screenshots.map(({ assetId, name }) => ({ assetId, name }))) }]

    for (const shot of screenshots) {
      content.push({ type: 'text', text: `Screenshot asset "${shot.assetId}" (${shot.name}):` })
      content.push({ type: 'file', mediaType: extractMediaType(shot.dataUrl), data: shot.dataUrl })
    }

    onEvent({ type: 'status', message: 'Verbinde mit Google Gemini…' })

    const result = streamText({
      model: google('gemini-3.5-flash'),
      instructions: buildInstructions(),
      messages: [{ role: 'user', content }],
      tools: createEditorTools(controller),
      stopWhen: isStepCount(48),
      abortSignal: signal,
    })

    let accumulatedText = ''
    let slidesCreated = 0
    let hadError = false

    for await (const part of result.stream) {
      if (signal?.aborted) break
      switch (part.type) {
        case 'text-delta': {
          accumulatedText += part.text
          onEvent({ type: 'text', delta: part.text })
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
