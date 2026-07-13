'use client'

import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
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
  const [saving, setSaving] = useState<string | null>(null)

  const loadLatest = useCallback(async () => {
    try {
      const data = await api.getLatestMood()
      setLatest(data.latest)
    } catch {
      // optional widget — ignore
    }
  }, [])

  useEffect(() => {
    loadLatest()
  }, [loadLatest])

  const handleTap = async (mood: MoodLog['mood']) => {
    if (saving) return
    setSaving(mood)
    try {
      const log = await api.createMood(mood)
      setLatest(log)
      playSoundEffect('click')
      onLogged?.()
    } catch {
      // keep previous latest
    } finally {
      setSaving(null)
    }
  }

  const latestMeta = latest
    ? MOODS.find((m) => m.id === latest.mood)
    : null

  return (
    <div className="mb-4 rounded-2xl border border-border bg-card p-3 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="font-heading text-sm font-semibold text-foreground">
          Mood sekarang
        </h2>
        {latestMeta && (
          <p className="text-[11px] text-muted-foreground">
            {latestMeta.emoji} {timeAgoId(latest.timestamp)}
          </p>
        )}
      </div>
      <div className="flex justify-between gap-1">
        {MOODS.map((mood) => {
          const active = latest?.mood === mood.id
          return (
            <motion.button
              key={mood.id}
              type="button"
              whileTap={{ scale: 0.9 }}
              disabled={!!saving}
              onClick={() => handleTap(mood.id)}
              className={`flex flex-1 flex-col items-center rounded-xl py-2 transition-colors ${
                active
                  ? 'bg-sky-100 dark:bg-sky-950/50'
                  : 'bg-secondary/60 hover:bg-secondary'
              } ${saving === mood.id ? 'opacity-60' : ''}`}
              aria-label={mood.label}
            >
              <span className="text-2xl">{mood.emoji}</span>
              <span className="mt-0.5 text-[9px] text-muted-foreground">
                {mood.label}
              </span>
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}
