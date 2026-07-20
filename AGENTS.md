# Repository Guidelines

## Project Structure & Module Organization

Frameflow is a single-package React 19, TypeScript, and Vite application.

- `src/App.tsx` owns editor state, history, uploads, persistence, and export orchestration.
- `src/ai/` contains the AI generation feature: `controller.ts` (editor bridge), `tools.ts` (tool definitions), `prompt.ts` (system instructions), `runner.ts` (agent loop), `measure.ts` (DOM-based layout measurement), `preview.ts` (slide screenshot capture).
- `src/components/` contains the canvas, inspector, sidebar, mockup renderers, and `AiGenerateModal.tsx`.
- `src/mockups/catalog.ts` registers device styles and perspective geometry. Read `src/mockups/README.md` before adding PSD-derived assets.
- `src/assets/mockups/` stores browser-ready transparent WebP/PNG overlays; do not commit PSD source files.
- `src/data.ts`, `src/types.ts`, and `src/utils.ts` hold templates, shared models, and utilities.
- `src/styles.css` contains the global visual system. Production output is generated in `dist/` and must not be edited manually.

## Build, Test, and Development Commands

Use Bun for all package and script operations.

- `bun install` installs dependencies from `bun.lock`.
- `bun run dev` starts the local Vite editor at `http://127.0.0.1:4173`.
- `bun run lint` runs ESLint across TypeScript and React files.
- `bun run build` type-checks with `tsc` and creates the production bundle.
- `bun run preview` serves the built bundle for final verification.

Before opening a pull request, run `bun run lint && bun run build`.

## Coding Style & Naming Conventions

Use TypeScript with two-space indentation, single quotes, and no semicolons, matching the existing code. Prefer functional React components and discriminated unions from `src/types.ts`. Name components and exported types in PascalCase, functions and variables in camelCase, and CSS classes in kebab-case. Keep editor mutations immutable so undo/redo snapshots remain reliable. Register reusable mockups in the catalog instead of branching on assets throughout the UI.

## AI Screenshot Generation

The "Mit AI generieren" button in the topbar opens `AiGenerateModal`, where the user describes their app and uploads raw screenshots. An agent loop then designs App Store screens directly on the canvas.

- **Stack**: Vercel AI SDK v7 (`streamText` with `tools` and `stopWhen: isStepCount(64)`), Google provider `@ai-sdk/google`, model `gemini-3.5-flash`. Calls go directly from the browser to the Gemini API (CORS is allowed); the key is read from `import.meta.env.VITE_GEMINI_API_KEY`, configured in `.env.local` (never committed).
- **Architecture**: The model only mutates the editor through the tools in `src/ai/tools.ts`, which delegate to the `AiEditorController` from `src/ai/controller.ts`. `App.tsx` wires the controller to its state via a non-history `setSlides` adapter that keeps `slidesRef` synchronously up to date — required because tool calls within one step run in the same tick and read state between mutations. One `checkpoint()` before the run makes an entire generation a single undo step, and `prepareAiRun` clears the current element selection so selection UI can't contaminate the layout measurements or preview captures below.
- **Tools** (14): `get_canvas_state`, `add_slide`, `rename_slide`, `set_slide_background`, `delete_slide`, `add_text`, `add_device`, `add_shape`, `add_image`, `set_device_screenshot`, `update_element`, `delete_element`, `inspect_slide`, `render_slide_preview`. They cover everything the sidebar UI can do (fonts, device mockups, screenshot placement, positioning) plus a feedback loop for the model to check and correct its own layout. Per-word rich text (the canvas's word-highlight feature) is exposed through the `highlights` array on `add_text`/`update_element`: the model passes substrings with color/backgroundColor/borderRadius/padding/bold/etc., and `src/ai/richtext.ts` converts them into the sanitized `html` field — the model never writes raw HTML, and `sanitizeRichText` in `src/utils.ts` is the single whitelist for what span styles survive (keep it in sync with what `richtext.ts` emits).
- **Feedback loop**: `src/ai/measure.ts` reads the real, rendered DOM (`getBoundingClientRect` on each `[data-element-id]` node inside `#artboard-{slideId}`) to compute each element's true percent-of-canvas bounding box and generate text-overflow/overlap warnings — this is ground truth the model cannot fake by reasoning about its own tool inputs alone. `src/ai/preview.ts` rasterizes a slide to a downscaled JPEG (430×932, via `html-to-image`'s `toJpeg`) so the model can literally look at what it built. Every mutating tool (`add_text`, `add_device`, `add_shape`, `add_image`, `set_device_screenshot`, `update_element`) returns the affected element's bounding box plus slide warnings in its result; `inspect_slide` returns the full slide's boxes and warnings on demand; `render_slide_preview` returns both the warnings and the rendered image (as a multimodal tool result via `toModelOutput`, so Gemini receives it as an actual inline image, not a text blob). The prompt caps this at 2 repair rounds per slide so the model doesn't get stuck polishing forever.
- **The fontSize trap**: `fontSize` on text elements is a raw CSS px value on the artboard's *internal* 330px-wide DOM base (`.artboard-export { width: 330px }` in `styles.css`), not a percent and not px at the 1290px export resolution — export just stretches the 330px DOM uniformly to 1290px. Concretely: hero headlines ≈ 32-46, sub-headlines ≈ 18-24, body copy ≈ 13-17, labels ≈ 9-12; anything above ~52 is almost always oversized by ~4x. This is the single easiest mistake to reintroduce when touching `tools.ts` or `prompt.ts` — the zod `.describe()` text and the prompt's Canvas section must always agree on these ranges.
- **Conventions when extending tools**: clamp all numeric inputs to the editor's ranges (see the `clamp*` helpers), return `{ ok: false, error }` objects instead of throwing, never expose data URLs to the model (the snapshot replaces them with asset ids), and keep zod `.describe()` texts accurate — they are the model's only documentation. New element fields must also be added to the per-type whitelist in `controller.ts` and, if user-adjustable, to `update_element`.
- **Prompt changes**: design-system rules and coordinate semantics live in `src/ai/prompt.ts`; keep them in sync with actual canvas behavior (percent coordinates, 1290 × 2796 artboard, the fontSize trap above, font weights actually loaded in `src/main.tsx`), and keep the "Verify your work" section's repair-round cap in sync with `render_slide_preview`'s actual behavior.
- **Streaming UI**: `runner.ts` maps stream parts to `AiRunEvent`s consumed by the modal's log; it never rejects — errors and aborts arrive as events.

## Testing Guidelines

There is no automated test framework yet. Every UI change must be manually checked in the browser: add/select an element, edit its properties, exercise undo/redo, and export a ZIP. Confirm exported PNGs remain `1290 × 2796`. Changes to `src/ai/` additionally require one manual generation run against the real Gemini API (needs `VITE_GEMINI_API_KEY` in `.env.local`) — verify tool calls appear in the modal log, slides are appended, and a single undo reverts the whole run. If adding automated tests, use colocated `*.test.ts` or `*.test.tsx` files and add the corresponding Bun script in the same change.

## Commit & Pull Request Guidelines

The repository has no established commit history. Use Conventional Commit messages such as `feat: add tilted device mockup` or `fix: preserve export dimensions`. Pull requests should include a concise behavior summary, verification commands, linked issue when applicable, and before/after screenshots for visual changes. Document the source and license of any third-party mockup asset.

## Security & Asset Handling

Never commit credentials, private screenshots, or unlicensed PSD files. Keep uploads browser-local. `.env.local` holds `VITE_GEMINI_API_KEY` and must stay untracked; remember that any `VITE_`-prefixed variable is embedded in the client bundle, so never put server-grade secrets there. Optimize transparent mockup assets before committing and preserve their screen-corner metadata in `src/mockups/catalog.ts`.
