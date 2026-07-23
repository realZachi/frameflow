import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'

const MAX_STYLESHEET_LINES = 700
const sourceDirectory = path.resolve(import.meta.dirname, '../src')

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

if (violations.length > 0) {
  for (const violation of violations) console.error(violation)
  process.exitCode = 1
}
