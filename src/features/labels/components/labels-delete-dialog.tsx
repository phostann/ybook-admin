import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { labelsApi } from '../api'
import type { LabelResponse } from '../types'

type LabelsDeleteDialogProps = {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  currentRow?: LabelResponse | null
}

export function LabelsDeleteDialog({
  open = false,
  onOpenChange,
  currentRow = null,
}: LabelsDeleteDialogProps) {
  const queryClient = useQueryClient()

  const deleteMutation = useMutation({
    mutationFn: (id: number) => labelsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['labels'] })
      toast.success('Label deleted successfully')
      onOpenChange?.(false)
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      toast.error(error.response?.data?.message || 'Failed to delete label')
    },
  })

  const handleDelete = () => {
    if (currentRow) {
      deleteMutation.mutate(currentRow.id)
    }
  }

  if (!currentRow) return null

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Label</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete the label "{currentRow.name}"? 
            {currentRow.useCount > 0 && (
              <span className='text-amber-600 dark:text-amber-400 font-medium'>
                {' '}This label is currently used in {currentRow.useCount} items.
              </span>
            )}
            {' '}This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteMutation.isPending}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            className='bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800 focus:ring-red-600'
          >
            {deleteMutation.isPending ? 'Deleting...' : 'Delete Label'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}