import { createInitialSlides } from '../data'
import { loadLegacyProject, type PersistedProject, type ProjectSummary } from '../persistence'
import type { CanvasElement, Slide, UploadAsset } from '../types'
import { uid } from '../utils'

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
  const names = new Set(projects.map((project) => project.projectName.toLocaleLowerCase('de-DE')))
  if (!names.has(desiredName.toLocaleLowerCase('de-DE'))) return desiredName

  let suffix = 2
  while (names.has(`${desiredName} ${suffix}`.toLocaleLowerCase('de-DE'))) suffix += 1
  return `${desiredName} ${suffix}`
}

export const formatProjectTime = (timestamp: number) => new Date(timestamp).toLocaleString('de-DE', {
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
})

export const freshElementIds = (elements: CanvasElement[]) =>
  elements.map((element) => ({ ...element, id: uid(element.type) }))
