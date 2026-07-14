'use client'

import { useCallback, useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  type AppPage,
  type SubPage,
  pathToPage,
  pageToPath,
  navPageFor,
} from '@/lib/navigation'
import { Dashboard } from '@/components/dashboard'
import { BottomNav } from '@/components/bottom-nav'
import { PwaInstallPrompt } from '@/components/pwa-install-prompt'
import { notifyDataSynced } from '@/lib/use-live-sync'

function PageFallback() {
  return (
    <div className="space-y-3 px-4 pt-8">
      <div className="h-7 w-40 animate-pulse rounded-lg bg-secondary" />
      <div className="h-4 w-56 animate-pulse rounded bg-secondary" />
      <div className="mt-4 h-24 animate-pulse rounded-xl bg-secondary" />
      <div className="h-24 animate-pulse rounded-xl bg-secondary" />
    </div>
  )
}

const pageLoading = { loading: () => <PageFallback /> }

const HistoryPage = dynamic(
  () =>
    import('@/components/history-page').then((m) => ({ default: m.HistoryPage })),
  pageLoading
)
const StatsPage = dynamic(
  () =>
    import('@/components/stats-page').then((m) => ({ default: m.StatsPage })),
  pageLoading
)
const MorePage = dynamic(
  () =>
    import('@/components/more-page').then((m) => ({ default: m.MorePage })),
  pageLoading
)
const NotesPage = dynamic(
  () =>
    import('@/components/notes-page').then((m) => ({ default: m.NotesPage })),
  pageLoading
)
const ImmunizationsPage = dynamic(
  () =>
    import('@/components/immunizations-page').then((m) => ({
      default: m.ImmunizationsPage,
    })),
  pageLoading
)
const DevelopmentPage = dynamic(
  () =>
    import('@/components/development-page').then((m) => ({
      default: m.DevelopmentPage,
    })),
  pageLoading
)
const ProfilePage = dynamic(
  () =>
    import('@/components/profile-page').then((m) => ({
      default: m.ProfilePage,
    })),
  pageLoading
)
const MilestonesPage = dynamic(
  () =>
    import('@/components/milestones-page').then((m) => ({
      default: m.MilestonesPage,
    })),
  pageLoading
)
const AchievementsPage = dynamic(
  () =>
    import('@/components/achievements-page').then((m) => ({
      default: m.AchievementsPage,
    })),
  pageLoading
)
const EventsPage = dynamic(
  () =>
    import('@/components/events-page').then((m) => ({ default: m.EventsPage })),
  pageLoading
)
const GalleryPage = dynamic(
  () =>
    import('@/components/gallery-page').then((m) => ({
      default: m.GalleryPage,
    })),
  pageLoading
)
const SettingsPage = dynamic(
  () =>
    import('@/components/settings-page').then((m) => ({
      default: m.SettingsPage,
    })),
  pageLoading
)

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
        {currentPage === 'achievements' && (
          <AchievementsPage onBack={goBack} />
        )}
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
