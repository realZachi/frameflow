# UI, styling, and assets

## Required UI system

`components.json` and shadcn preset `bJiC` are the source of truth: Nova, neutral semantic tokens, Geist, Base UI, and Hugeicons.

- Inspect existing primitives before adding a control.
- Add or update primitives with `bunx --bun shadcn@latest add <component>`.
- Synchronize the preset only with `bunx --bun shadcn@latest apply --preset bJiC`.
- Never initialize another preset or add another component or icon library without approval.
- Use wrappers from `src/components/icons.tsx`.
- Use semantic theme tokens for editor chrome. Do not hard-code a competing palette.
- Keep editor chrome on the shared `--editor-text-*` scale. The app shell
  normalizes shadcn controls globally; do not add per-feature font-size fixes.
- Preserve focus, hover, disabled, spacing, radius, typography, and motion conventions.

`src/components/ui/` is generated code. Do not manually reformat, reorganize, or patch it. It is exempt from the handwritten quote/semicolon style but still receives correctness and type checks.

## Styling

- `src/styles.css` contains imports only.
- `src/styles/base.css` owns layout and component structure.
- `src/styles/theme.css` owns shadcn tokens, theme overrides, and the compact editor type scale.
- Keep each stylesheet below 700 lines; `bun run structure` enforces this.
- Reuse existing classes and semantic tokens before adding a selector.
- Do not use `!important` to bypass ownership or specificity problems.
- User-authored artboard content may use arbitrary visual values. Editor chrome may not.

## Assets

- Read `src/mockups/README.md` before changing mockups.
- Commit only optimized, browser-ready PNG or WebP overlays.
- Never commit PSD/PSB source, private screenshots, customer material, or assets without redistribution rights.
- Record creator, source URL, license, attribution, and modifications in `ASSET_LICENSES.md`.
- Keep perspective geometry and screen-corner metadata in `src/mockups/catalog.ts`.

Changes to assets, fonts, DOM nesting, or styles can affect export even when the editor preview looks correct. Verify the generated PNGs.
