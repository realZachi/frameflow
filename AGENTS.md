# Repository Guidelines

## Project Structure & Module Organization

Frameflow is a single-package React 19, TypeScript, and Vite application.

- `src/App.tsx` owns editor state, history, uploads, persistence, and export orchestration.
- `src/components/` contains the canvas, inspector, sidebar, and mockup renderers.
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

## Testing Guidelines

There is no automated test framework yet. Every UI change must be manually checked in the browser: add/select an element, edit its properties, exercise undo/redo, and export a ZIP. Confirm exported PNGs remain `1290 × 2796`. If adding automated tests, use colocated `*.test.ts` or `*.test.tsx` files and add the corresponding Bun script in the same change.

## Commit & Pull Request Guidelines

The repository has no established commit history. Use Conventional Commit messages such as `feat: add tilted device mockup` or `fix: preserve export dimensions`. Pull requests should include a concise behavior summary, verification commands, linked issue when applicable, and before/after screenshots for visual changes. Document the source and license of any third-party mockup asset.

## Security & Asset Handling

Never commit credentials, private screenshots, or unlicensed PSD files. Keep uploads browser-local. Optimize transparent mockup assets before committing and preserve their screen-corner metadata in `src/mockups/catalog.ts`.
