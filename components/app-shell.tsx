'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  type AppPage,
  type SubPage,
  pathToPage,
  pageToPath,
  navPageFor,
} from '@/lib/navigation'
import { Dashboard } from '@/components/dashboard'
import { HistoryPage } from '@/components/history-page'
import { StatsPage } from '@/components/stats-page'
import { MorePage } from '@/components/more-page'
import { NotesPage } from '@/components/notes-page'
import { ImmunizationsPage } from '@/components/immunizations-page'
import { DevelopmentPage } from '@/components/development-page'
import { ProfilePage } from '@/components/profile-page'
import { MilestonesPage } from '@/components/milestones-page'
import { EventsPage } from '@/components/events-page'
import { GalleryPage } from '@/components/gallery-page'
import { SettingsPage } from '@/components/settings-page'
import { BottomNav } from '@/components/bottom-nav'
import { PwaInstallPrompt } from '@/components/pwa-install-prompt'
import { notifyDataSynced } from '@/lib/use-live-sync'

export function AppShell() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [currentPage, setCurrentPage] = useState<AppPage>(() =>
    pathToPage(searchParams.get('p'))
  )

  useEffect(() => {
    const page = pathToPage(searchParams.get('p'))
    setCurrentPage(page)
  }, [searchParams])

  const navigate = useCallback(
    (page: AppPage) => {
      setCurrentPage(page)
      router.push(pageToPath(page), { scroll: false })
      if (page === 'home') {
        notifyDataSynced()
      }
    },
    [router]
  )

  useEffect(() => {
    const handler = (event: Event) => {
      const url = (event as CustomEvent<{ url: string }>).detail?.url || '/'
      try {
        const parsed = new URL(url, window.location.origin)
        const page = pathToPage(parsed.searchParams.get('p'))
        navigate(page)
      } catch {
        navigate('home')
      }
    }
    window.addEventListener('pwa-navigate', handler)
    return () => window.removeEventListener('pwa-navigate', handler)
  }, [navigate])

  const goBack = () => navigate('more')

  return (
    <div className="min-h-screen">
      <div className="pb-24">
        {currentPage === 'home' && <Dashboard />}
        {currentPage === 'history' && <HistoryPage />}
        {currentPage === 'stats' && <StatsPage />}
        {currentPage === 'more' && (
          <MorePage onNavigate={(p: SubPage) => navigate(p)} />
        )}
        {currentPage === 'notes' && <NotesPage onBack={goBack} />}
        {currentPage === 'gallery' && <GalleryPage onBack={goBack} />}
        {currentPage === 'immunizations' && (
          <ImmunizationsPage onBack={goBack} />
        )}
        {currentPage === 'development' && (
          <DevelopmentPage onBack={goBack} />
        )}
        {currentPage === 'profile' && <ProfilePage onBack={goBack} />}
        {currentPage === 'milestones' && <MilestonesPage onBack={goBack} />}
        {currentPage === 'events' && <EventsPage onBack={goBack} />}
        {currentPage === 'settings' && <SettingsPage onBack={goBack} />}
      </div>

      <BottomNav
        currentPage={navPageFor(currentPage)}
        onPageChange={navigate}
      />
      <PwaInstallPrompt />
    </div>
  )
}
