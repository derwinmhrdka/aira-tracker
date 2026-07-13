'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { QuickLogButton } from './quick-log-button'
import { DailySummary } from './daily-summary'
import { Toast } from './toast'
import { ThemeToggle } from './theme-toggle'
import { LoggedBySelector } from './logged-by-selector'
import { NoteSheet } from './note-sheet'
import { FeedingEndSheet } from './feeding-end-sheet'
import { QuickFeedSheet } from './quick-feed-sheet'
import { ActiveTimer } from './active-timer'
import { BabyInfoCard } from './baby-info-card'
import { BabyProfileSheet } from './baby-profile-sheet'
import { InsightsCard } from './insights-card'
import { NextEventCard } from './next-event-card'
import { OnboardingSheet } from './onboarding-sheet'
import { playSoundEffect } from '@/lib/sounds'
import { api, isQueuedResponse, type TodaySummary } from '@/lib/api-client'
import { useAppDataSync } from '@/lib/use-app-data-sync'
import { notifyDataSynced } from '@/lib/use-live-sync'

export function Dashboard() {
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [summary, setSummary] = useState<TodaySummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [summaryError, setSummaryError] = useState(false)
  const [noteOpen, setNoteOpen] = useState(false)
  const [feedEndOpen, setFeedEndOpen] = useState(false)
  const [quickFeedOpen, setQuickFeedOpen] = useState(false)
  const [onboardingOpen, setOnboardingOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)

  const fetchSummary = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setSummaryError(false)
    try {
      const data = await api.getTodaySummary()
      setSummary(data)
    } catch {
      if (!opts?.silent) setSummaryError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSummary()
  }, [fetchSummary])

  useAppDataSync(() => fetchSummary({ silent: true }))

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

  const handleSaveNote = async (content: string, photoUrl?: string, audioUrl?: string) => {
    const result = await api.createNote(content, photoUrl, audioUrl)
    if (isQueuedResponse(result)) {
      showToast('📡 Menunggu sync...')
    } else {
      showToast('📝 Catatan tersimpan!')
      notifyDataSynced()
    }
    fetchSummary({ silent: true })
  }

  const optimisticUpdate = (action: string) => {
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
        if (summary.activeFeedingStart) {
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
        if (summary.activeSleepStart) {
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

    const messages: Record<string, string> = {
      pup: '💩 Tercatat!',
      pee: '💧 Tercatat!',
      both: '💩💧 Tercatat!',
      change: 'Popok tercatat!',
      feed: '🍼 Mulai menyusui!',
      sleep: wasSleeping ? '☀️ Bangun!' : '😴 Mulai tidur!',
      wake: '☀️ Bangun!',
    }

    if (action === 'feed') optimisticUpdate('feed-start')
    else if (action === 'sleep') optimisticUpdate(wasSleeping ? 'sleep-end' : 'sleep-start')
    else if (action === 'wake') optimisticUpdate('sleep-end')
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
          result = await api.logSleep(wasSleeping ? 'end' : 'start')
          break
        case 'wake':
          result = await api.logSleep('end')
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

  const handleFeedEnd = async (data: {
    side?: string
    amount_ml?: number
    feed_type?: string
  }) => {
    showToast('🍼 Selesai menyusui!')
    optimisticUpdate('feed-end')
    setFeedEndOpen(false)
    try {
      const current = await api.getTodaySummary()
      if (!current.activeFeeding) {
        setSummary(current)
        setToastMessage('ℹ️ Menyusui sudah dihentikan di perangkat lain')
        setTimeout(() => setToastMessage(null), 3000)
        return
      }
      await api.logFeeding('end', data)
      fetchSummary()
      notifyDataSynced()
    } catch (err) {
      showLogError(err)
    }
  }

  const handleQuickFeed = async (data: { feed_type: string; amount_ml?: number }) => {
    showToast('🍼 Tercatat!')
    setQuickFeedOpen(false)
    if (summary) {
      setSummary({
        ...summary,
        counts: { ...summary.counts, feed: summary.counts.feed + 1 },
        lastTimes: { ...summary.lastTimes, feed: new Date().toISOString() },
      })
    }
    try {
      await api.logFeeding('quick', data)
      fetchSummary()
      notifyDataSynced()
    } catch (err) {
      showLogError(err)
    }
  }

  return (
    <div className="min-h-screen pt-6 pb-8">
      <div className="px-4 pb-4 pt-6">
        <div className="flex items-start justify-between">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex-1"
          >
            <h1 className="font-heading text-2xl font-bold text-foreground">
              Today
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
            <button
              type="button"
              onClick={() => {
                setLoading(true)
                fetchSummary()
              }}
              className="rounded-full bg-secondary p-2 text-sm"
              aria-label="Refresh"
            >
              ↻
            </button>
            <LoggedBySelector />
            <ThemeToggle />
          </div>
        </div>
      </div>

      <div className="px-4">
        <BabyInfoCard summary={summary} onClick={() => setProfileOpen(true)} />

        <NextEventCard />

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

        <InsightsCard summary={summary} />

        <div className="pb-4">
          <DailySummary
            summary={summary}
            loading={loading}
            error={summaryError}
            onRetry={() => {
              setLoading(true)
              fetchSummary()
            }}
          />
        </div>

        <div className="mb-4">
          <h2 className="font-heading mb-3 text-base font-semibold text-foreground">
            Quick Action
          </h2>
          <div className="grid grid-cols-3 gap-2">
            <QuickLogButton
              compact
              type="pup"
              emoji="💩"
              label="Pup"
              color="bg-yellow-200 dark:bg-yellow-900"
              onClick={() => handleLog('pup')}
            />
            <QuickLogButton
              compact
              type="pee"
              emoji="💧"
              label="Pee"
              color="bg-blue-200 dark:bg-blue-900"
              onClick={() => handleLog('pee')}
            />
            <QuickLogButton
              compact
              type="both"
              icon={
                <span className="inline-flex items-center gap-0.5 text-[1.05rem] leading-none">
                  <span>💩</span>
                  <span>💧</span>
                </span>
              }
              label="Pupee"
              color="bg-teal-200 dark:bg-teal-900"
              onClick={() => handleLog('both')}
            />
            <QuickLogButton
              compact
              type="change"
              emoji="🩲"
              label="Popok"
              color="bg-slate-200 dark:bg-slate-800"
              onClick={() => handleLog('change')}
            />
            <QuickLogButton
              compact
              type="feed"
              emoji={summary?.activeFeeding ? '✅' : '🍼'}
              label={summary?.activeFeeding ? 'Done' : 'Susu'}
              color="bg-orange-200 dark:bg-orange-900"
              onClick={() => handleLog('feed')}
            />
            <QuickLogButton
              compact
              type="pumped"
              emoji="🥛"
              label="Pumping"
              color="bg-amber-200 dark:bg-amber-900"
              onClick={() => setQuickFeedOpen(true)}
            />
            <QuickLogButton
              compact
              type="sleep"
              emoji={summary?.activeSleep ? '☀️' : '😴'}
              label={summary?.activeSleep ? 'Bangun' : 'Tidur'}
              color={
                summary?.activeSleep
                  ? 'bg-green-200 dark:bg-green-900'
                  : 'bg-purple-200 dark:bg-purple-900'
              }
              onClick={() => handleLog('sleep')}
            />
            <QuickLogButton
              compact
              type="note"
              emoji="📝"
              label="Note"
              color="bg-pink-200 dark:bg-pink-900"
              onClick={() => setNoteOpen(true)}
            />
          </div>
        </div>
      </div>

      <NoteSheet
        open={noteOpen}
        onClose={() => setNoteOpen(false)}
        onSave={handleSaveNote}
      />
      <FeedingEndSheet
        open={feedEndOpen}
        onClose={() => setFeedEndOpen(false)}
        onSave={handleFeedEnd}
      />
      <QuickFeedSheet
        open={quickFeedOpen}
        onClose={() => setQuickFeedOpen(false)}
        onSave={handleQuickFeed}
      />
      <OnboardingSheet
        open={onboardingOpen}
        onComplete={() => {
          setOnboardingOpen(false)
          fetchSummary()
        }}
      />
      <BabyProfileSheet open={profileOpen} onClose={() => setProfileOpen(false)} />

      {toastMessage && <Toast message={toastMessage} />}
    </div>
  )
}
