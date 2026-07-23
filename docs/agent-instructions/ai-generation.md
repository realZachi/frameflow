# AI generation invariants

## Security and provider boundary

The browser uses the AI SDK's native Google, Alibaba/Qwen, OpenAI, and Anthropic providers directly. Moonshot uses the OpenAI chat provider through the local `/api/moonshot` CORS proxy.

- Provider keys live in `.env.local` as `VITE_*` values and are intentionally visible to the local browser.
- Never commit `.env.local`, reuse a shared production credential, or deploy a build containing provider keys.
- Do not add a proxy for providers whose browser API supports the required CORS flow. Keep the entire provider setup localhost-only; a hosted AI-enabled deployment needs a separate authenticated backend design.
- Never return secrets or raw data URLs in model-visible state.
- Keep uploads browser-local except for screenshots explicitly included in an AI run.
- Keep developer AI run logging gated by `FRAMEFLOW_AI_LOGGING` and write only
  through the local Vite middleware to the git-ignored `ai-logs/` directory.
  Persist only the versioned, bounded log schema: never add input prompt text,
  screenshot payloads or names, credentials, or raw provider metadata.

## Tool architecture

The model mutates the editor only through the tools composed by `src/ai/tools.ts`.

- Tool groups validate with Zod and delegate mutations to `AiEditorController`.
- Clamp every numeric model input to the editor range.
- Return `{ ok: false, error }` for expected failures; do not throw.
- Keep Zod descriptions accurate because they are model-facing API documentation.
- Add new element fields to the type, defaults, renderer, controller whitelist, and `update_element` as applicable.
- Emit `AiToolActivity` for visible mutations.
- Return real DOM measurements after element mutations.
- Keep `inspect_slide` and `render_slide_preview` as the visual correction loop.
- Keep edit mode scoped to its target slide.

## Editor integration

The controller adapter must update `slidesRef` synchronously before React state because multiple tool calls can read and write in one tick. Preserve the non-history adapter and create one checkpoint before a run so the entire generation remains one undo step.

Clear selection before generation and preview capture. Any live overlay must carry `data-ai-overlay` and remain filtered from preview and export.

## Canvas and prompt contract

- Coordinates and widths are percentages of the `1290 × 2796` canvas.
- Text `fontSize` is CSS pixels on the internal 330 px-wide DOM artboard.
- Hero: `32–46`; sub-headline: `18–24`; body: `13–17`; label: `9–12`.
- Values above roughly `52` are usually a four-times sizing error.
- Keep these values identical in `prompt.ts`, schemas, tool descriptions, and documentation.
- Keep loaded font names aligned with `src/main.tsx`.
- Keep the prompt's repair-round limit aligned with preview behavior.
- Keep AI-generated canvas copy and completion summaries in English, regardless of the language used in the request.

Rich text comes from structured highlights through `src/ai/richtext.ts`. The model never writes raw HTML. `sanitizeRichText` remains the final whitelist.

The stream runner reports errors and aborts as events instead of rejecting. Preserve visible reasoning progress for long-running reasoning models.

Reasoning-effort choices belong to the model catalog. Offer only values supported by the selected model and pass non-default choices through the AI SDK's top-level `reasoning` option; do not duplicate provider-specific effort mapping in the UI.
