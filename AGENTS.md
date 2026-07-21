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

## Mandatory shadcn UI System

shadcn/ui is mandatory for all application and editor UI. The configuration in `components.json` and preset `bJiC` are the source of truth: Nova base, neutral colors, Geist, Base UI, and Hugeicons. Do not introduce another component library, icon library, parallel token set, or independent visual language.

- Before changing UI, inspect `components.json` and reuse an existing component from `src/components/ui/` whenever one fits.
- Add or update components only through Bun, for example `bunx --bun shadcn@latest add button`. Do not copy shadcn component source manually.
- Keep the project synchronized with the required preset using `bunx --bun shadcn@latest apply --preset bJiC`. Never initialize or apply a different preset without explicit user approval.
- Use the generated shadcn semantic tokens (`background`, `foreground`, `primary`, `secondary`, `muted`, `accent`, `destructive`, `border`, `input`, `ring`, `card`, `popover`, and sidebar tokens) for editor chrome. Do not add hard-coded UI colors when a theme token exists.
- Use the preset's spacing, radius, typography, focus, disabled, hover, and motion conventions. New custom controls must be composed from shadcn/Base UI primitives and styled with the same tokens.
- Hugeicons is the required icon set. Reuse the wrappers in `src/components/icons.tsx`; do not add Lucide or another icon package.
- User-authored artboard content and exported App Store screens are exempt from the neutral UI palette because their colors and fonts are part of the user's design. The surrounding editor chrome is not exempt.

## AI Screenshot Generation

The "Mit AI generieren" button in the topbar opens `AiGenerateModal`, where the user describes their app and uploads raw screenshots. An agent loop then designs App Store screens directly on the canvas.

- **Stack**: Vercel AI SDK v7 (`streamText` with `tools` and `stopWhen: isStepCount(64)`), Moonshot AI via the OpenAI-compatible provider `@ai-sdk/openai-compatible`, model `kimi-k3`. The Moonshot API does not allow direct browser calls (CORS), so the browser talks to `/api/moonshot/*`, which the Vite dev/preview server proxies to `https://api.moonshot.ai` (see `vite.config.ts`). The proxy injects the `Authorization` header from `MOONSHOT_API_KEY` in `.env.local` (no `VITE_` prefix — the key stays server-side and never enters the client bundle). Changing the key requires a dev-server restart.
- **Architecture**: The model only mutates the editor through the tools in `src/ai/tools.ts`, which delegate to the `AiEditorController` from `src/ai/controller.ts`. `App.tsx` wires the controller to its state via a non-history `setSlides` adapter that keeps `slidesRef` synchronously up to date — required because tool calls within one step run in the same tick and read state between mutations. One `checkpoint()` before the run makes an entire generation a single undo step, and `prepareAiRun` clears the current element selection so selection UI can't contaminate the layout measurements or preview captures below.
- **Tools** (14): `get_canvas_state`, `add_slide`, `rename_slide`, `set_slide_background`, `delete_slide`, `add_text`, `add_device`, `add_shape`, `add_image`, `set_device_screenshot`, `update_element`, `delete_element`, `inspect_slide`, `render_slide_preview`. They cover everything the sidebar UI can do (fonts, device mockups, screenshot placement, positioning) plus a feedback loop for the model to check and correct its own layout. Per-word rich text (the canvas's word-highlight feature) is exposed through the `highlights` array on `add_text`/`update_element`: the model passes substrings with color/backgroundColor/borderRadius/padding/bold/etc., and `src/ai/richtext.ts` converts them into the sanitized `html` field — the model never writes raw HTML, and `sanitizeRichText` in `src/utils.ts` is the single whitelist for what span styles survive (keep it in sync with what `richtext.ts` emits).
- **Feedback loop**: `src/ai/measure.ts` reads the real, rendered DOM (`getBoundingClientRect` on each `[data-element-id]` node inside `#artboard-{slideId}`) to compute each element's true percent-of-canvas bounding box and generate text-overflow/overlap warnings — this is ground truth the model cannot fake by reasoning about its own tool inputs alone. `src/ai/preview.ts` rasterizes a slide to a downscaled JPEG (430×932, via `html-to-image`'s `toJpeg`) so the model can literally look at what it built. Every mutating tool (`add_text`, `add_device`, `add_shape`, `add_image`, `set_device_screenshot`, `update_element`) returns the affected element's bounding box plus slide warnings in its result; `inspect_slide` returns the full slide's boxes and warnings on demand; `render_slide_preview` returns both the warnings and the rendered image (as a multimodal tool result via `toModelOutput`, so Gemini receives it as an actual inline image, not a text blob). The prompt caps this at 2 repair rounds per slide so the model doesn't get stuck polishing forever.
- **The fontSize trap**: `fontSize` on text elements is a raw CSS px value on the artboard's *internal* 330px-wide DOM base (`.artboard-export { width: 330px }` in `styles.css`), not a percent and not px at the 1290px export resolution — export just stretches the 330px DOM uniformly to 1290px. Concretely: hero headlines ≈ 32-46, sub-headlines ≈ 18-24, body copy ≈ 13-17, labels ≈ 9-12; anything above ~52 is almost always oversized by ~4x. This is the single easiest mistake to reintroduce when touching `tools.ts` or `prompt.ts` — the zod `.describe()` text and the prompt's Canvas section must always agree on these ranges.
- **Conventions when extending tools**: clamp all numeric inputs to the editor's ranges (see the `clamp*` helpers), return `{ ok: false, error }` objects instead of throwing, never expose data URLs to the model (the snapshot replaces them with asset ids), and keep zod `.describe()` texts accurate — they are the model's only documentation. New element fields must also be added to the per-type whitelist in `controller.ts` and, if user-adjustable, to `update_element`.
- **Prompt changes**: design-system rules and coordinate semantics live in `src/ai/prompt.ts`; keep them in sync with actual canvas behavior (percent coordinates, 1290 × 2796 artboard, the fontSize trap above, font weights actually loaded in `src/main.tsx`), and keep the "Verify your work" section's repair-round cap in sync with `render_slide_preview`'s actual behavior.
- **Streaming UI**: `runner.ts` maps stream parts to `AiRunEvent`s consumed by the modal's log; it never rejects — errors and aborts arrive as events.
- **Live AI cursor**: each tool in `tools.ts` also emits an `AiToolActivity` (tool name, slide/element id, percent-of-canvas x/y) through an optional `onActivity` callback, threaded via `runAiGeneration` in `runner.ts` into `App.tsx` state and rendered as `AiCursorOverlay` inside the targeted `#artboard-{slideId}`. The overlay carries `data-ai-overlay`, which the `filter` option on both `preview.ts`'s `toJpeg` and `App.tsx`'s export `toBlob` calls excludes, so the cursor never leaks into AI previews or exported PNGs. While a run is active or has just finished, `AiGenerateModal` docks to the bottom-right (`ai-modal-overlay--live`) instead of covering the canvas, so the live edits and cursor stay visible.

## Commit & Pull Request Guidelines

The repository has no established commit history. Use Conventional Commit messages such as `feat: add tilted device mockup` or `fix: preserve export dimensions`. Pull requests should include a concise behavior summary, verification commands, linked issue when applicable, and before/after screenshots for visual changes. Document the source and license of any third-party mockup asset.

## Security & Asset Handling

Never commit credentials, private screenshots, or unlicensed PSD files. Keep uploads browser-local. `.env.local` holds `MOONSHOT_API_KEY` (deliberately without `VITE_` prefix — the Vite proxy reads it server-side) and must stay untracked; remember that any `VITE_`-prefixed variable is embedded in the client bundle, so never put secrets there. Optimize transparent mockup assets before committing and preserve their screen-corner metadata in `src/mockups/catalog.ts`.
