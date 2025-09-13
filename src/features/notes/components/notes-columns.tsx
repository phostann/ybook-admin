import { DialogTitle } from '@radix-ui/react-dialog'
import type { ColumnDef } from '@tanstack/react-table'
import { Eye, Heart, MessageCircle, Pin, Star } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTrigger,
} from '@/components/ui/dialog'
import { DataTableColumnHeader } from '@/components/data-table'
import { NoteType, type NoteResponse, type ImageInfo } from '../api'
import { NotesActions } from './notes-actions'

export const notesColumns: ColumnDef<NoteResponse>[] = [
  {
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && 'indeterminate')
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label='Select all'
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label='Select row'
      />
    ),
    enableSorting: false,
    enableHiding: false,
    meta: {
      className: 'w-[40px]',
    },
  },
  {
    accessorKey: 'title',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Title' />
    ),
    cell: ({ row }) => {
      const note = row.original
      return (
        <div className='space-y-1'>
          <div className='flex items-center gap-2'>
            {note.isTop === '1' && <Pin className='h-3 w-3 text-orange-500' />}
            <span className='font-medium'>{note.title}</span>
          </div>
          <div
            className='text-muted-foreground line-clamp-2 text-xs'
            dangerouslySetInnerHTML={{ __html: note.content }}
            suppressContentEditableWarning
          ></div>
        </div>
      )
    },
    meta: {
      className: 'min-w-[200px] max-w-[300px]',
    },
  },
  {
    accessorKey: 'type',
    header: 'Type',
    cell: ({ row }) => {
      const type = row.getValue('type') as NoteType
      return (
        <Badge variant={type === NoteType.IMAGE_TEXT ? 'default' : 'secondary'}>
          {type === NoteType.IMAGE_TEXT ? 'Image & Text' : 'Video'}
        </Badge>
      )
    },
    meta: {
      className: 'w-[100px]',
    },
  },
  {
    id: 'media',
    header: 'Media',
    cell: ({ row }) => {
      const note = row.original
      const images = note.images || []

      if (note.type === NoteType.VIDEO && note.video) {
        return (
          <Dialog>
            <DialogTrigger asChild>
              <Button variant='outline' size='sm'>
                <Eye className='mr-1 h-3 w-3' />
                View Video
              </Button>
            </DialogTrigger>
            <DialogContent className='max-w-4xl'>
              <DialogHeader>
                <DialogTitle>{note.title}</DialogTitle>
              </DialogHeader>
              <div className='space-y-4'>
                <video
                  src={note.video}
                  controls
                  className='max-h-[70vh] w-full rounded border'
                  poster={images[0]?.url || undefined}
                />
              </div>
            </DialogContent>
          </Dialog>
        )
      }

      if (note.type === NoteType.IMAGE_TEXT && images.length > 0) {
        return (
          <Dialog>
            <DialogTrigger asChild>
              <Button variant='outline' size='sm'>
                <Eye className='mr-1 h-3 w-3' />
                View Images ({images.length})
              </Button>
            </DialogTrigger>
            <DialogContent className='max-w-6xl max-h-[90vh]'>
              <DialogHeader>
                <DialogTitle>{note.title}</DialogTitle>
              </DialogHeader>
              <div className='overflow-y-auto max-h-[calc(90vh-120px)]'>
                <div className='masonry-grid'>
                  {images.map((imageInfo: ImageInfo, index: number) => (
                    <div key={index} className='relative mb-3'>
                      <img
                        src={imageInfo.url}
                        alt={`Image ${index + 1}`}
                        className='w-full h-auto rounded border'
                      />
                      {imageInfo.width && imageInfo.height && (
                        <div className='absolute bottom-2 left-2 rounded bg-black/70 px-2 py-1 text-xs text-white'>
                          {imageInfo.width}×{imageInfo.height}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )
      }

      return <span className='text-muted-foreground text-sm'>No media</span>
    },
    enableSorting: false,
    meta: {
      className: 'w-[120px]',
    },
  },
  {
    accessorKey: 'labels',
    header: 'Labels',
    cell: ({ row }) => {
      const labels = row.original.labels || []
      if (labels.length === 0) {
        return <span className='text-muted-foreground'>No labels</span>
      }
      return (
        <div className='flex flex-wrap gap-1'>
          {labels.slice(0, 2).map((label) => (
            <Badge key={label.id} variant='outline' className='text-xs'>
              {label.name}
            </Badge>
          ))}
          {labels.length > 2 && (
            <Badge variant='outline' className='text-xs'>
              +{labels.length - 2}
            </Badge>
          )}
        </div>
      )
    },
    enableSorting: false,
    meta: {
      className: 'min-w-[120px] max-w-[180px]',
    },
  },
  {
    id: 'stats',
    header: 'Stats',
    cell: ({ row }) => {
      const note = row.original
      return (
        <div className='text-muted-foreground flex items-center gap-3 text-xs'>
          <span className='flex items-center gap-1'>
            <Eye className='h-3 w-3' />
            {note.viewCount}
          </span>
          <span className='flex items-center gap-1'>
            <Heart className='h-3 w-3' />
            {note.likeCount}
          </span>
          <span className='flex items-center gap-1'>
            <MessageCircle className='h-3 w-3' />
            {note.commentCount}
          </span>
          <span className='flex items-center gap-1'>
            <Star className='h-3 w-3' />
            {note.collectCount}
          </span>
        </div>
      )
    },
    enableSorting: false,
    meta: {
      className: 'w-[200px]',
    },
  },
  {
    accessorKey: 'createTime',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Created' />
    ),
    cell: ({ row }) => {
      return (
        <div className='text-muted-foreground text-sm'>
          {formatDate(row.getValue('createTime'))}
        </div>
      )
    },
    meta: {
      className: 'w-[140px]',
    },
  },
  {
    accessorKey: 'updateTime',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Updated' />
    ),
    cell: ({ row }) => {
      return (
        <div className='text-muted-foreground text-sm'>
          {formatDate(row.getValue('updateTime'))}
        </div>
      )
    },
    meta: {
      className: 'w-[140px]',
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => <NotesActions note={row.original} />,
    meta: {
      className: 'w-[60px]',
    },
  },
]