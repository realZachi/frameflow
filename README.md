# Frameflow

Frameflow is a browser-based studio for designing App Store screenshots. Arrange multiple portrait screens, add editable text and backgrounds, place screenshots inside device mockups, and export the complete set as high-resolution PNG files in one ZIP archive.

## Features

- Multiple `1290 × 2796` App Store artboards in one horizontal workspace
- Editable text, fonts, colors, gradients, alignment, and spacing
- Move, resize, rotate, lock, duplicate, and reorder canvas elements
- CSS device frames and photo-realistic PSD-derived mockups
- Perspective-correct screenshot insertion for tilted devices
- Undo/redo and browser-local project persistence
- One-click PNG and ZIP export without a backend

## Getting Started

Frameflow uses [Bun](https://bun.sh/) for dependency and script management.

```bash
bun install
bun run dev
```

Open [http://127.0.0.1:4173](http://127.0.0.1:4173) in a desktop browser. The editor is designed for larger screens and currently stores projects in the browser's local storage.

## Using the Editor

1. Select a template or add an empty screen.
2. Use the left toolbar to add text, device mockups, backgrounds, or uploads.
3. Click an element to edit its properties; drag the blue handles to resize or rotate it.
4. Upload a PNG, JPG, or WebP and place it freely or inside the selected device.
5. Choose **Alle als ZIP** to export every artboard as a `1290 × 2796` PNG.

## Development

```bash
bun run lint      # Run ESLint
bun run build     # Type-check and create dist/
bun run preview   # Preview the production bundle
```

There is no automated test suite yet. For UI changes, verify element editing, undo/redo, screenshot masking, and ZIP export manually. Exported PNG dimensions must remain exact.

## Project Structure

```text
src/App.tsx                 Editor state, persistence, and export
src/components/             Canvas and inspector components
src/mockups/catalog.ts      Mockup definitions and screen geometry
src/assets/mockups/         Browser-ready transparent overlays
src/data.ts                 Starter templates
src/styles.css              Global editor visual system
```

## Adding Mockups

Photoshop files are converted during development rather than loaded in the browser. A perspective mockup needs a transparent frame overlay and four normalized screen corners. See [the mockup specification](src/mockups/README.md) for the required PSD structure and catalog format.

## Contributing

Read [AGENTS.md](AGENTS.md) for repository conventions, verification requirements, asset handling, and pull request guidance. Do not commit private screenshots, unlicensed design files, or secrets.
