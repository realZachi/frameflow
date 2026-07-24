import { describe, expect, it } from 'vitest'
import { filterAcceptedImageFiles } from './ai-modal-image-files'

const file = (name: string, type: string) => new File(['x'], name, { type })

describe('filterAcceptedImageFiles', () => {
  it('keeps PNG, JPEG, and WebP uploads', () => {
    const accepted = filterAcceptedImageFiles([
      file('logo.png', 'image/png'),
      file('shot.jpg', 'image/jpeg'),
      file('shot.webp', 'image/webp'),
    ])

    expect(accepted.map((item) => item.name)).toEqual([
      'logo.png',
      'shot.jpg',
      'shot.webp',
    ])
  })

  it('rejects unsupported file types', () => {
    const accepted = filterAcceptedImageFiles([
      file('notes.txt', 'text/plain'),
      file('vector.svg', 'image/svg+xml'),
      file('photo.gif', 'image/gif'),
      file('ok.png', 'image/png'),
    ])

    expect(accepted.map((item) => item.name)).toEqual(['ok.png'])
  })

  it('returns an empty list when nothing is accepted', () => {
    expect(filterAcceptedImageFiles([file('a.gif', 'image/gif')])).toEqual([])
    expect(filterAcceptedImageFiles([])).toEqual([])
  })
})
