'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { api, type CalendarEvent } from '@/lib/api-client'
import { useAppDataSync } from '@/lib/use-app-data-sync'
import { pageToPath } from '@/lib/navigation'

function formatCountdown(startIso: string) {
  const diffMs = new Date(startIso).getTime() - Date.now()
  if (diffMs <= 0) return 'Sedang berlangsung'
  const minutes = Math.round(diffMs / 60000)
  if (minutes < 60) return `${minutes} menit lagi`
  const hours = Math.floor(minutes / 60)
  const rem = minutes % 60
  if (hours < 24) return rem > 0 ? `${hours}j ${rem}m lagi` : `${hours} jam lagi`
  const days = Math.floor(hours / 24)
  return days === 1 ? 'Besok' : `${days} hari lagi`
}

function formatMiniWhen(startIso: string, endIso: string) {
  const start = new Date(startIso)
  const end = new Date(endIso)
  const date = start.toLocaleDateString('id-ID', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
  const startTime = start.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  })
  const endTime = end.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  })
  return `${date} · ${startTime}–${endTime}`
}

export function NextEventCard() {
  const router = useRouter()
  const [event, setEvent] = useState<CalendarEvent | null>(null)

  const load = async () => {
    try {
      const events = await api.getEvents(true)
      setEvent(events[0] ?? null)
    } catch {
      setEvent(null)
    }
  }

  useEffect(() => {
    load()
  }, [])

  useAppDataSync(load)

  if (!event) return null

  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={() => router.push(pageToPath('events'), { scroll: false })}
      className="mb-4 w-full rounded-2xl border border-border bg-card p-3 text-left shadow-sm transition-colors hover:bg-secondary/30 active:scale-[0.99]"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-lg dark:bg-indigo-950/50">
          📅
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="font-heading truncate text-sm font-semibold text-foreground">
              {event.title}
            </p>
            <span className="shrink-0 rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-medium text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
              {formatCountdown(event.start_at)}
            </span>
          </div>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {formatMiniWhen(event.start_at, event.end_at)}
          </p>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground">
            {event.location && <span>📍 {event.location}</span>}
            {event.meet_with && <span>👤 {event.meet_with}</span>}
          </div>
        </div>
      </div>
    </motion.button>
  )
}
