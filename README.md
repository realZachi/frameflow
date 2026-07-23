# Frameflow

Design polished App Store screenshots in the browser, with precise manual controls or an optional AI-assisted workflow.

[![License: MIT](https://img.shields.io/badge/license-MIT-2563eb.svg)](LICENSE)
[![Contributions welcome](https://img.shields.io/badge/contributions-welcome-16a34a.svg)](CONTRIBUTING.md)

Frameflow is an open-source, desktop-first editor for building complete App Store screenshot sets. Projects stay in the browser, screenshots can be placed in perspective-aware device mockups, and every artboard exports at an exact store-ready resolution.

> Frameflow is in active early development. The editor UI, code, issues, and project documentation use English.

## Why Frameflow?

- **Design in one workspace** — arrange a complete screenshot story across multiple portrait artboards.
- **Keep control** — edit typography, gradients, shapes, images, mockups, alignment, stacking, and spacing directly.
- **Use AI when useful** — describe an app, upload raw screenshots, and let the agent build or revise screens through the same editor operations.
- **Work locally** — projects and uploads are stored in the browser with IndexedDB.
- **Export accurately** — download complete sets as `1290 × 2796` or `1242 × 2688` PNG files in one ZIP archive.
- **Bring your own key** — AI generation uses the self-hoster's Moonshot API key; the editor itself needs no API key.

## Quick start

### Requirements

- [Bun](https://bun.sh/) 1.3 or newer
- A current desktop browser

Clone or fork the repository, then run:

```bash
bun install
bun run dev
```

Open [http://127.0.0.1:4173](http://127.0.0.1:4173). No account or API key is required for the core editor.

The `"private": true` package flag only prevents accidental publication to a package registry; it does not restrict repository access or the MIT license.

## Enable AI generation

AI generation is optional. It currently uses Moonshot AI's OpenAI-compatible API and the `kimi-k3` model.

1. Create a key in the [Kimi API console](https://platform.kimi.ai/console/api-keys).
2. Copy the environment template:

   ```bash
   cp .env.example .env.local
   ```

3. Add your key to `.env.local`:

   ```dotenv
   MOONSHOT_API_KEY=your_key_here
   ```

4. Restart the development server after changing the key.

The key intentionally has no `VITE_` prefix. Vite's local server reads it and proxies `/api/moonshot/*` to Moonshot, so the key is not included in the browser bundle. Never commit `.env.local` or put a secret in a `VITE_*` variable.

When you start an AI run, the description and screenshots selected for that run are sent to Moonshot AI. Normal editing, local persistence, and export do not call the AI provider. API usage may incur charges from Moonshot.

AI requests may be written in any language, but generated canvas copy and completion summaries remain in English.

## Use the editor

1. Start with a template or add an empty screen.
2. Use the left sidebar to add text, device mockups, shapes, backgrounds, or uploads.
3. Select an element to edit it; drag the handles to move, resize, or rotate it.
4. Place an uploaded PNG, JPG, or WebP freely or inside a selected device.
5. Optionally choose **Generate with AI** to create a set, or select a screen and use its contextual magic-cursor action to revise only that screen.
6. Choose **Export all as ZIP** and select an export format.

Projects save automatically in the current browser profile. Clearing site data also removes saved projects, so export important work before resetting browser storage.

## Commands

| Command | Purpose |
| --- | --- |
| `bun run dev` | Start the local editor on port `4173` |
| `bun run structure` | Enforce stylesheet module boundaries |
| `bun run typecheck` | Run strict TypeScript checks |
| `bun run lint` | Run typed ESLint, complexity, and dependency rules |
| `bun run test` | Run the Vitest suite once |
| `bun run test:coverage` | Run tests and enforce coverage thresholds |
| `bun run build` | Type-check and create the production bundle |
| `bun run preview` | Serve the production bundle locally with the API proxy |
| `bun run audit` | Check installed dependencies for known vulnerabilities |
| `bun run check` | Run every required local and CI quality gate |

Rendered editor, export, and AI changes still require focused browser verification in addition to the automated suite.

## Self-hosting

`bun run build` creates a static application in `dist/`. The editor can be hosted as a static site when AI generation is not needed.

AI generation additionally requires a server-side proxy from `/api/moonshot/*` to `https://api.moonshot.ai/*` that injects `Authorization: Bearer $MOONSHOT_API_KEY`. The Vite development and preview servers already provide this proxy. For another hosting platform, reproduce that route in a server function or reverse proxy and keep the key in the host's secret store.

Do not expose a shared production key in client-side code. If every deployment should use a different key, each self-hoster should configure `MOONSHOT_API_KEY` in their own server environment.

## Architecture

Frameflow is a single-package React 19, TypeScript, Vite, and Tailwind CSS application.

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

See [Architecture](docs/ARCHITECTURE.md) for the editor data flow, export pipeline, AI safety boundaries, and extension points. Agent-assisted contributors must also follow [AGENTS.md](AGENTS.md). See the [mockup specification](src/mockups/README.md) before adding a device asset.

## Contributing

Bug reports, design improvements, documentation fixes, translations, new mockups, and code contributions are welcome.

Read [CONTRIBUTING.md](CONTRIBUTING.md) for setup, coding conventions, manual test expectations, and the pull request checklist. By participating, you agree to follow the [Code of Conduct](CODE_OF_CONDUCT.md).

For help, see [SUPPORT.md](SUPPORT.md). Report security issues privately according to [SECURITY.md](SECURITY.md). Project roles and decision-making are described in [GOVERNANCE.md](GOVERNANCE.md).

## License and trademarks

Frameflow is available under the [MIT License](LICENSE). Asset-specific terms and contribution requirements are documented in [ASSET_LICENSES.md](ASSET_LICENSES.md).

Apple, App Store, iPhone, and related marks are trademarks of Apple Inc. Frameflow is an independent project and is not affiliated with or endorsed by Apple Inc. Device mockups are provided for illustrative design use; users remain responsible for following applicable platform and trademark guidelines.

Documentation last reviewed: 2026-07-23.
