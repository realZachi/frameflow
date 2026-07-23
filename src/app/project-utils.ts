import { createInitialSlides } from '../data'
import { loadLegacyProject, type PersistedProject, type ProjectSummary } from '../persistence'
import type { Slide, UploadAsset } from '../types'

export const DEFAULT_PROJECT_NAME = 'Summer Launch'

export type InitialProjectState = {
  projectName: string
  slides: Slide[]
  uploads: UploadAsset[]
}

export const loadInitialState = (): InitialProjectState => {
  const legacy = loadLegacyProject()
  if (legacy) return { projectName: DEFAULT_PROJECT_NAME, ...legacy }
  return { projectName: DEFAULT_PROJECT_NAME, slides: createInitialSlides(), uploads: [] }
}

export const sortProjectSummaries = (projects: ProjectSummary[]) =>
  [...projects].sort((a, b) => b.savedAt - a.savedAt)

export const upsertProjectSummary = (
  projects: ProjectSummary[],
  project: PersistedProject,
) => sortProjectSummaries([
  ...projects.filter((item) => item.id !== project.id),
  {
    id: project.id,
    projectName: project.projectName,
    createdAt: project.createdAt,
    savedAt: project.savedAt,
  },
])

export const getUniqueProjectName = (
  projects: ProjectSummary[],
  desiredName: string,
) => {
  const names = new Set(projects.map((project) => project.projectName.toLocaleLowerCase('en-US')))
  if (!names.has(desiredName.toLocaleLowerCase('en-US'))) return desiredName

  let suffix = 2
  while (names.has(`${desiredName} ${suffix}`.toLocaleLowerCase('en-US'))) suffix += 1
  return `${desiredName} ${suffix}`
}

export const formatProjectTime = (timestamp: number) => new Date(timestamp).toLocaleString('en-US', {
  day: 'numeric',
  month: 'short',
  hour: 'numeric',
  minute: '2-digit',
})
