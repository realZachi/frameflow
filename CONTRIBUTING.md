# Contributing to Frameflow

Thank you for helping make App Store screenshot design more accessible. Contributions of all sizes are welcome, including bug reports, documentation, translations, design feedback, mockups, and code.

By participating, you agree to follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## Just start

Frameflow is early, and it improves fastest when people fix what annoys them. If you hit a bug, fix it. If something is missing and you think others would want it too, add it. You do not need to ask first, and you do not need an issue — a pull request is a perfectly good way to open the conversation.

If you would rather pick up something already scoped, the `good first issue` and `help wanted` labels are a good place to look.

Two things to keep in mind, both about safety rather than process:

- Never post API keys, private screenshots, customer data, or security details in a public issue or pull request.
- Security vulnerabilities go through the private process in [SECURITY.md](SECURITY.md), not the issue tracker.

Planning something large, like reworking the data model or the visual system? A short note before you build can save you from writing code that cannot be merged. That is a favour to yourself, not a gate.

AI-assisted contributions are welcome. The contributor remains responsible for understanding the change, reviewing the complete diff, removing generated clutter, testing behavior, and explaining the design. Read [AGENTS.md](AGENTS.md) before using a coding agent in this repository; generated code is held to the same review standard as handwritten code.

## Development setup

Frameflow uses Bun for package and script operations.

1. Fork the repository and clone your fork.
2. Create a focused branch from `main`:

   ```bash
   git switch -c feat/short-description
   ```

3. Install dependencies:

   ```bash
   bun install
   ```

4. Start the editor:

   ```bash
   bun run dev
   ```

5. Open [http://127.0.0.1:4173](http://127.0.0.1:4173).

The editor works without an API key. To work on AI generation, copy `.env.example` to `.env.local`, add at least one of the listed `VITE_*` provider keys, and restart the app. These keys are visible to the local browser, so keep that file local and never deploy a keyed build.

## Project map

| Area | Location |
| --- | --- |
| Application composition | `src/App.tsx` |
| Project lifecycle, shell, and export | `src/app/` |
| Editor history, actions, and calculations | `src/editor/` |
| Canvas, sidebar, inspector, and modals | `src/components/` |
| Reusable shadcn UI primitives | `src/components/ui/` |
| AI runner, tool groups, prompt, and visual feedback | `src/ai/` |
| Shared editor models | `src/types.ts` |
| Templates and presets | `src/data.ts` |
| Browser persistence | `src/persistence.ts` |
| Device mockups and perspective data | `src/mockups/` |
| Base and themed editor styles | `src/styles/` |

Read [AGENTS.md](AGENTS.md) and its focused rule documents before changing code. Read [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) before changing history, persistence, export, or AI tools. Read [src/mockups/README.md](src/mockups/README.md) and [ASSET_LICENSES.md](ASSET_LICENSES.md) before adding a mockup.

## Code conventions

- Use TypeScript, two-space indentation, single quotes, and no semicolons.
- Prefer functional React components and existing discriminated unions from `src/types.ts`.
- Use PascalCase for components and exported types, camelCase for functions and variables, and kebab-case for CSS classes.
- Keep editor mutations immutable. Undo and redo depend on reliable snapshots.
- Keep unrelated refactors out of a focused pull request.
- Add comments only where they explain a non-obvious constraint or decision.
- Respect the automated ceilings for module size, function size, complexity, nesting, parameters, and stylesheet size.
- Do not suppress or weaken a quality gate to make a change pass.

The quote and semicolon style applies to handwritten source. Files in `src/components/ui/` retain shadcn's generated style and must be changed only through the shadcn CLI.

### UI changes

shadcn/ui is the required application UI system. `components.json` and preset `bJiC` are the source of truth.

- Reuse a component from `src/components/ui/` when one fits.
- Add components with Bun, for example:

  ```bash
  bunx --bun shadcn@latest add button
  ```

- Do not introduce another component library, icon library, or parallel token system.
- Use semantic theme tokens for editor chrome.
- Use the Hugeicons wrappers in `src/components/icons.tsx`.
- User-authored artboard content may use arbitrary colors and fonts; editor chrome may not.

Include before-and-after images or a short recording for visible UI changes. Do not include private or copyrighted customer content.

`src/styles/base.css` imports `shadcn/tailwind.css`, so `shadcn` is a build dependency as well as a generator. The `@hono/node-server` override in `package.json` keeps shadcn's optional MCP dependency chain on a patched version. Run both `bun run check` and a shadcn add/apply command before changing or removing that override.

### AI changes

The model may mutate the editor only through tools in `src/ai/tools.ts`.

- Clamp numeric inputs to editor limits.
- Return `{ ok: false, error }` for recoverable tool failures.
- Never expose data URLs or secret values to the model.
- Keep tool descriptions aligned with actual canvas behavior.
- Update the controller whitelist when adding element fields.
- Keep `src/ai/prompt.ts` and tool descriptions consistent.
- Remember that text `fontSize` is CSS pixels on the internal 330 px artboard, not pixels on the 1290 px export.
- Preserve the measurement and rendered-preview feedback loop for layout validation.

An AI generation run should remain one undo step. Test both generating new slides and editing one existing slide when changing this area.

### Mockups and other assets

Only contribute files you have the right to redistribute.

- Do not commit PSD or PSB source files.
- Add optimized, browser-ready PNG or WebP overlays only.
- Record the asset creator, original source URL, license, required attribution, and any modifications in `ASSET_LICENSES.md`.
- Include permission evidence in the pull request when the license is not clearly public.
- Do not add private screenshots, logos, or customer artwork.

Contributions without clear redistribution rights cannot be merged.

## Verify your change

Run the full local check before opening a pull request:

```bash
bun run check
```

Unit tests and coverage run automatically. There is no automated browser test suite yet, so manually test rendered behavior your change touches and describe the result in the pull request.

For editor changes, consider this baseline:

- Add, edit, duplicate, lock, reorder, and delete an element.
- Verify undo and redo around the changed behavior.
- Reload and confirm the project restores from IndexedDB.
- Check screenshot masking for both flat and perspective devices.
- Export both supported formats and confirm the PNG dimensions.
- Verify that selection controls and the AI cursor do not appear in exports.
- Check the desktop editor at a narrower window width.

For AI changes, also verify a missing or invalid key fails safely and does not reveal the key.

## Pull requests

Keep them small enough that someone can actually review them. Beyond that, what helps:

- The problem and how you solved it.
- How you tested it, and what you saw.
- Before-and-after visuals for UI changes.
- Source and license information for third-party assets.
- Anything you deliberately left for later.

CI has to pass before merge. Maintainers may ask for changes to keep behavior, architecture, and visual language consistent — that is about the codebase staying coherent, not about the quality of your work.

## Commit messages

Use concise [Conventional Commit](https://www.conventionalcommits.org/) messages:

```text
feat: add perspective device mockup
fix: preserve export dimensions
docs: clarify provider setup
```

## Licensing of contributions

By submitting a contribution, you agree that it may be distributed under the repository's [MIT License](LICENSE) and confirm that you have the right to submit it. Third-party material remains subject to its own compatible license and must be documented.
