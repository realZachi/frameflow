# Frameflow architecture

This document explains the boundaries that matter when changing Frameflow. It complements the contributor guide; the source code remains the final authority.

## Runtime overview

Frameflow is a client-side React application served by Vite.

```text
Browser
├── React editor state and undo history
├── IndexedDB projects and uploads
├── DOM-rendered artboards
└── PNG/ZIP export

Optional AI path
Browser → AI SDK provider → Google / Qwen / OpenAI / Anthropic / xAI
Browser → /api/moonshot/* → Vite proxy → Moonshot API
Browser → /api/ai-run-logs → Vite → ./ai-logs/*.json (developer opt-in)
```

The core editor has no backend requirement. The optional AI path is designed for localhost use: configured `VITE_*` provider keys enter the browser bundle. Google, Qwen, OpenAI, Anthropic, and xAI are called directly; Moonshot alone uses a local same-origin proxy because its API does not support the required browser CORS flow. Do not deploy an AI-enabled build with these keys.

## Editor state and history

`src/App.tsx` composes the application. Responsibilities are separated into:

| Area | Location |
| --- | --- |
| Project hydration, autosave, switching, and deletion | `src/app/use-project-workspace.ts` |
| Undo/redo and live updates | `src/editor/use-editor-history.ts` |
| Element, upload, template, and slide actions | `src/editor/use-editor-actions.ts` |
| Keyboard behavior and pure nudge calculations | `src/editor/use-editor-keyboard.ts`, `src/editor/nudge.ts` |
| AI run orchestration and live activity | `src/ai/use-ai-workflow.ts` |
| PNG/ZIP export | `src/app/use-slide-export.ts` |

Slides contain a background and an ordered array of discriminated canvas elements from `src/types.ts`. Element order is also layer order. Mutations must create new objects and arrays rather than modifying existing snapshots.

Undo and redo operate on editor snapshots. A user action should create one meaningful checkpoint. AI generation deliberately creates one checkpoint for the entire run so the user can undo the result in one step.

A project can contain zero slides. In that state there is no active slide, the
canvas presents blank and AI-assisted creation paths, and the empty slide array
is persisted as normal. New projects still begin with starter slides.

## Rendering and coordinates

Every artboard is rendered as a 330 px-wide DOM element with the aspect ratio `1290 / 2796`. Element positions and widths are stored as percentages of the artboard; heights are derived from content or aspect ratio.

Export scales that DOM representation to the selected output size. This has one important consequence: text `fontSize` values are CSS pixels on the 330 px internal artboard. They are not percentages and are not export-resolution pixels.

Typical internal font sizes are:

- Hero headline: `32–46`
- Sub-headline: `18–24`
- Body or supporting copy: `13–17`
- Small label: `9–12`

Values over roughly `52` are usually incorrect.

## Persistence

`src/persistence.ts` stores project data and uploaded assets in IndexedDB. A small local-storage migration path exists for legacy projects.

Persistence is browser-local:

- No project account or remote database exists.
- A different browser profile has a different project store.
- Clearing site data deletes saved projects.
- Schema changes must preserve existing projects or include an explicit migration.

Avoid putting credentials or provider responses into persisted project data.

Developer AI run logging is enabled only when `FRAMEFLOW_AI_LOGGING=true`. The browser sends a versioned, bounded record to the local Vite middleware, which validates it and writes one JSON file per run to the git-ignored `ai-logs/` directory in the repository. Records include normalized token usage, visible text and reasoning output, tool activity, and coarse request sizes. Frameflow does not add input prompt text, screenshot payloads or names, credentials, or raw provider metadata to the records.

## Export

`src/app/use-slide-export.ts` uses `html-to-image` to rasterize each artboard and JSZip to package the results. Output definitions live in `src/app/export-formats.ts`.

Supported output sizes are:

| Target | Dimensions |
| --- | --- |
| 6.9-inch display | `1290 × 2796` |
| 6.5-inch display | `1242 × 2688` |

The rendered artboard is the source of truth. Editor-only UI, including transform handles, selections, and elements carrying `data-ai-overlay`, must be filtered out of export.

Changes to artboard dimensions, transforms, font loading, or DOM nesting can affect image output even if the editor looks correct. Verify actual PNG dimensions after related changes.

## Device mockups

`src/mockups/catalog.ts` registers each supported mockup.

A perspective mockup contains:

- A transparent overlay.
- The overlay and screenshot aspect ratios.
- Four normalized screen corners.
- A default canvas placement.

The renderer derives a projective `matrix3d` from those corners. Do not replace this with a simple rotation for tilted devices. See `src/mockups/README.md` for the conversion format and `ASSET_LICENSES.md` for licensing requirements.

## AI generation

The AI feature is split into explicit layers:

| File | Responsibility |
| --- | --- |
| `src/ai/runner.ts` | Provider client, stream handling, and UI events |
| `src/ai/prompt.ts` | Design rules and coordinate semantics |
| `src/ai/tools.ts` | Tool composition and generate/edit tool boundary |
| `src/ai/*-tools.ts`, `src/ai/*-tool.ts` | Focused slide, media, text, update, and inspection tools |
| `src/ai/tool-context.ts` | Shared clamps, lookups, activity, and measurements |
| `src/ai/tool-schemas.ts` | Shared model-visible schemas and descriptions |
| `src/ai/controller.ts` | Allowed editor reads and mutations |
| `src/ai/measure.ts` | DOM-based element boxes and layout warnings |
| `src/ai/preview.ts` | Downscaled rendered slide previews |
| `src/ai/richtext.ts` | Safe per-word highlight markup |
| `src/ai/run-log.ts` | Versioned, privacy-bounded AI run log schema |
| `src/ai/run-log-client.ts` | Env-gated delivery to the local log endpoint |
| `scripts/ai-run-log-plugin.ts` | Validated, project-local JSON file writer |

The model does not receive unrestricted application access. It can only use the tools supplied by `createEditorTools`, and the controller applies per-element field whitelists.

Mutating tools return measured element bounds and layout warnings. The model can also inspect a full slide and request a rendered preview. These results close the gap between requested coordinates and the browser's actual layout.

Rich text is built from structured highlight input. The model never writes raw HTML. `sanitizeRichText` in `src/utils.ts` is the final whitelist for allowed span styles.

`src/ai/provider-catalog.ts` owns the selectable providers, models, transport metadata, and model-specific reasoning-effort choices. `src/ai/provider-config.ts` reads the matching `VITE_*` key from `.env.local`, and `src/ai/runner.ts` lazily loads the selected native AI SDK provider. The runner passes portable efforts through the AI SDK's standardized `reasoning` option so each native provider can map it to its own API; Moonshot/Kimi K3 `max` goes through OpenAI-compat `providerOptions` because the shared option has no `max`. The generate modal presents one model picker grouped by provider, with reasoning effort as secondary chips when the model supports it. Requests go directly from the local browser to Google, Alibaba/Qwen, OpenAI, Anthropic, or xAI. Moonshot uses the OpenAI chat provider through the only Vite proxy route.

The keys are intentionally browser-visible for this localhost-only workflow. Never commit `.env.local` or publish an AI-enabled build. A hosted deployment must replace this local credential model with an authenticated backend.

## UI system

Editor chrome uses shadcn/ui with the configuration in `components.json`:

- Nova base
- Neutral semantic tokens
- Geist
- Base UI primitives
- Hugeicons

Reusable primitives live in `src/components/ui/`. Artboard content is intentionally exempt from the neutral editor palette because it represents the user's exported design.

`src/styles.css` preserves stylesheet order by importing `src/styles/base.css` and `src/styles/theme.css`. The base layer imports `shadcn/tailwind.css`, which makes the shadcn package a build dependency. `package.json` currently overrides `@hono/node-server` to a patched release because shadcn's optional MCP dependency requests an older major. Re-evaluate the override when the upstream dependency range changes; do not remove it without running the dependency audit and a full build.

## Safe extension checklist

When adding an element field:

1. Add it to the appropriate type in `src/types.ts`.
2. Set a safe default where the element is created.
3. Render it in the relevant component.
4. Expose an editor control if users should change it.
5. Add it to persistence-compatible data handling.
6. Add it to the controller's per-type whitelist.
7. Add it to `update_element` only if the AI should change it.
8. Update tool descriptions and prompt rules.
9. Verify undo, reload, AI editing, and export.

When adding a new AI tool:

1. Keep its scope narrower than the underlying editor controller.
2. Validate and clamp all model input.
3. Return structured failures instead of throwing for expected errors.
4. Emit useful activity coordinates when the tool changes the canvas.
5. Return measurements after mutations.
6. Keep secrets, raw data URLs, and unrelated slide state out of model output.
