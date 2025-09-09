import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { LabelsDialogs } from './components/labels-dialogs'
import { LabelsPrimaryButtons } from './components/labels-primary-buttons'
import { LabelsProvider } from './components/labels-provider'
import { LabelsTable } from './components/labels-table'

export function Labels() {
  return (
    <LabelsProvider>
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
            <h2 className='text-2xl font-bold tracking-tight'>Labels</h2>
            <p className='text-muted-foreground'>
              Manage your content labels and tags here.
            </p>
          </div>
          <LabelsPrimaryButtons />
        </div>
        <div className='-mx-4 flex-1 overflow-auto px-4 py-1 lg:flex-row lg:space-y-0 lg:space-x-12'>
          <LabelsTable />
        </div>
      </Main>

      <LabelsDialogs />
    </LabelsProvider>
  )
}
