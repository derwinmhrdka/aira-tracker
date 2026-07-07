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
import { InsightsCard } from './insights-card'
import { OnboardingSheet } from './onboarding-sheet'
import { playSoundEffect } from '@/lib/sounds'
import { api, type TodaySummary } from '@/lib/api-client'

export function Dashboard() {
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [summary, setSummary] = useState<TodaySummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [noteOpen, setNoteOpen] = useState(false)
  const [feedEndOpen, setFeedEndOpen] = useState(false)
  const [quickFeedOpen, setQuickFeedOpen] = useState(false)
  const [onboardingOpen, setOnboardingOpen] = useState(false)

  const fetchSummary = useCallback(async () => {
    try {
      const data = await api.getTodaySummary()
      setSummary(data)
    } catch {
      // handled by api client redirect
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSummary()
  }, [fetchSummary])

  useEffect(() => {
    const onSync = () => fetchSummary()
    window.addEventListener('app-data-synced', onSync)
    return () => window.removeEventListener('app-data-synced', onSync)
  }, [fetchSummary])

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

  useEffect(() => {
    if (!summary?.activeFeeding && !summary?.activeSleep) return
    const id = setInterval(fetchSummary, 30000)
    return () => clearInterval(id)
  }, [summary?.activeFeeding, summary?.activeSleep, fetchSummary])

  const showToast = (message: string) => {
    setToastMessage(message)
    playSoundEffect('success')
    setTimeout(() => setToastMessage(null), 2000)
  }

  const handleSaveNote = async (content: string, photoUrl?: string) => {
    await api.createNote(content, photoUrl)
    showToast('📝 Catatan tersimpan!')
  }

  const optimisticUpdate = (action: string) => {
    if (!summary) return
    const now = new Date().toISOString()
    const next = {
      ...summary,
      lastTimes: { ...summary.lastTimes },
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
      case 'feed-start':
        next.activeFeeding = true
        next.activeFeedingStart = now
        next.counts = { ...next.counts, feed: next.counts.feed + 1 }
        next.lastTimes.feed = now
        break
      case 'feed-end':
        next.activeFeeding = false
        next.activeFeedingStart = null
        break
      case 'sleep-start':
        next.activeSleep = true
        next.activeSleepStart = now
        next.counts = { ...next.counts, sleep: next.counts.sleep + 1 }
        next.lastTimes.sleep = now
        break
      case 'sleep-end':
        next.activeSleep = false
        next.activeSleepStart = null
        break
    }
    setSummary(next)
  }

  const handleLog = async (action: string) => {
    const wasFeeding = summary?.activeFeeding
    const wasSleeping = summary?.activeSleep

    if (action === 'feed' && wasFeeding) {
      setFeedEndOpen(true)
      return
    }

    const messages: Record<string, string> = {
      pup: '💩 Tercatat!',
      pee: '💧 Tercatat!',
      both: '💩💧 Tercatat!',
      feed: '🍼 Mulai menyusui!',
      sleep: wasSleeping ? '☀️ Bangun!' : '😴 Mulai tidur!',
      wake: '☀️ Bangun!',
    }
    showToast(messages[action] || 'Tercatat!')

    if (action === 'feed') optimisticUpdate('feed-start')
    else if (action === 'sleep') optimisticUpdate(wasSleeping ? 'sleep-end' : 'sleep-start')
    else if (action === 'wake') optimisticUpdate('sleep-end')
    else optimisticUpdate(action)

    try {
      switch (action) {
        case 'pup':
          await api.logDiaper('pup')
          break
        case 'pee':
          await api.logDiaper('pee')
          break
        case 'both':
          await api.logDiaper('both')
          break
        case 'feed':
          await api.logFeeding('start')
          break
        case 'sleep':
          await api.logSleep(wasSleeping ? 'end' : 'start')
          break
        case 'wake':
          await api.logSleep('end')
          break
      }
      fetchSummary()
    } catch (err) {
      fetchSummary()
      const msg = err instanceof Error ? err.message : 'Gagal mencatat'
      setToastMessage(`❌ ${msg}`)
      setTimeout(() => setToastMessage(null), 3000)
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
      await api.logFeeding('end', data)
      fetchSummary()
    } catch (err) {
      fetchSummary()
      const msg = err instanceof Error ? err.message : 'Gagal mencatat'
      setToastMessage(`❌ ${msg}`)
      setTimeout(() => setToastMessage(null), 3000)
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
    } catch (err) {
      fetchSummary()
      const msg = err instanceof Error ? err.message : 'Gagal mencatat'
      setToastMessage(`❌ ${msg}`)
      setTimeout(() => setToastMessage(null), 3000)
    }
  }

  return (
    <div className="min-h-screen bg-background pt-6 pb-8">
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
              onClick={() => { setLoading(true); fetchSummary() }}
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
        <BabyInfoCard summary={summary} />

        <ActiveTimer
          type="feeding"
          startTime={summary?.activeFeedingStart ?? null}
          active={!!summary?.activeFeeding}
        />
        <ActiveTimer
          type="sleep"
          startTime={summary?.activeSleepStart ?? null}
          active={!!summary?.activeSleep}
        />

        <InsightsCard summary={summary} />

        <div className="pb-4">
          <DailySummary summary={summary} loading={loading} />
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
              label="Pipis"
              color="bg-blue-200 dark:bg-blue-900"
              onClick={() => handleLog('pee')}
            />
            <QuickLogButton
              compact
              type="both"
              emoji="💩💧"
              label="Dua"
              color="bg-teal-200 dark:bg-teal-900"
              onClick={() => handleLog('both')}
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
              label="Perah"
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

      {toastMessage && <Toast message={toastMessage} />}
    </div>
  )
}
