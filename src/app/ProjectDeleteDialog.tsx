import { Trash2 } from '../components/icons'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from '../components/ui/alert-dialog'

type ProjectDeleteDialogProps = {
  open: boolean
  deleting: boolean
  projectName: string
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}

export function ProjectDeleteDialog({
  open,
  deleting,
  projectName,
  onOpenChange,
  onConfirm,
}: ProjectDeleteDialogProps) {
  return (
    <AlertDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!deleting) onOpenChange(nextOpen)
      }}
    >
      <AlertDialogContent className="project-delete-dialog">
        <AlertDialogHeader>
          <AlertDialogMedia><Trash2 size={17} /></AlertDialogMedia>
          <AlertDialogTitle>Projekt löschen?</AlertDialogTitle>
          <AlertDialogDescription>
            „{projectName}“ samt Screens und Uploads wird dauerhaft aus diesem Browser gelöscht.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="project-delete-cancel" disabled={deleting}>
            Abbrechen
          </AlertDialogCancel>
          <AlertDialogAction
            className="project-delete-confirm"
            variant="destructive"
            disabled={deleting}
            onClick={onConfirm}
          >
            {deleting ? 'Wird gelöscht …' : 'Projekt löschen'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
