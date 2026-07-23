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
          <AlertDialogTitle>Delete project?</AlertDialogTitle>
          <AlertDialogDescription>
            “{projectName}”, including its screens and uploads, will be permanently deleted from this browser.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="project-delete-cancel" disabled={deleting}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            className="project-delete-confirm"
            variant="destructive"
            disabled={deleting}
            onClick={onConfirm}
          >
            {deleting ? 'Deleting …' : 'Delete project'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
