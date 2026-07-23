import { describe, expect, it } from 'vitest'
import { normalizePersistedProject } from './persistence'

describe('persisted project normalization', () => {
  it('accepts a project without slides', () => {
    expect(normalizePersistedProject({
      id: 'project-empty',
      projectName: 'Empty project',
      slides: [],
      uploads: [],
      createdAt: 10,
      savedAt: 20,
    })).toEqual({
      id: 'project-empty',
      projectName: 'Empty project',
      slides: [],
      uploads: [],
      createdAt: 10,
      savedAt: 20,
    })
  })

  it('still rejects projects without a slides collection', () => {
    expect(normalizePersistedProject({
      id: 'project-invalid',
      projectName: 'Invalid project',
      uploads: [],
      savedAt: 20,
    })).toBeNull()
  })
})
