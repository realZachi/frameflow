import { describe, expect, it } from 'vitest'
import {
  getExportZipDownloadName,
  getExportZipEntryPath,
  getSafeFilename,
  getSlidePngFilename,
} from './export-paths'

describe('getSafeFilename', () => {
  it('sanitizes unsafe characters', () => {
    expect(getSafeFilename('My Project! / v2', 'Frameflow')).toBe('My-Project-v2')
  })

  it('falls back when the name is empty after sanitizing', () => {
    expect(getSafeFilename('!!!', 'Frameflow')).toBe('Frameflow')
  })
})

describe('getSlidePngFilename', () => {
  it('prefixes a zero-padded slide index', () => {
    expect(getSlidePngFilename(0, 'Hero')).toBe('01-Hero.png')
    expect(getSlidePngFilename(9, 'Feature One')).toBe('10-Feature-One.png')
  })
})

describe('getExportZipEntryPath', () => {
  it('keeps a flat path for a single format export', () => {
    expect(getExportZipEntryPath('6.9-inch', 0, 'Hero', false)).toBe('01-Hero.png')
  })

  it('nests files under the format folder for all-sizes export', () => {
    expect(getExportZipEntryPath('6.5-inch', 1, 'Details', true))
      .toBe('6.5-inch/02-Details.png')
  })
})

describe('getExportZipDownloadName', () => {
  it('builds a download name from the project and format', () => {
    expect(getExportZipDownloadName('Launch Kit', '6.9-inch'))
      .toBe('Launch-Kit-6.9-inch-Screens.zip')
    expect(getExportZipDownloadName('  ', 'all-sizes'))
      .toBe('Frameflow-all-sizes-Screens.zip')
  })
})
