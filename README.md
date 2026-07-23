# Frameflow

An AI-first, browser-based editor for App Store screenshot sets — the AI doesn't generate images, it builds real, editable designs.

[![License: MIT](https://img.shields.io/badge/license-MIT-2563eb.svg)](LICENSE)
[![Contributions welcome](https://img.shields.io/badge/contributions-welcome-16a34a.svg)](CONTRIBUTING.md)

Describe your app, upload raw screenshots, and an AI agent designs the full set — not as opaque bitmaps, but by driving the same editor operations you'd use by hand. Every text layer, gradient, shape, and device mockup it places stays a real canvas element: select it, restyle it, move it, or redo it manually. Then export every artboard at exact store resolutions.

Projects live entirely in your browser — no account, no backend. The editor itself works without any API key; bring your own key only for AI generation.

## Features

- **AI that designs, not renders** — the agent works through editor tool calls, so its output is a normal project: every element it creates is selectable and editable, and you can revise a single screen with the magic-cursor action instead of regenerating everything.
- **Bring your own model** — works with Moonshot, Google, Qwen, OpenAI, and Anthropic; pick provider and model per run.
- **Full screenshot sets** — design a multi-screen story on portrait artboards, not one image at a time.
- **Direct manipulation** — typography, gradients, shapes, images, mockups, alignment, stacking, and spacing are all hand-editable, with or without AI.
- **Perspective device mockups** — drop a raw screenshot into a device frame with correct 3D geometry.
- **Local-first** — projects and uploads are stored in IndexedDB in your browser.
- **Store-ready export** — download the whole set as `1290 × 2796` or `1242 × 2688` PNGs in one ZIP.

## Quick start

Requires [Bun](https://bun.sh/) 1.3+ and a current desktop browser.

```bash
bun install
bun run dev
```

Open [http://127.0.0.1:4173](http://127.0.0.1:4173) and start editing.

## Using the editor

1. Start from a template or an empty screen.
2. Add text, device mockups, shapes, backgrounds, or uploads from the left sidebar.
3. Select an element to edit it; drag the handles to move, resize, or rotate.
4. Drop an uploaded PNG, JPG, or WebP anywhere on the canvas — or into a selected device frame.
5. Optionally use **Generate with AI** to create a set, or the magic-cursor action on a single screen to revise just that screen.
6. **Export all as ZIP** and pick a format.

Projects save automatically to the current browser profile. Clearing site data deletes them, so export anything important before wiping browser storage.

## Set up AI generation

AI generation needs an API key for at least one provider — everything else in the editor works without one. Keys go in `.env.local`:

```bash
cp .env.example .env.local
```

```dotenv
VITE_MOONSHOT_API_KEY=
VITE_GOOGLE_GENERATIVE_AI_API_KEY=
VITE_ALIBABA_API_KEY=
VITE_OPENAI_API_KEY=
VITE_ANTHROPIC_API_KEY=
```

Restart the dev server after changing keys. Pick the provider and model in the generation dialog — models with configurable reasoning also expose their effort levels there. If a selected provider has no key, the dialog names the missing variable and disables generation.

How it works, and what to know:

- Google, Qwen, OpenAI, and Anthropic are called directly from the browser via the AI SDK. Only Moonshot goes through the local `/api/moonshot` CORS proxy.
- When you start a run, your description and selected screenshots are sent to that provider. Normal editing, persistence, and export never call any AI service. Provider charges may apply.
- The `VITE_*` keys are embedded in client code by design — this setup is **localhost-only**. Never commit `.env.local` or deploy a keyed build (see [Self-hosting](#self-hosting)).
- Prompts can be written in any language; generated canvas copy and summaries are in English.

For debugging, set `FRAMEFLOW_AI_LOGGING=true` in `.env.local` to write one JSON file per run to the git-ignored `ai-logs/` directory. Logs record provider, model, timing, visible model output, tool activity, and token usage — never prompt text, screenshots, or API keys.

## Commands

| Command | Purpose |
| --- | --- |
| `bun run dev` | Start the editor on port `4173` |
| `bun run typecheck` | Strict TypeScript checks |
| `bun run lint` | Typed ESLint, complexity, and dependency rules |
| `bun run structure` | Enforce stylesheet module boundaries |
| `bun run test` | Run the Vitest suite once |
| `bun run test:coverage` | Tests with coverage thresholds |
| `bun run build` | Type-check and build the production bundle |
| `bun run preview` | Serve the production bundle, including the Moonshot proxy |
| `bun run audit` | Check dependencies for known vulnerabilities |
| `bun run check` | All required local and CI quality gates |

Changes to rendering, export, or AI behavior also need manual verification in the browser — the automated suite doesn't cover pixels.

## Self-hosting

`bun run build` produces a static app in `dist/`. Built **without** provider keys, it can be hosted anywhere as a static site.

Do not host an AI-enabled build: Vite embeds `VITE_*` values into the client bundle, so any configured key becomes public. A hosted AI workflow would need its own authenticated backend or a short-lived credential exchange — neither is included here.

## Architecture

Frameflow is a single-package React 19 + TypeScript + Vite + Tailwind CSS app.

```text
src/App.tsx              Application composition
src/app/                 Project lifecycle, app shell, and export
src/editor/              History, editor actions, keyboard, pure calculations
src/components/          Canvas, toolbars, sidebar, modal, and shadcn UI
src/ai/                  AI runner, tool groups, prompt, measurement, previews
src/mockups/             Device definitions and perspective geometry
src/persistence.ts       IndexedDB project storage
src/types.ts             Shared editor models
src/styles/              Base styles and shadcn theme layer
```

[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) covers data flow, the export pipeline, AI safety boundaries, and extension points. Before adding a device asset, read the [mockup specification](src/mockups/README.md). Agent-assisted contributors must follow [AGENTS.md](AGENTS.md).

## Contributing

Bug reports, design improvements, docs fixes, new device mockups, and code are all welcome. Start with [CONTRIBUTING.md](CONTRIBUTING.md) for setup, conventions, and the PR checklist. By participating you agree to the [Code of Conduct](CODE_OF_CONDUCT.md).

- Questions and help: [SUPPORT.md](SUPPORT.md)
- Security issues (privately, please): [SECURITY.md](SECURITY.md)
- Project roles and decisions: [GOVERNANCE.md](GOVERNANCE.md)

## License and trademarks

MIT — see [LICENSE](LICENSE). Asset-specific terms are in [ASSET_LICENSES.md](ASSET_LICENSES.md). The `"private": true` flag in `package.json` only prevents accidental npm publication; it doesn't restrict the license.

Apple, App Store, and iPhone are trademarks of Apple Inc. Frameflow is an independent project, not affiliated with or endorsed by Apple. You remain responsible for following platform and trademark guidelines when using device mockups.
