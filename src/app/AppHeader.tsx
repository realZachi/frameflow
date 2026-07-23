import {
  AlertCircle,
  Check,
  ChevronDown,
  Cloud,
  Copy,
  Download,
  Plus,
  Redo2,
  Save,
  Sparkles,
  Trash2,
  Undo2,
} from '../components/icons'
import { Button } from '../components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu'
import type { ProjectSummary } from '../persistence'
import { EXPORT_FORMATS, type ExportFormat } from './export-formats'
import { formatProjectTime } from './project-utils'
import { saveStatusLabels, type SaveStatus } from './project-types'

type AppHeaderProps = {
  projectName: string
  saveStatus: SaveStatus
  lastSavedAt: number | null
  projects: ProjectSummary[]
  currentProjectId: string
  persistenceReady: boolean
  exporting: boolean
  exportProgress: number
  canUndo: boolean
  canRedo: boolean
  aiDisabled: boolean
  onProjectNameChange: (name: string) => void
  onOpenProject: (projectId: string) => void
  onCreateProject: () => void
  onDuplicateProject: () => void
  onSaveProject: () => void
  onRequestProjectDeletion: () => void
  onUndo: () => void
  onRedo: () => void
  onOpenAi: () => void
  onExport: (format: ExportFormat) => void
  children?: React.ReactNode
}

function ProjectMenu({
  projects,
  currentProjectId,
  disabled,
  onOpenProject,
  onCreateProject,
  onDuplicateProject,
  onSaveProject,
  onRequestProjectDeletion,
}: Pick<
  AppHeaderProps,
  | 'projects'
  | 'currentProjectId'
  | 'onOpenProject'
  | 'onCreateProject'
  | 'onDuplicateProject'
  | 'onSaveProject'
  | 'onRequestProjectDeletion'
> & { disabled: boolean }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="project-menu-trigger" aria-label="Projektmenü öffnen">
        <ChevronDown size={13} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={18} className="project-menu-content w-80">
        <DropdownMenuGroup className="project-menu-projects">
          <DropdownMenuLabel className="project-menu-label">
            <strong>Lokale Projekte</strong>
            <span>{projects.length} {projects.length === 1 ? 'Projekt' : 'Projekte'} in diesem Browser</span>
          </DropdownMenuLabel>
          <div className="project-menu-list">
            {projects.map((project) => (
              <DropdownMenuItem
                key={project.id}
                className="project-menu-project"
                data-active={project.id === currentProjectId}
                disabled={disabled}
                onClick={() => onOpenProject(project.id)}
              >
                <span className="project-menu-check">
                  {project.id === currentProjectId && <Check size={14} />}
                </span>
                <span className="project-menu-project-copy">
                  <strong>{project.projectName}</strong>
                  <small>Gespeichert {formatProjectTime(project.savedAt)}</small>
                </span>
              </DropdownMenuItem>
            ))}
          </div>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem className="project-menu-action" disabled={disabled} onClick={onCreateProject}>
            <Plus size={15} />
            <span>Neues Projekt</span>
          </DropdownMenuItem>
          <DropdownMenuItem className="project-menu-action" disabled={disabled} onClick={onDuplicateProject}>
            <Copy size={15} />
            <span>Projekt duplizieren</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="project-menu-action" disabled={disabled} onClick={onSaveProject}>
          <Save size={15} />
          <span>Jetzt speichern</span>
          <DropdownMenuShortcut>⌘S</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem
          className="project-menu-action"
          variant="destructive"
          disabled={disabled || projects.length <= 1}
          onClick={onRequestProjectDeletion}
        >
          <Trash2 size={15} />
          <span>Aktuelles Projekt löschen</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function ExportMenu({
  exporting,
  exportProgress,
  onExport,
}: Pick<AppHeaderProps, 'exporting' | 'exportProgress' | 'onExport'>) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="export-button" disabled={exporting} aria-label="Exportformat wählen">
        {exporting
          ? <><span className="export-spinner" /><b>{exportProgress}%</b></>
          : <><Download size={17} /><b>Alle als ZIP</b><ChevronDown className="export-button-chevron" size={13} /></>}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={6} className="export-menu-content w-64">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="export-menu-label">
            <strong>Alle Screens exportieren</strong>
            <span>App-Store-Format wählen</span>
          </DropdownMenuLabel>
          {EXPORT_FORMATS.map((format) => (
            <DropdownMenuItem
              key={format.id}
              className="export-menu-item"
              onClick={() => onExport(format)}
            >
              <span className="export-menu-size">{format.shortLabel}</span>
              <span className="export-menu-copy">
                <strong>{format.label}</strong>
                <small>{format.width} × {format.height} px</small>
              </span>
              <Download size={15} />
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function AppHeader({
  projectName,
  saveStatus,
  lastSavedAt,
  projects,
  currentProjectId,
  persistenceReady,
  exporting,
  exportProgress,
  canUndo,
  canRedo,
  aiDisabled,
  onProjectNameChange,
  onOpenProject,
  onCreateProject,
  onDuplicateProject,
  onSaveProject,
  onRequestProjectDeletion,
  onUndo,
  onRedo,
  onOpenAi,
  onExport,
  children,
}: AppHeaderProps) {
  const projectMenuDisabled = !persistenceReady || saveStatus === 'saving'

  return (
    <header className="app-header">
      <div className="topbar">
        <div className="brand-lockup">
          <div className="brand-symbol"><span>F</span><i /></div>
          <strong>Frameflow</strong>
          <em>STUDIO</em>
        </div>
        <div className="project-meta">
          <span
            className={`save-state save-state--${saveStatus}`}
            title={lastSavedAt
              ? `Zuletzt gespeichert um ${new Date(lastSavedAt).toLocaleTimeString('de-DE', {
                hour: '2-digit',
                minute: '2-digit',
              })}`
              : undefined}
            aria-live="polite"
          >
            {saveStatus === 'error' ? <AlertCircle size={13} /> : <Cloud size={13} />}
            {saveStatusLabels[saveStatus]}
          </span>
          <div className="project-name-control">
            <input
              value={projectName}
              onChange={(event) => onProjectNameChange(event.target.value)}
              aria-label="Projektname"
            />
            <ProjectMenu
              projects={projects}
              currentProjectId={currentProjectId}
              disabled={projectMenuDisabled}
              onOpenProject={onOpenProject}
              onCreateProject={onCreateProject}
              onDuplicateProject={onDuplicateProject}
              onSaveProject={onSaveProject}
              onRequestProjectDeletion={onRequestProjectDeletion}
            />
          </div>
        </div>
        <div className="topbar-actions">
          <div className="history-actions">
            <button onClick={onUndo} disabled={!canUndo} title="Rückgängig (⌘Z)">
              <Undo2 size={17} />
            </button>
            <button onClick={onRedo} disabled={!canRedo} title="Wiederholen (⇧⌘Z)">
              <Redo2 size={17} />
            </button>
          </div>
          <Button
            className="ai-generate-button"
            variant="secondary"
            size="default"
            onClick={onOpenAi}
            disabled={aiDisabled}
          >
            <span className="ai-generate-button-mark" aria-hidden="true"><Sparkles size={14} /></span>
            <span>AI erstellen</span>
          </Button>
          <ExportMenu exporting={exporting} exportProgress={exportProgress} onExport={onExport} />
        </div>
      </div>
      {children}
    </header>
  )
}
