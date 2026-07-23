import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'

const MAX_STYLESHEET_LINES = 700
const sourceDirectory = path.resolve(import.meta.dirname, '../src')
const baseStylesheet = path.join(sourceDirectory, 'styles/base.css')
const themeStylesheet = path.join(sourceDirectory, 'styles/theme.css')

const findStylesheets = async (directory: string): Promise<string[]> => {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = await Promise.all(entries.map(async (entry) => {
    const entryPath = path.join(directory, entry.name)
    if (entry.isDirectory()) return findStylesheets(entryPath)
    return entry.name.endsWith('.css') ? [entryPath] : []
  }))
  return files.flat()
}

const violations: string[] = []
for (const stylesheet of await findStylesheets(sourceDirectory)) {
  const content = await readFile(stylesheet, 'utf8')
  const lineCount = content.split(/\r?\n/).length
  if (lineCount > MAX_STYLESHEET_LINES) {
    violations.push(
      `${path.relative(process.cwd(), stylesheet)} has ${lineCount} lines; `
      + `the limit is ${MAX_STYLESHEET_LINES}. Split it by responsibility.`,
    )
  }
}

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
