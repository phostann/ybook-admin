import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useLabels } from './labels-provider'

export function LabelsPrimaryButtons() {
  const { setOpen } = useLabels()
  
  return (
    <div className='flex gap-2'>
      <Button className='space-x-1' onClick={() => setOpen('create')}>
        <span>Add Label</span> <Plus size={18} />
      </Button>
    </div>
  )
}