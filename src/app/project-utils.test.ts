import { beforeEach, describe, expect, it } from 'vitest'
import {
  DEFAULT_PROJECT_NAME,
  getUniqueProjectName,
  loadInitialState,
  sortProjectSummaries,
  upsertProjectSummary,
} from './project-utils'
import type { PersistedProject, ProjectSummary } from '../persistence'

const summary = (
  id: string,
  projectName: string,
  savedAt: number,
): ProjectSummary => ({
  id,
  projectName,
  createdAt: savedAt - 1,
  savedAt,
})

const persistedProject = (
  id: string,
  projectName: string,
  savedAt: number,
): PersistedProject => ({
  ...summary(id, projectName, savedAt),
  slides: [{
    id: 'slide-1',
    name: 'Screen 1',
    background: {
      type: 'solid',
      color1: '#000000',
      color2: '#000000',
      angle: 0,
    },
    elements: [],
  }],
  uploads: [],
})

beforeEach(() => {
  localStorage.clear()
})

describe('project utilities', () => {
  it('creates an initial project when no legacy state exists', () => {
    const initial = loadInitialState()

    expect(initial.projectName).toBe(DEFAULT_PROJECT_NAME)
    expect(initial.slides.length).toBeGreaterThan(0)
    expect(initial.uploads).toEqual([])
  })

  it('loads valid legacy state', () => {
    const project = persistedProject('legacy', 'Legacy', 1)
    localStorage.setItem('frameflow-project-v5', JSON.stringify({
      slides: project.slides,
      uploads: project.uploads,
    }))

    expect(loadInitialState()).toMatchObject({
      projectName: DEFAULT_PROJECT_NAME,
      slides: project.slides,
      uploads: project.uploads,
    })
  })

  it('sorts and replaces project summaries by saved time', () => {
    const projects = [
      summary('old', 'Old', 10),
      summary('current', 'Current', 20),
    ]
    const updated = upsertProjectSummary(
      projects,
      persistedProject('old', 'Renamed', 30),
    )

    expect(updated.map((project) => project.id)).toEqual(['old', 'current'])
    expect(updated[0]?.projectName).toBe('Renamed')
    expect(sortProjectSummaries(projects).map((project) => project.id))
      .toEqual(['current', 'old'])
  })

  it('generates case-insensitive unique project names', () => {
    const projects = [
      summary('1', 'New Project', 1),
      summary('2', 'new project 2', 2),
    ]

    expect(getUniqueProjectName(projects, 'New Project')).toBe('New Project 3')
    expect(getUniqueProjectName(projects, 'Launch')).toBe('Launch')
  })
})
