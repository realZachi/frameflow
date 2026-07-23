import { uid } from '../utils'
import {
  AI_RUN_LOG_ENDPOINT,
  createAiRunLog,
  type CreateAiRunLogOptions,
} from './run-log'

type SaveAiRunOptions = Omit<CreateAiRunLogOptions, 'id'>

export const saveAiRunReport = async (options: SaveAiRunOptions): Promise<void> => {
  if (!__FRAMEFLOW_AI_LOGGING__) return

  const log = createAiRunLog({
    ...options,
    id: uid('ai-run'),
  })

  try {
    const response = await fetch(AI_RUN_LOG_ENDPOINT, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify(log),
    })
    if (!response.ok) {
      console.warn(`AI run log could not be saved (${response.status}).`)
    }
  } catch (error) {
    console.warn('AI run log could not be sent to the local development server.', error)
  }
}
