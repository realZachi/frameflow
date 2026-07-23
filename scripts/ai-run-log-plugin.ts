import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import {
  AI_RUN_LOG_DIRECTORY,
  AI_RUN_LOG_ENDPOINT,
  normalizeAiRunLog,
  type AiRunLog,
} from '../src/ai/run-log'
import type { Connect, Plugin } from 'vite'

const MAX_REQUEST_BYTES = 2 * 1024 * 1024

type AiRunLogPluginOptions = {
  isEnabled: boolean
  projectRoot: string
}

class RequestTooLargeError extends Error {}

const readRequestBody = (request: Connect.IncomingMessage): Promise<string> =>
  new Promise((resolve, reject) => {
    const chunks: Uint8Array[] = []
    let size = 0
    let hasFailed = false

    request.on('data', (chunk: unknown) => {
      if (hasFailed) return
      const bytes = typeof chunk === 'string'
        ? Buffer.from(chunk)
        : chunk instanceof Uint8Array
          ? chunk
          : null
      if (!bytes) {
        hasFailed = true
        reject(new Error('Unsupported request body chunk.'))
        return
      }
      size += bytes.byteLength
      if (size > MAX_REQUEST_BYTES) {
        hasFailed = true
        reject(new RequestTooLargeError())
        return
      }
      chunks.push(bytes)
    })
    request.on('end', () => {
      if (!hasFailed) resolve(Buffer.concat(chunks).toString('utf8'))
    })
    request.on('error', (error: Error) => {
      if (!hasFailed) reject(error)
    })
  })

const sanitizeFilenameSegment = (value: string): string => {
  const sanitized = value
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '')
    .slice(0, 80)
  return sanitized || 'unknown'
}

export const createAiRunLogFilename = (log: AiRunLog): string => {
  const timestamp = log.startedAt.replace(/[:.]/g, '-')
  const segments = [
    timestamp,
    log.provider,
    log.model,
    log.mode,
    log.id,
  ].map(sanitizeFilenameSegment)
  return `${segments.join('_')}.json`
}

export const writeAiRunLogFile = async (
  projectRoot: string,
  value: unknown,
): Promise<string> => {
  const log = normalizeAiRunLog(value)
  if (!log) throw new Error('Invalid AI run log payload.')

  const logDirectory = path.resolve(projectRoot, AI_RUN_LOG_DIRECTORY)
  const filePath = path.join(logDirectory, createAiRunLogFilename(log))
  await mkdir(logDirectory, { recursive: true })
  await writeFile(filePath, `${JSON.stringify(log, null, 2)}\n`, {
    encoding: 'utf8',
    flag: 'wx',
  })
  return filePath
}

const sendJson = (
  response: Parameters<Connect.NextHandleFunction>[1],
  statusCode: number,
  payload: Record<string, unknown>,
) => {
  response.statusCode = statusCode
  response.setHeader('content-type', 'application/json; charset=utf-8')
  response.setHeader('cache-control', 'no-store')
  response.setHeader('x-content-type-options', 'nosniff')
  response.end(JSON.stringify(payload))
}

const createAiRunLogMiddleware = (
  projectRoot: string,
): Connect.NextHandleFunction => (request, response, next) => {
  const pathname = new URL(request.url ?? '/', 'http://localhost').pathname
  if (pathname !== AI_RUN_LOG_ENDPOINT) {
    next()
    return
  }
  if (request.method !== 'POST') {
    sendJson(response, 405, { ok: false, error: 'Method not allowed.' })
    return
  }
  if (!request.headers['content-type']?.startsWith('application/json')) {
    sendJson(response, 415, { ok: false, error: 'JSON content type required.' })
    return
  }

  void (async () => {
    try {
      const body = await readRequestBody(request)
      const parsed: unknown = JSON.parse(body)
      await writeAiRunLogFile(projectRoot, parsed)
      sendJson(response, 201, { ok: true })
    } catch (error) {
      if (error instanceof RequestTooLargeError) {
        sendJson(response, 413, { ok: false, error: 'AI run log payload is too large.' })
        return
      }
      if (error instanceof SyntaxError || (error instanceof Error && error.message === 'Invalid AI run log payload.')) {
        sendJson(response, 400, { ok: false, error: 'Invalid AI run log payload.' })
        return
      }
      console.error('Failed to write the local AI run log.', error)
      sendJson(response, 500, { ok: false, error: 'AI run log could not be written.' })
    }
  })()
}

export const createAiRunLogPlugin = ({
  isEnabled,
  projectRoot,
}: AiRunLogPluginOptions): Plugin => {
  const middleware = createAiRunLogMiddleware(projectRoot)

  return {
    name: 'frameflow-ai-run-logs',
    apply: 'serve',
    configureServer(server) {
      if (isEnabled) server.middlewares.use(middleware)
    },
    configurePreviewServer(server) {
      if (isEnabled) server.middlewares.use(middleware)
    },
  }
}
