import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { MoreHorizontal, Pencil, Pin, PinOff, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import { notesApi, type NoteResponse } from '../api'
import { useNotesContext } from './notes-provider'

interface NotesActionsProps {
  note: NoteResponse
}

export function NotesActions({ note }: NotesActionsProps) {
  const [isLoading, setIsLoading] = useState(false)
  const queryClient = useQueryClient()
  const { setCurrentNote, setIsEditDialogOpen, refreshTable } = useNotesContext()

  const handleEdit = () => {
    setCurrentNote(note)
    setIsEditDialogOpen(true)
  }

  const togglePinMutation = useMutation({
    mutationFn: () => notesApi.togglePin(note.id),
    onSuccess: () => {
      toast.success(`Note ${note.isTop === '1' ? 'unpinned' : 'pinned'} successfully`)
      queryClient.invalidateQueries({ queryKey: ['notes'] })
      refreshTable()
    },
    onError: (error) => {
      console.error('Toggle pin error:', error)
      toast.error('Failed to toggle pin status')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => notesApi.delete(note.id),
    onSuccess: () => {
      toast.success('Note deleted successfully')
      queryClient.invalidateQueries({ queryKey: ['notes'] })
      refreshTable()
    },
    onError: (error) => {
      console.error('Delete error:', error)
      toast.error('Failed to delete note')
    },
  })

  const handleTogglePin = async () => {
    setIsLoading(true)
    try {
      await togglePinMutation.mutateAsync()
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this note? This action cannot be undone.')) {
      return
    }

    setIsLoading(true)
    try {
      await deleteMutation.mutateAsync()
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant='ghost'
          className='h-8 w-8 p-0'
          disabled={isLoading}
        >
          <span className='sr-only'>Open menu</span>
          <MoreHorizontal className='h-4 w-4' />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end'>
        <DropdownMenuItem onClick={handleEdit}>
          <Pencil className='mr-2 h-4 w-4' />
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleTogglePin}>
          {note.isTop === '1' ? (
            <>
              <PinOff className='mr-2 h-4 w-4' />
              Unpin
            </>
          ) : (
            <>
              <Pin className='mr-2 h-4 w-4' />
              Pin
            </>
          )}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          onClick={handleDelete}
          className='text-red-600 focus:text-red-600'
        >
          <Trash2 className='mr-2 h-4 w-4' />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}