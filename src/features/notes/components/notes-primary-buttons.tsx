import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useNotesContext } from './notes-provider'

export function NotesPrimaryButtons() {
  const { setIsCreateDialogOpen } = useNotesContext()

  return (
    <div className='flex items-center gap-2'>
      <Button onClick={() => setIsCreateDialogOpen(true)}>
        <Plus className='mr-2 h-4 w-4' />
        Add Note
      </Button>
    </div>
  )
}