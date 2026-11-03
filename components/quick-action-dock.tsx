'use client'

import { useCallback, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { QuickLogButton } from './quick-log-button'
import { Toast } from './toast'
import { NoteSheet } from './note-sheet'
import { SessionEndSheet, type SessionEndData } from './session-end-sheet'
import { QuickFeedSheet } from './quick-feed-sheet'
import { playSoundEffect } from '@/lib/sounds'
import { api, isQueuedResponse, type TodaySummary } from '@/lib/api-client'
import { useAppDataSync } from '@/lib/use-app-data-sync'
import { notifyDataSynced } from '@/lib/use-live-sync'
import {
  getQuickActionPrefs,
  QUICK_ACTIONS_EVENT,
  quickMenuSlots,
  visibleQuickActionIds,
  type QuickActionId,
} from '@/lib/quick-actions'
import { QUICK_ADD_PAGE, requestQuickAdd, type QuickAddTarget } from '@/lib/quick-add'
import type { AppPage } from '@/lib/navigation'

function QuickActionOrb({
  id,
  feeding,
  sleeping,
  onLog,
  onPump,
  onNote,
  onOpenPage,
  orbSize,
}: {
  id: QuickActionId
  feeding: boolean
  sleeping: boolean
  onLog: (action: string) => void
  onPump: () => void
  onNote: () => void
  onOpenPage: (id: QuickActionId) => void
  orbSize: number
}) {
  if (id === 'pup') {
    return <QuickLogButton orb orbSize={orbSize} type="pup" emoji="💩" label="Pup" color="bg-yellow-200/90 dark:bg-yellow-900/80" onClick={() => onLog('pup')} />
  }
  if (id === 'pee') {
    return <QuickLogButton orb orbSize={orbSize} type="pee" emoji="💧" label="Pee" color="bg-blue-200/90 dark:bg-blue-900/80" onClick={() => onLog('pee')} />
  }
  if (id === 'change') {
    return <QuickLogButton orb orbSize={orbSize} type="change" emoji="🩲" label="Popok" color="bg-slate-200/90 dark:bg-slate-800/80" onClick={() => onLog('change')} />
  }
  if (id === 'feed') {
    return (
      <QuickLogButton
        orb
        orbSize={orbSize}
        type="feed"
        emoji={feeding ? '✅' : '🍼'}
        label={feeding ? 'Done' : 'Susu'}
        color="bg-orange-200/90 dark:bg-orange-900/80"
        onClick={() => onLog('feed')}
      />
    )
  }
  if (id === 'pumping') {
    return <QuickLogButton orb orbSize={orbSize} type="pumped" emoji="🥛" label="Pump" color="bg-amber-200/90 dark:bg-amber-900/80" onClick={onPump} />
  }
  if (id === 'sleep') {
    return (
      <QuickLogButton
        orb
        orbSize={orbSize}
        type="sleep"
        emoji={sleeping ? '☀️' : '😴'}
        label={sleeping ? 'Bangun' : 'Tidur'}
        color={sleeping ? 'bg-green-200/90 dark:bg-green-900/80' : 'bg-purple-200/90 dark:bg-purple-900/80'}
        onClick={() => onLog('sleep')}
      />
    )
  }
  if (id === 'note') {
    return <QuickLogButton orb orbSize={orbSize} type="note" emoji="📝" label="Note" color="bg-pink-200/90 dark:bg-pink-900/80" onClick={onNote} />
  }
  if (id === 'event') {
    return <QuickLogButton orb orbSize={orbSize} type="note" emoji="📅" label="Event" color="bg-indigo-200/90 dark:bg-indigo-900/80" onClick={() => onOpenPage(id)} />
  }
  if (id === 'immunization') {
    return <QuickLogButton orb orbSize={orbSize} type="note" emoji="💉" label="Imunisasi" color="bg-orange-200/90 dark:bg-orange-900/80" onClick={() => onOpenPage(id)} />
  }
  if (id === 'history') {
    return <QuickLogButton orb orbSize={orbSize} type="note" emoji="🕐" label="Riwayat" color="bg-sky-200/90 dark:bg-sky-900/80" onClick={() => onOpenPage(id)} />
  }
  return <QuickLogButton orb orbSize={orbSize} type="note" emoji="🏆" label="Milestone" color="bg-amber-200/90 dark:bg-amber-900/80" onClick={() => onOpenPage(id)} />
}

function QuickMenu({
  ids,
  feeding,
  sleeping,
  onLog,
  onPump,
  onNote,
  onOpenPage,
}: {
  ids: QuickActionId[]
  feeding: boolean
  sleeping: boolean
  onLog: (action: string) => void
  onPump: () => void
  onNote: () => void
  onOpenPage: (id: QuickActionId) => void
}) {
  const slots = quickMenuSlots(ids.length)
  const disc = slots[0]?.disc ?? 280
  return (
    <>
      <motion.div
        aria-hidden
        initial={{ scale: 0.72, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.72, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
        className="absolute rounded-full border border-white/70 bg-white/35 shadow-[0_16px_40px_rgb(0_0_0/0.12)] backdrop-blur-md dark:border-white/20 dark:bg-white/10"
        style={{ width: disc, height: disc, left: -disc / 2, bottom: -disc / 2 }}
      />
      {ids.map((id, index) => {
        const slot = slots[index]
        if (!slot) return null
        const half = slot.orb / 2
        return (
          <motion.div
            key={id}
            className="pointer-events-auto absolute"
            style={{ left: -half, bottom: -half, width: slot.orb, height: slot.orb }}
            initial={{ x: 0, y: 0, scale: 0.3, opacity: 0 }}
            animate={{ x: slot.x, y: slot.y, scale: 1, opacity: 1 }}
            exit={{ x: 0, y: 0, scale: 0.3, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 440, damping: 28, delay: index * 0.025 }}
          >
            <QuickActionOrb
              id={id}
              orbSize={slot.orb}
              feeding={feeding}
              sleeping={sleeping}
              onLog={onLog}
              onPump={onPump}
              onNote={onNote}
              onOpenPage={onOpenPage}
            />
          </motion.div>
        )
      })}
    </>
  )
}

export function QuickActionDock({
  open,
  onClose,
  onNavigate,
}: {
  open: boolean
  onClose: () => void
  onNavigate: (page: AppPage) => void
}) {
  const [summary, setSummary] = useState<TodaySummary | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [noteOpen, setNoteOpen] = useState(false)
  const [feedEndOpen, setFeedEndOpen] = useState(false)
  const [sleepEndOpen, setSleepEndOpen] = useState(false)
  const [quickFeedOpen, setQuickFeedOpen] = useState(false)
  const [actionIds, setActionIds] = useState<QuickActionId[]>(() =>
    visibleQuickActionIds(getQuickActionPrefs())
  )

  useEffect(() => {
    const sync = () => setActionIds(visibleQuickActionIds(getQuickActionPrefs()))
    sync()
    window.addEventListener(QUICK_ACTIONS_EVENT, sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener(QUICK_ACTIONS_EVENT, sync)
      window.removeEventListener('storage', sync)
    }
  }, [])

  const fetchSummary = useCallback(async () => {
    try {
      setSummary(await api.getTodaySummary())
    } catch {
      // Keep the last summary.
    }
  }, [])

  useEffect(() => {
    if (open) void fetchSummary()
  }, [open, fetchSummary])

  useAppDataSync(() => fetchSummary(), { poll: false })

  const showToast = (message: string) => {
    setToastMessage(message)
    playSoundEffect('success')
    window.setTimeout(() => setToastMessage(null), 2000)
  }

  const showLogError = (err: unknown) => {
    void fetchSummary()
    const msg = err instanceof Error ? err.message : 'Gagal mencatat'
    setToastMessage(msg.includes('aktif') || msg.includes('Tidak ada sesi') ? 'ℹ️ Status sudah berubah' : `❌ ${msg}`)
    window.setTimeout(() => setToastMessage(null), 3000)
  }

  const handleLog = async (action: string) => {
    let current = summary
    if (action === 'feed' || action === 'sleep') {
      try {
        current = await api.getTodaySummary()
        setSummary(current)
      } catch {
        // Use the summary already on screen.
      }
    }

    if (action === 'feed' && current?.activeFeeding) {
      onClose()
      setFeedEndOpen(true)
      return
    }
    if (action === 'sleep' && current?.activeSleep) {
      onClose()
      setSleepEndOpen(true)
      return
    }

    const messages: Record<string, string> = {
      pup: '💩 Tercatat!',
      pee: '💧 Tercatat!',
      change: 'Popok tercatat!',
      feed: '🍼 Mulai menyusui!',
      sleep: '😴 Mulai tidur!',
    }

    try {
      let result: unknown
      switch (action) {
        case 'pup':
          result = await api.logDiaper('pup')
          break
        case 'pee':
          result = await api.logDiaper('pee')
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
        window.setTimeout(() => setToastMessage(null), 3000)
      } else {
        showToast(messages[action] || 'Tercatat!')
        void fetchSummary()
        notifyDataSynced()
      }
    } catch (err) {
      showLogError(err)
    }
  }

  const handleFeedEnd = async (data: SessionEndData) => {
    setFeedEndOpen(false)
    try {
      const current = await api.getTodaySummary()
      if (!current.activeFeeding) {
        setSummary(current)
        setToastMessage('ℹ️ Menyusui sudah dihentikan')
        window.setTimeout(() => setToastMessage(null), 3000)
        return
      }
      await api.logFeeding('end', {
        side: data.side,
        amount_ml: data.amount_ml,
        feed_type: data.feed_type,
        duration_minutes: data.duration_minutes,
      })
      showToast('🍼 Selesai menyusui!')
      void fetchSummary()
      notifyDataSynced()
    } catch (err) {
      showLogError(err)
    }
  }

  const handleSleepEnd = async (data: SessionEndData) => {
    setSleepEndOpen(false)
    try {
      const current = await api.getTodaySummary()
      if (!current.activeSleep) {
        setSummary(current)
        setToastMessage('ℹ️ Tidur sudah dihentikan')
        window.setTimeout(() => setToastMessage(null), 3000)
        return
      }
      await api.logSleep('end', { duration_minutes: data.duration_minutes })
      showToast('☀️ Bangun!')
      void fetchSummary()
      notifyDataSynced()
    } catch (err) {
      showLogError(err)
    }
  }

  const handleQuickFeed = async (data: { feed_type: string; amount_ml?: number }) => {
    setQuickFeedOpen(false)
    try {
      await api.logFeeding('quick', data)
      showToast('🍼 Tercatat!')
      void fetchSummary()
      notifyDataSynced()
    } catch (err) {
      showLogError(err)
    }
  }

  const handleSaveNote = async (content: string, photoUrl?: string, audioUrl?: string) => {
    const result = await api.createNote(content, photoUrl, audioUrl)
    if (isQueuedResponse(result)) {
      setToastMessage('📡 Menunggu sync...')
      window.setTimeout(() => setToastMessage(null), 3000)
    } else {
      showToast('📝 Catatan tersimpan!')
      notifyDataSynced()
    }
  }

  return (
    <>
      <AnimatePresence>
        {open ? (
          <>
            <motion.button
              type="button"
              aria-label="Tutup aksi cepat"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-30 bg-black/35"
              onClick={onClose}
            />
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22 }}
              className="pointer-events-none fixed left-1/2 z-30 h-0 w-0"
              style={{ bottom: 'calc(2.5rem + env(safe-area-inset-bottom, 0px))' }}
            >
              {actionIds.length === 0 ? null : (
                <QuickMenu
                  ids={actionIds}
                  feeding={Boolean(summary?.activeFeeding)}
                  sleeping={Boolean(summary?.activeSleep)}
                  onLog={handleLog}
                  onPump={() => { onClose(); setQuickFeedOpen(true) }}
                  onNote={() => { onClose(); setNoteOpen(true) }}
                  onOpenPage={(id) => {
                    onClose()
                    if (id === 'event' || id === 'immunization' || id === 'milestone') {
                      requestQuickAdd(id)
                    }
                    onNavigate(QUICK_ADD_PAGE[id as QuickAddTarget | 'history'])
                  }}
                />
              )}
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>

      <NoteSheet open={noteOpen} onClose={() => setNoteOpen(false)} onSave={handleSaveNote} />
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
      <QuickFeedSheet open={quickFeedOpen} onClose={() => setQuickFeedOpen(false)} onSave={handleQuickFeed} />
      {toastMessage ? <Toast message={toastMessage} /> : null}
    </>
  )
}
