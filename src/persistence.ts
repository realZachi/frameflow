import type { Slide, UploadAsset } from './types'

const DATABASE_NAME = 'frameflow'
const DATABASE_VERSION = 2
const PROJECT_STORE = 'projects'
const SETTINGS_STORE = 'settings'
const ACTIVE_PROJECT_KEY = 'activeProjectId'
const LEGACY_STORAGE_KEY = 'frameflow-project-v5'

export type PersistedProject = {
  id: string
  projectName: string
  slides: Slide[]
  uploads: UploadAsset[]
  createdAt: number
  savedAt: number
}

export type ProjectSummary = Pick<PersistedProject, 'id' | 'projectName' | 'createdAt' | 'savedAt'>

type SettingRecord = { key: string; value: string }

let databasePromise: Promise<IDBDatabase> | null = null

const openDatabase = (): Promise<IDBDatabase> => {
  if (databasePromise) return databasePromise

  databasePromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION)
    let settled = false

    const fail = (error: Error) => {
      settled = true
      databasePromise = null
      reject(error)
    }

    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(PROJECT_STORE)) {
        request.result.createObjectStore(PROJECT_STORE, { keyPath: 'id' })
      }
      if (!request.result.objectStoreNames.contains(SETTINGS_STORE)) {
        request.result.createObjectStore(SETTINGS_STORE, { keyPath: 'key' })
      }
    }
    request.onsuccess = () => {
      if (settled) {
        request.result.close()
        return
      }
      settled = true
      request.result.onversionchange = () => {
        request.result.close()
        databasePromise = null
      }
      resolve(request.result)
    }
    request.onerror = () => fail(request.error ?? new Error('Local project storage could not be opened.'))
    request.onblocked = () => fail(new Error('Local project storage is blocked by another tab.'))
  })

  return databasePromise
}

export const normalizePersistedProject = (value: unknown): PersistedProject | null => {
  if (!value || typeof value !== 'object') return null
  const project = value as Partial<PersistedProject>
  if (
    typeof project.id !== 'string'
    || typeof project.projectName !== 'string'
    || !Array.isArray(project.slides)
    || !Array.isArray(project.uploads)
    || typeof project.savedAt !== 'number'
  ) return null

  return {
    id: project.id,
    projectName: project.projectName,
    slides: project.slides,
    uploads: project.uploads,
    createdAt: typeof project.createdAt === 'number' ? project.createdAt : project.savedAt,
    savedAt: project.savedAt,
  }
}

const summarizeProject = (project: PersistedProject): ProjectSummary => ({
  id: project.id,
  projectName: project.projectName,
  createdAt: project.createdAt,
  savedAt: project.savedAt,
})

const sortProjects = (projects: PersistedProject[]) => [...projects].sort((a, b) => b.savedAt - a.savedAt)

export const loadProjectWorkspace = async (): Promise<{ activeProject: PersistedProject | null; projects: ProjectSummary[] }> => {
  const database = await openDatabase()

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([PROJECT_STORE, SETTINGS_STORE], 'readonly')
    const projectsRequest = transaction.objectStore(PROJECT_STORE).getAll()
    const activeRequest = transaction.objectStore(SETTINGS_STORE).get(ACTIVE_PROJECT_KEY)

    transaction.oncomplete = () => {
      const projects = sortProjects(
        (projectsRequest.result as unknown[])
          .map(normalizePersistedProject)
          .filter((project): project is PersistedProject => project !== null),
      )
      const configuredId = (activeRequest.result as SettingRecord | undefined)?.value
      const activeProject = projects.find((project) => project.id === configuredId) ?? projects[0] ?? null
      resolve({ activeProject, projects: projects.map(summarizeProject) })
    }
    transaction.onerror = () => reject(transaction.error ?? new Error('Local projects could not be loaded.'))
    transaction.onabort = () => reject(transaction.error ?? new Error('Loading local projects was cancelled.'))
  })
}

export const loadProject = async (projectId: string): Promise<PersistedProject | null> => {
  const database = await openDatabase()

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(PROJECT_STORE, 'readonly')
    const request = transaction.objectStore(PROJECT_STORE).get(projectId)
    request.onsuccess = () => resolve(normalizePersistedProject(request.result))
    request.onerror = () => reject(request.error ?? new Error('The local project could not be loaded.'))
  })
}

export const saveProject = async (project: PersistedProject): Promise<void> => {
  const database = await openDatabase()

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(PROJECT_STORE, 'readwrite')
    transaction.objectStore(PROJECT_STORE).put(project)
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error ?? new Error('The local project could not be saved.'))
    transaction.onabort = () => reject(transaction.error ?? new Error('Saving the local project was cancelled.'))
  })
}

export const setActiveProjectId = async (projectId: string): Promise<void> => {
  const database = await openDatabase()

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(SETTINGS_STORE, 'readwrite')
    transaction.objectStore(SETTINGS_STORE).put({ key: ACTIVE_PROJECT_KEY, value: projectId } satisfies SettingRecord)
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error ?? new Error('The active project could not be saved.'))
    transaction.onabort = () => reject(transaction.error ?? new Error('Switching projects was cancelled.'))
  })
}

export const deleteProject = async (projectId: string): Promise<void> => {
  const database = await openDatabase()

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(PROJECT_STORE, 'readwrite')
    transaction.objectStore(PROJECT_STORE).delete(projectId)
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error ?? new Error('The local project could not be deleted.'))
    transaction.onabort = () => reject(transaction.error ?? new Error('Deleting the project was cancelled.'))
  })
}

export const loadLegacyProject = (): { slides: Slide[]; uploads: UploadAsset[] } | null => {
  try {
    const saved = localStorage.getItem(LEGACY_STORAGE_KEY)
    if (!saved) return null
    const parsed = JSON.parse(saved) as { slides?: Slide[]; uploads?: UploadAsset[] }
    if (!Array.isArray(parsed.slides)) return null
    return { slides: parsed.slides, uploads: parsed.uploads ?? [] }
  } catch {
    return null
  }
}

export const removeLegacyProject = () => {
  try {
    localStorage.removeItem(LEGACY_STORAGE_KEY)
  } catch {
    // IndexedDB remains the source of truth if localStorage is unavailable.
  }
}
