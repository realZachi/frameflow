import { readFile } from 'node:fs/promises'
import path from 'node:path'

const sourceDirectory = path.resolve(import.meta.dirname, '../src')
const baseStylesheet = path.join(sourceDirectory, 'styles/base.css')
const themeStylesheet = path.join(sourceDirectory, 'styles/theme.css')

const violations: string[] = []

const baseStyles = await readFile(baseStylesheet, 'utf8')
const themeStyles = await readFile(themeStylesheet, 'utf8')
const typographyRules = [
  {
    pattern: /\.app-shell\s*\{[^}]*font-size:\s*var\(--editor-text-md\)/s,
    message: 'src/styles/theme.css must set the compact editor type scale on .app-shell.',
    stylesheet: themeStyles,
  },
  {
    pattern: /\.app-shell :is\([^)]*\[data-slot='button'][^)]*\[data-slot='select-trigger'][^)]*\)\s*\{[^}]*font-size:\s*var\(--editor-text-md\)/s,
    message: 'src/styles/theme.css must normalize shadcn controls to the editor type scale.',
    stylesheet: themeStyles,
  },
  {
    pattern: /:is\([^)]*\[data-slot='select-content'][^)]*\[data-slot='popover-content'][^)]*\) :is\([^)]*\[data-slot='select-item'][^)]*\[data-slot='dropdown-menu-item'][^)]*\)\s*\{[^}]*font-size:\s*var\(--editor-text-md\)/s,
    message: 'src/styles/theme.css must normalize portalled menus to the editor type scale.',
    stylesheet: themeStyles,
  },
  {
    pattern: /\.editor-empty-state p\s*\{[^}]*font-size:\s*var\(--editor-text-md\)/s,
    message: 'The editor empty state must use the shared editor type scale.',
    stylesheet: baseStyles,
  },
]
for (const rule of typographyRules) {
  if (!rule.pattern.test(rule.stylesheet)) violations.push(rule.message)
}

if (violations.length > 0) {
  for (const violation of violations) console.error(violation)
  process.exitCode = 1
}
