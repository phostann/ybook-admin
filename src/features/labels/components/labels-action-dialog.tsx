import { useEffect } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { labelsApi } from '../api'
import type { LabelResponse } from '../types'

// Form validation schema
const labelFormSchema = z.object({
  name: z.string().min(1, 'Label name is required').max(50, 'Label name is too long'),
})

type LabelFormValues = z.infer<typeof labelFormSchema>

type LabelsActionDialogProps = {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  currentRow?: LabelResponse | null
}

export function LabelsActionDialog({
  open = false,
  onOpenChange,
  currentRow = null,
}: LabelsActionDialogProps) {
  const queryClient = useQueryClient()
  const isEditing = Boolean(currentRow)

  const form = useForm<LabelFormValues>({
    resolver: zodResolver(labelFormSchema),
    defaultValues: {
      name: '',
    },
  })

  // Reset form when dialog opens/closes or currentRow changes
  useEffect(() => {
    if (open && currentRow) {
      form.reset({
        name: currentRow.name || '',
      })
    } else if (open && !currentRow) {
      form.reset({
        name: '',
      })
    }
  }, [open, currentRow, form])

  const createMutation = useMutation({
    mutationFn: labelsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['labels'] })
      toast.success('Label created successfully')
      onOpenChange?.(false)
      form.reset()
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      toast.error(error.response?.data?.message || 'Failed to create label')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: LabelFormValues }) =>
      labelsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['labels'] })
      toast.success('Label updated successfully')
      onOpenChange?.(false)
      form.reset()
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      toast.error(error.response?.data?.message || 'Failed to update label')
    },
  })

  const onSubmit = (data: LabelFormValues) => {
    if (isEditing && currentRow) {
      updateMutation.mutate({ id: currentRow.id, data })
    } else {
      createMutation.mutate(data)
    }
  }

  const isLoading = createMutation.isPending || updateMutation.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[425px]'>
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Label' : 'Create New Label'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the label information below.'
              : 'Add a new label to organize your content.'}
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
            <FormField
              control={form.control}
              name='name'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Label Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder='Enter label name'
                      {...field}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter>
              <Button
                type='button'
                variant='outline'
                onClick={() => onOpenChange?.(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type='submit' disabled={isLoading}>
                {isLoading
                  ? isEditing
                    ? 'Updating...'
                    : 'Creating...'
                  : isEditing
                  ? 'Update Label'
                  : 'Create Label'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}