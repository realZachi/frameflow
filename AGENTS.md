# Repository Guidelines

## Project Structure & Module Organization

Frameflow is a single-package React 19, TypeScript, and Vite application.

- `src/App.tsx` owns editor state, history, uploads, persistence, and export orchestration.
- `src/ai/` contains the AI generation feature: `controller.ts` (editor bridge), `tools.ts` (tool definitions), `prompt.ts` (system instructions), `runner.ts` (agent loop).
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

- **Stack**: Vercel AI SDK v7 (`streamText` with `tools` and `stopWhen: isStepCount(48)`), Google provider `@ai-sdk/google`, model `gemini-3.5-flash`. Calls go directly from the browser to the Gemini API (CORS is allowed); the key is read from `import.meta.env.VITE_GEMINI_API_KEY`, configured in `.env.local` (never committed).
- **Architecture**: The model only mutates the editor through the tools in `src/ai/tools.ts`, which delegate to the `AiEditorController` from `src/ai/controller.ts`. `App.tsx` wires the controller to its state via a non-history `setSlides` adapter that keeps `slidesRef` synchronously up to date — required because tool calls within one step run in the same tick and read state between mutations. One `checkpoint()` before the run makes an entire generation a single undo step.
- **Tools** (12): `get_canvas_state`, `add_slide`, `rename_slide`, `set_slide_background`, `delete_slide`, `add_text`, `add_device`, `add_shape`, `add_image`, `set_device_screenshot`, `update_element`, `delete_element`. They cover everything the sidebar UI can do (fonts, device mockups, screenshot placement, positioning).
- **Conventions when extending tools**: clamp all numeric inputs to the editor's ranges (see the `clamp*` helpers), return `{ ok: false, error }` objects instead of throwing, never expose data URLs to the model (the snapshot replaces them with asset ids), and keep zod `.describe()` texts accurate — they are the model's only documentation. New element fields must also be added to the per-type whitelist in `controller.ts` and, if user-adjustable, to `update_element`.
- **Prompt changes**: design-system rules and coordinate semantics live in `src/ai/prompt.ts`; keep them in sync with actual canvas behavior (percent coordinates, 1290 × 2796 artboard, font weights actually loaded in `src/main.tsx`).
- **Streaming UI**: `runner.ts` maps stream parts to `AiRunEvent`s consumed by the modal's log; it never rejects — errors and aborts arrive as events.

## Testing Guidelines

There is no automated test framework yet. Every UI change must be manually checked in the browser: add/select an element, edit its properties, exercise undo/redo, and export a ZIP. Confirm exported PNGs remain `1290 × 2796`. Changes to `src/ai/` additionally require one manual generation run against the real Gemini API (needs `VITE_GEMINI_API_KEY` in `.env.local`) — verify tool calls appear in the modal log, slides are appended, and a single undo reverts the whole run. If adding automated tests, use colocated `*.test.ts` or `*.test.tsx` files and add the corresponding Bun script in the same change.

## Commit & Pull Request Guidelines

The repository has no established commit history. Use Conventional Commit messages such as `feat: add tilted device mockup` or `fix: preserve export dimensions`. Pull requests should include a concise behavior summary, verification commands, linked issue when applicable, and before/after screenshots for visual changes. Document the source and license of any third-party mockup asset.

## Security & Asset Handling

Never commit credentials, private screenshots, or unlicensed PSD files. Keep uploads browser-local. `.env.local` holds `VITE_GEMINI_API_KEY` and must stay untracked; remember that any `VITE_`-prefixed variable is embedded in the client bundle, so never put server-grade secrets there. Optimize transparent mockup assets before committing and preserve their screen-corner metadata in `src/mockups/catalog.ts`.
