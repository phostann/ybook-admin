import { type ColumnDef } from '@tanstack/react-table'
import { cn } from '@/lib/utils'
import { Checkbox } from '@/components/ui/checkbox'
import { DataTableColumnHeader } from '@/components/data-table'
import { LongText } from '@/components/long-text'
import type { LabelResponse } from '../types'
import { DataTableRowActions } from './data-table-row-actions'

export const labelsColumns: ColumnDef<LabelResponse>[] = [
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
        className='translate-y-[2px]'
      />
    ),
    meta: {
      className: cn('sticky md:table-cell start-0 z-10 rounded-tl-[inherit]'),
    },
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label='Select row'
        className='translate-y-[2px]'
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'name',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Label Name' />
    ),
    cell: ({ row }) => (
      <LongText className='max-w-48 ps-3 font-medium'>{row.getValue('name')}</LongText>
    ),
    meta: {
      className: cn(
        'drop-shadow-[0_1px_2px_rgb(0_0_0_/_0.1)] dark:drop-shadow-[0_1px_2px_rgb(255_255_255_/_0.1)]',
        'sticky start-6 @4xl/content:table-cell @4xl/content:drop-shadow-none'
      ),
    },
    enableHiding: false,
  },
  {
    accessorKey: 'useCount',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Usage Count' />
    ),
    cell: ({ row }) => (
      <div className='text-center'>{row.getValue('useCount')}</div>
    ),
    meta: { className: 'w-32 text-center' },
  },
  {
    accessorKey: 'createTime',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Created' />
    ),
    cell: ({ row }) => {
      const date = new Date(row.getValue('createTime'))
      return (
        <div className='text-sm text-muted-foreground'>
          {date.toLocaleDateString()}
        </div>
      )
    },
    meta: { className: 'w-32' },
  },
  {
    accessorKey: 'updateTime',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Updated' />
    ),
    cell: ({ row }) => {
      const date = new Date(row.getValue('updateTime'))
      return (
        <div className='text-sm text-muted-foreground'>
          {date.toLocaleDateString()}
        </div>
      )
    },
    meta: { className: 'w-32' },
  },
  {
    id: 'actions',
    cell: DataTableRowActions,
  },
]