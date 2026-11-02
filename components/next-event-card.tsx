'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
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
  const [open, setOpen] = useState(false)

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

  // Events change rarely — skip interval poll; refresh on action / tab focus
  useAppDataSync(load, { poll: false })

  if (!event) return null

  return (
    <div className="relative">
      <button
        type="button"
        onClick={(clickEvent) => {
          clickEvent.stopPropagation()
          setOpen((value) => !value)
        }}
        className="inline-flex items-center gap-1.5 rounded-full border border-white/70 bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-slate-900 shadow-sm backdrop-blur-md"
        aria-expanded={open}
      >
        <span aria-hidden>📅</span>
        <span className="max-w-28 truncate">{formatCountdown(event.start_at)}</span>
      </button>
      {open ? (
        <div
          className="absolute bottom-[calc(100%+0.45rem)] right-0 z-30 w-64 rounded-2xl border border-border bg-card p-3 text-left shadow-lg"
          onClick={(clickEvent) => clickEvent.stopPropagation()}
        >
          <p className="font-heading text-sm font-semibold text-foreground">{event.title}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {formatMiniWhen(event.start_at, event.end_at)}
          </p>
          <p className="mt-1 text-xs font-semibold text-primary">{formatCountdown(event.start_at)}</p>
          {event.location || event.meet_with ? (
            <ul className="mt-1.5 list-disc space-y-0.5 pl-3.5 text-xs text-muted-foreground marker:text-primary">
              {event.location ? <li>{event.location}</li> : null}
              {event.meet_with ? <li>{event.meet_with}</li> : null}
            </ul>
          ) : null}
          <button
            type="button"
            onClick={() => router.push(pageToPath('events'), { scroll: false })}
            className="mt-2 text-xs font-semibold text-primary"
          >
            Buka jadwal
          </button>
        </div>
      ) : null}
    </div>
  )
}
