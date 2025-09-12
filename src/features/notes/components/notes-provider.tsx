/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, type ReactNode } from 'react'
import type { NoteResponse } from '../api'

interface NotesContextValue {
  // Dialog states
  isCreateDialogOpen: boolean
  setIsCreateDialogOpen: (open: boolean) => void
  isEditDialogOpen: boolean
  setIsEditDialogOpen: (open: boolean) => void
  
  // Current note being edited
  currentNote: NoteResponse | null
  setCurrentNote: (note: NoteResponse | null) => void
  
  // Table refresh trigger
  refreshKey: number
  refreshTable: () => void
}

const NotesContext = createContext<NotesContextValue | undefined>(undefined)

interface NotesProviderProps {
  children: ReactNode
}

export function NotesProvider({ children }: NotesProviderProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [currentNote, setCurrentNote] = useState<NoteResponse | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const refreshTable = () => {
    setRefreshKey(prev => prev + 1)
  }

  const value: NotesContextValue = {
    isCreateDialogOpen,
    setIsCreateDialogOpen,
    isEditDialogOpen,
    setIsEditDialogOpen,
    currentNote,
    setCurrentNote,
    refreshKey,
    refreshTable,
  }

  return (
    <NotesContext.Provider value={value}>
      {children}
    </NotesContext.Provider>
  )
}

export function useNotesContext() {
  const context = useContext(NotesContext)
  if (context === undefined) {
    throw new Error('useNotesContext must be used within a NotesProvider')
  }
  return context
}