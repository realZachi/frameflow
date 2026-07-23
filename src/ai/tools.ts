import type { AiEditorController } from './controller'
import { createInspectionTools } from './inspection-tools'
import { createMediaTools } from './media-tools'
import { createSlideTools } from './slide-tools'
import { createAddTextTool } from './text-tool'
import {
  createToolContext,
  type AiToolActivity,
} from './tool-context'
import { createUpdateElementTool } from './update-element-tool'

export type { AiToolActivity } from './tool-context'

type EditorToolOptions = {
  mode?: 'generate' | 'edit'
  onActivity?: (activity: AiToolActivity) => void
}

export function createEditorTools(
  controller: AiEditorController,
  options?: EditorToolOptions,
) {
  const context = createToolContext(controller, options?.onActivity)
  const {
    add_slide: addSlide,
    delete_slide: deleteSlide,
    ...editableSlideTools
  } = createSlideTools(context)
  const editTools = {
    ...editableSlideTools,
    add_text: createAddTextTool(context),
    ...createMediaTools(context),
    update_element: createUpdateElementTool(context),
    ...createInspectionTools(context),
  }

  if (options?.mode === 'edit') return editTools
  return {
    ...editTools,
    add_slide: addSlide,
    delete_slide: deleteSlide,
  }
}

export type EditorTools = ReturnType<typeof createEditorTools>
