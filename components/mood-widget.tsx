'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { api, type MoodLog } from '@/lib/api-client'
import { playSoundEffect } from '@/lib/sounds'
import { timeAgoId } from '@/lib/baby-utils'

const MOODS: { id: MoodLog['mood']; emoji: string; label: string }[] = [
  { id: 'happy', emoji: '😊', label: 'Senang' },
  { id: 'calm', emoji: '😌', label: 'Tenang' },
  { id: 'fussy', emoji: '😣', label: 'Rewel' },
  { id: 'crying', emoji: '😭', label: 'Nangis' },
  { id: 'sleepy', emoji: '😴', label: 'Ngantuk' },
]

interface MoodWidgetProps {
  onLogged?: () => void
}

export function MoodWidget({ onLogged }: MoodWidgetProps) {
  const [latest, setLatest] = useState<MoodLog | null>(null)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  const loadLatest = useCallback(async () => {
    try {
      const data = await api.getLatestMood()
      setLatest(data.latest)
    } catch {
      // optional widget
    }
  }, [])

  useEffect(() => {
    loadLatest()
  }, [loadLatest])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  const handleTap = async (mood: MoodLog['mood']) => {
    if (saving) return
    setSaving(true)
    try {
      const log = await api.createMood(mood)
      setLatest(log)
      playSoundEffect('click')
      setOpen(false)
      onLogged?.()
    } catch {
      // keep previous
    } finally {
      setSaving(false)
    }
  }

  const latestMeta = latest
    ? MOODS.find((m) => m.id === latest.mood)
    : null

  return (
    <div
      ref={rootRef}
      className="relative shrink-0"
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.92 }}
            transition={{ type: 'spring', stiffness: 420, damping: 28 }}
            className="absolute bottom-full right-0 z-30 mb-2 flex items-center gap-0.5 rounded-full border border-border bg-card px-1.5 py-1 shadow-lg"
          >
            {MOODS.map((mood) => {
              const active = latest?.mood === mood.id
              return (
                <motion.button
                  key={mood.id}
                  type="button"
                  whileHover={{ scale: 1.18, y: -4 }}
                  whileTap={{ scale: 0.92 }}
                  disabled={saving}
                  onClick={() => handleTap(mood.id)}
                  className={`flex h-9 w-9 items-center justify-center rounded-full text-xl transition-colors ${
                    active ? 'bg-sky-100 dark:bg-sky-950/60' : 'hover:bg-secondary'
                  }`}
                  aria-label={mood.label}
                  title={mood.label}
                >
                  {mood.emoji}
                </motion.button>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={saving}
        className="inline-flex min-w-[44px] flex-col items-center justify-center rounded-xl border border-border bg-secondary/50 px-2 py-1 active:scale-[0.98]"
        aria-expanded={open}
        aria-label="Pilih mood"
      >
        <span className="text-xl leading-none">
          {latestMeta?.emoji ?? '🙂'}
        </span>
        <span className="mt-0.5 max-w-[56px] truncate text-[9px] leading-tight text-muted-foreground">
          {latest ? timeAgoId(latest.timestamp) : 'Mood'}
        </span>
      </button>
    </div>
  )
}
