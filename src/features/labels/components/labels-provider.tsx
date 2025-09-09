import React, { useState } from 'react'
import useDialogState from '@/hooks/use-dialog-state'
import type { LabelResponse } from '../api'

type LabelsDialogType = 'create' | 'edit' | 'delete'

type LabelsContextType = {
  open: LabelsDialogType | null
  setOpen: (str: LabelsDialogType | null) => void
  currentRow: LabelResponse | null
  setCurrentRow: React.Dispatch<React.SetStateAction<LabelResponse | null>>
}

const LabelsContext = React.createContext<LabelsContextType | null>(null)

export function LabelsProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useDialogState<LabelsDialogType>(null)
  const [currentRow, setCurrentRow] = useState<LabelResponse | null>(null)

  return (
    <LabelsContext.Provider value={{ open, setOpen, currentRow, setCurrentRow }}>
      {children}
    </LabelsContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useLabels = () => {
  const labelsContext = React.useContext(LabelsContext)

  if (!labelsContext) {
    throw new Error('useLabels has to be used within <LabelsProvider>')
  }

  return labelsContext
}