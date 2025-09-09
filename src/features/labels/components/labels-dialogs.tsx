import { LabelsActionDialog } from './labels-action-dialog'
import { LabelsDeleteDialog } from './labels-delete-dialog'
import { useLabels } from './labels-provider'

export function LabelsDialogs() {
  const { open, setOpen, currentRow, setCurrentRow } = useLabels()

  return (
    <>
      <LabelsActionDialog
        key='labels-create'
        open={open === 'create'}
        onOpenChange={() => setOpen('create')}
      />

      {currentRow && (
        <>
          <LabelsActionDialog
            key={`labels-edit-${currentRow.id}`}
            open={open === 'edit'}
            onOpenChange={() => {
              setOpen('edit')
              setTimeout(() => {
                setCurrentRow(null)
              }, 500)
            }}
            currentRow={currentRow}
          />

          <LabelsDeleteDialog
            key={`labels-delete-${currentRow.id}`}
            open={open === 'delete'}
            onOpenChange={() => {
              setOpen('delete')
              setTimeout(() => {
                setCurrentRow(null)
              }, 500)
            }}
            currentRow={currentRow}
          />
        </>
      )}
    </>
  )
}