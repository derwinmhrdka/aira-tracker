'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Toast } from './toast'
import { ThemeToggle } from './theme-toggle'
import { LoggedBySelector } from './logged-by-selector'
import { SessionEndSheet, type SessionEndData } from './session-end-sheet'
import { ActiveTimer } from './active-timer'
import { InsightsCard } from './insights-card'
import { MilkStorageCard } from './milk-storage-card'
import { HomeGrowthPanel } from './home-growth-panel'
import { AppointmentSummary } from './appointment-summary'
import { OnboardingSheet } from './onboarding-sheet'
import { playSoundEffect } from '@/lib/sounds'
import { api, isQueuedResponse, type TodaySummary } from '@/lib/api-client'
import { useAppDataSync } from '@/lib/use-app-data-sync'
import {
  LIVE_SYNC_ACTIVE_MS,
  LIVE_SYNC_MS,
  notifyDataSynced,
} from '@/lib/use-live-sync'
import {
  HOME_VISIBILITY_DEFAULTS,
  type HomeVisibility,
} from '@/lib/home-visibility'

export function Dashboard() {
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [summary, setSummary] = useState<TodaySummary | null>(null)
  const [feedEndOpen, setFeedEndOpen] = useState(false)
  const [sleepEndOpen, setSleepEndOpen] = useState(false)
  const [onboardingOpen, setOnboardingOpen] = useState(false)
  const [homeVis, setHomeVis] = useState<HomeVisibility>(HOME_VISIBILITY_DEFAULTS)

  const fetchSummary = useCallback(async (_opts?: { silent?: boolean }) => {
    try {
      const data = await api.getTodaySummary()
      setSummary(data)
    } catch {
      // Keep the last summary so a refresh blip does not clear home.
    }
  }, [])

  useEffect(() => {
    fetchSummary()
  }, [fetchSummary])

  useEffect(() => {
    let cancelled = false
    api
      .getHomeVisibilityGlobal()
      .then((vis) => {
        if (!cancelled) setHomeVis(vis)
      })
      .catch(() => {})

    return () => {
      cancelled = true
    }
  }, [])

  const hasActiveSession = !!(summary?.activeFeeding || summary?.activeSleep)
  useAppDataSync(() => fetchSummary({ silent: true }), {
    intervalMs: hasActiveSession ? LIVE_SYNC_ACTIVE_MS : LIVE_SYNC_MS,
  })

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (localStorage.getItem('onboarding_done')) return
    api
      .getBabyProfile()
      .then((p) => {
        if (p.name === 'Baby') setOnboardingOpen(true)
      })
      .catch(() => {})
  }, [])

  const showLogError = (err: unknown) => {
    fetchSummary({ silent: true })
    const msg = err instanceof Error ? err.message : 'Gagal mencatat'
    if (msg.includes('aktif') || msg.includes('Tidak ada sesi')) {
      setToastMessage('ℹ️ Status sudah berubah (cek HP lain)')
    } else {
      setToastMessage(`❌ ${msg}`)
    }
    setTimeout(() => setToastMessage(null), 3000)
  }

  const showToast = (message: string) => {
    setToastMessage(message)
    playSoundEffect('success')
    setTimeout(() => setToastMessage(null), 2000)
  }

  const optimisticUpdate = (action: string, durationMinutes?: number) => {
    if (!summary) return
    const now = new Date().toISOString()
    const nowMs = Date.now()
    const next = {
      ...summary,
      lastTimes: { ...summary.lastTimes },
      lastDurations: {
        feed: summary.lastDurations?.feed ?? null,
        sleep: summary.lastDurations?.sleep ?? null,
      },
      activeFeedingStart: summary.activeFeedingStart,
      activeSleepStart: summary.activeSleepStart,
    }
    switch (action) {
      case 'pup':
        next.counts = { ...next.counts, pup: next.counts.pup + 1 }
        next.lastTimes.pup = now
        break
      case 'pee':
        next.counts = { ...next.counts, pee: next.counts.pee + 1 }
        next.lastTimes.pee = now
        break
      case 'both':
        next.counts = { ...next.counts, pup: next.counts.pup + 1, pee: next.counts.pee + 1 }
        next.lastTimes.pup = now
        next.lastTimes.pee = now
        break
      case 'change':
        next.counts = { ...next.counts, change: (next.counts.change ?? 0) + 1 }
        next.lastTimes.change = now
        break
      case 'feed-start':
        next.activeFeeding = true
        next.activeFeedingStart = now
        next.counts = { ...next.counts, feed: next.counts.feed + 1 }
        next.lastTimes.feed = now
        break
      case 'feed-end': {
        next.activeFeeding = false
        if (durationMinutes != null) {
          next.lastDurations.feed = Math.max(0, durationMinutes)
        } else if (summary.activeFeedingStart) {
          next.lastDurations.feed = Math.max(
            0,
            Math.round((nowMs - new Date(summary.activeFeedingStart).getTime()) / 60000)
          )
        }
        next.activeFeedingStart = null
        break
      }
      case 'sleep-start':
        next.activeSleep = true
        next.activeSleepStart = now
        next.counts = { ...next.counts, sleep: next.counts.sleep + 1 }
        next.lastTimes.sleep = now
        break
      case 'sleep-end': {
        next.activeSleep = false
        if (durationMinutes != null) {
          next.lastDurations.sleep = Math.max(0, durationMinutes)
        } else if (summary.activeSleepStart) {
          next.lastDurations.sleep = Math.max(
            0,
            Math.round((nowMs - new Date(summary.activeSleepStart).getTime()) / 60000)
          )
        }
        next.activeSleepStart = null
        break
      }
    }
    setSummary(next)
  }

  const handleLog = async (action: string) => {
    // Always use latest server state before toggling susu/tidur
    let current = summary
    if (action === 'feed' || action === 'sleep' || action === 'wake') {
      try {
        current = await api.getTodaySummary()
        setSummary(current)
      } catch {
        // fall back to cached summary
      }
    }

    const wasFeeding = current?.activeFeeding
    const wasSleeping = current?.activeSleep

    if (action === 'feed' && wasFeeding) {
      setFeedEndOpen(true)
      return
    }

    if ((action === 'sleep' && wasSleeping) || action === 'wake') {
      setSleepEndOpen(true)
      return
    }

    const messages: Record<string, string> = {
      pup: '💩 Tercatat!',
      pee: '💧 Tercatat!',
      both: '💩💧 Tercatat!',
      change: 'Popok tercatat!',
      feed: '🍼 Mulai menyusui!',
      sleep: '😴 Mulai tidur!',
    }

    if (action === 'feed') optimisticUpdate('feed-start')
    else if (action === 'sleep') optimisticUpdate('sleep-start')
    else optimisticUpdate(action)

    try {
      let result: unknown
      switch (action) {
        case 'pup':
          result = await api.logDiaper('pup')
          break
        case 'pee':
          result = await api.logDiaper('pee')
          break
        case 'both':
          result = await api.logDiaper('both')
          break
        case 'change':
          result = await api.logDiaper('change')
          break
        case 'feed':
          result = await api.logFeeding('start')
          break
        case 'sleep':
          result = await api.logSleep('start')
          break
        default:
          result = null
      }
      if (isQueuedResponse(result)) {
        setToastMessage('📡 Menunggu sync...')
        setTimeout(() => setToastMessage(null), 3000)
      } else {
        showToast(messages[action] || 'Tercatat!')
        fetchSummary()
        notifyDataSynced()
      }
    } catch (err) {
      showLogError(err)
    }
  }

  const handleFeedEnd = async (data: SessionEndData) => {
    showToast('🍼 Selesai menyusui!')
    optimisticUpdate('feed-end', data.duration_minutes)
    setFeedEndOpen(false)
    try {
      const current = await api.getTodaySummary()
      if (!current.activeFeeding) {
        setSummary(current)
        setToastMessage('ℹ️ Menyusui sudah dihentikan di perangkat lain')
        setTimeout(() => setToastMessage(null), 3000)
        return
      }
      await api.logFeeding('end', {
        side: data.side,
        amount_ml: data.amount_ml,
        feed_type: data.feed_type,
        duration_minutes: data.duration_minutes,
      })
      fetchSummary()
      notifyDataSynced()
    } catch (err) {
      showLogError(err)
    }
  }

  const handleSleepEnd = async (data: SessionEndData) => {
    showToast('☀️ Bangun!')
    optimisticUpdate('sleep-end', data.duration_minutes)
    setSleepEndOpen(false)
    try {
      const current = await api.getTodaySummary()
      if (!current.activeSleep) {
        setSummary(current)
        setToastMessage('ℹ️ Tidur sudah dihentikan di perangkat lain')
        setTimeout(() => setToastMessage(null), 3000)
        return
      }
      await api.logSleep('end', { duration_minutes: data.duration_minutes })
      fetchSummary()
      notifyDataSynced()
    } catch (err) {
      showLogError(err)
    }
  }

  return (
    <div className="pt-6">
      <div className="px-4 pb-4 pt-6">
        <div className="flex items-start justify-between">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex-1"
          >
            <h1 className="font-heading text-2xl font-bold text-foreground">
              Hari ini
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {new Date().toLocaleDateString('id-ID', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
            </p>
          </motion.div>
          <div className="flex items-center gap-2">
            <LoggedBySelector />
            <ThemeToggle />
          </div>
        </div>
      </div>

      <div className="px-4">
        <AppointmentSummary />
        <HomeGrowthPanel
          birthDate={summary?.baby?.birth_date}
          dueDate={summary?.baby?.due_date}
          showLeap={homeVis.leap}
          showEvent={homeVis.nextEvent}
          showIdentity={homeVis.babyInfo}
          baby={summary?.baby ?? null}
          nextVaccine={summary?.nextVaccine ?? null}
        />

        {homeVis.insights && <InsightsCard summary={summary} />}

        {homeVis.milkStorage && <MilkStorageCard />}

        {homeVis.monitoring && (
          <>
            <ActiveTimer
              type="feeding"
              startTime={summary?.activeFeedingStart ?? null}
              active={!!summary?.activeFeeding}
              onClick={() => handleLog('feed')}
            />
            <ActiveTimer
              type="sleep"
              startTime={summary?.activeSleepStart ?? null}
              active={!!summary?.activeSleep}
              onClick={() => handleLog('sleep')}
            />
          </>
        )}

      </div>

      <SessionEndSheet
        open={feedEndOpen}
        type="feeding"
        startTime={summary?.activeFeedingStart ?? null}
        onClose={() => setFeedEndOpen(false)}
        onConfirm={handleFeedEnd}
      />
      <SessionEndSheet
        open={sleepEndOpen}
        type="sleep"
        startTime={summary?.activeSleepStart ?? null}
        onClose={() => setSleepEndOpen(false)}
        onConfirm={handleSleepEnd}
      />
      <OnboardingSheet
        open={onboardingOpen}
        onComplete={() => {
          setOnboardingOpen(false)
          fetchSummary()
        }}
      />
      {toastMessage && <Toast message={toastMessage} />}
    </div>
  )
}
