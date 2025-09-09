import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { NotesDialogs } from './components/notes-dialogs'
import { NotesPrimaryButtons } from './components/notes-primary-buttons'
import { NotesProvider } from './components/notes-provider'
import { NotesTable } from './components/notes-table'

export function Notes() {
  return (
    <NotesProvider>
      <Header fixed>
        <Search />
        <div className='ms-auto flex items-center space-x-4'>
          <ThemeSwitch />
          <ConfigDrawer />
          <ProfileDropdown />
        </div>
      </Header>

      <Main>
        <div className='mb-2 flex flex-wrap items-center justify-between space-y-2'>
          <div>
            <h2 className='text-2xl font-bold tracking-tight'>Notes</h2>
            <p className='text-muted-foreground'>
              Manage your notes and media content here.
            </p>
          </div>
          <NotesPrimaryButtons />
        </div>
        <div className='-mx-4 flex-1 overflow-auto px-4 py-1 lg:flex-row lg:space-y-0 lg:space-x-12'>
          <NotesTable />
        </div>
      </Main>

      <NotesDialogs />
    </NotesProvider>
  )
}