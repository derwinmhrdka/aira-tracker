export type MainPage = 'home' | 'history' | 'stats' | 'more'

export type SubPage =
  | 'notes'
  | 'immunizations'
  | 'development'
  | 'profile'
  | 'milestones'
  | 'settings'

export type AppPage = MainPage | SubPage

export const SUB_PAGES: SubPage[] = [
  'notes',
  'immunizations',
  'development',
  'profile',
  'milestones',
  'settings',
]

const ALL_PAGES: AppPage[] = ['home', 'history', 'stats', 'more', ...SUB_PAGES]

export function isValidPage(p: string | null): p is AppPage {
  return !!p && ALL_PAGES.includes(p as AppPage)
}

export function pageToPath(page: AppPage): string {
  return page === 'home' ? '/' : `/?p=${page}`
}

export function pathToPage(search: string | null): AppPage {
  if (search === 'growth') return 'stats'
  if (!search || !isValidPage(search)) return 'home'
  return search
}

export function navPageFor(page: AppPage): MainPage {
  return SUB_PAGES.includes(page as SubPage) ? 'more' : (page as MainPage)
}
