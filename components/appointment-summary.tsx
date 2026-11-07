'use client'

import { useCallback, useEffect, useState } from 'react'
import { Clock, Hospital, Stethoscope, X } from 'lucide-react'
import { api, type CalendarEvent, type DailyNote, type GrowthLog } from '@/lib/api-client'
import { useAppDataSync } from '@/lib/use-app-data-sync'
import { requestOpenNote } from '@/lib/open-note'

type Summary = {
  event: CalendarEvent
  weight: string
  height: string
  head: string
  notes: DailyNote[]
}

function startOfToday() {
  const day = new Date()
  day.setHours(0, 0, 0, 0)
  return day
}

function eventCoversToday(event: CalendarEvent, today: Date) {
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const start = new Date(event.start_at)
  const end = new Date(event.end_at)
  return start < tomorrow && end >= today
}

function latestGrowth(logs: GrowthLog[]) {
  return [...logs].sort((a, b) => b.date.localeCompare(a.date))[0] ?? null
}

function formatMeasure(value: number | null | undefined, unit: string, digits: number) {
  if (value == null || Number.isNaN(value)) return '—'
  const text = digits > 0 ? value.toFixed(digits).replace('.', ',') : String(Math.round(value))
  return `${text} ${unit}`
}

function buildSummary(events: CalendarEvent[], logs: GrowthLog[], notes: DailyNote[]): Summary | null {
  const today = startOfToday()
  const appointment = events
    .filter((event) => event.show_summary && eventCoversToday(event, today))
    .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime())[0]
  if (!appointment) return null

  const appointmentStart = new Date(appointment.start_at).getTime()
  const previous = events
    .filter((event) => new Date(event.start_at).getTime() < appointmentStart)
    .sort((a, b) => new Date(b.start_at).getTime() - new Date(a.start_at).getTime())[0]
  const from = previous ? new Date(previous.end_at).getTime() : null
  const now = Date.now()
  const ranged = notes
    .filter((note) => {
      const at = new Date(note.timestamp).getTime()
      if (at > now) return false
      if (from != null && at < from) return false
      return true
    })
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  const growth = latestGrowth(logs)
  return {
    event: appointment,
    weight: formatMeasure(growth?.weight_kg, 'kg', 1),
    height: formatMeasure(growth?.height_cm, 'cm', 0),
    head: formatMeasure(growth?.head_circumference_cm, 'cm', 0),
    notes: ranged.slice(0, 20),
  }
}

export function AppointmentSummary() {
  const [summary, setSummary] = useState<Summary | null>(null)
  const [closed, setClosed] = useState(false)
  const [notesOpen, setNotesOpen] = useState(false)
  const [todayOpen, setTodayOpen] = useState(false)
  const [today, setToday] = useState<TodayMeasure | null>(null)

  const load = useCallback(async () => {
    try {
      const [events, logs, notes] = await Promise.all([
        api.getEvents(false).catch(() => [] as CalendarEvent[]),
        api.getGrowth().catch(() => [] as GrowthLog[]),
        api.getNotes({ limit: 50 }).catch(() => ({ items: [] as DailyNote[], hasMore: false, nextCursor: null })),
      ])
      setSummary(buildSummary(events, logs, notes.items))
    } catch {
      setSummary(null)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useAppDataSync(load, { poll: false })

  if (closed || !summary) return null

  const openNote = (id: string) => {
    requestOpenNote(id)
    window.dispatchEvent(new CustomEvent('pwa-navigate', { detail: { url: '/?p=notes' } }))
  }

  const when = new Date(summary.event.start_at).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <section className="mb-4 rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold tracking-wide text-primary uppercase">Janji temu hari ini</p>
          <h2 className="mt-1 truncate font-heading text-base font-bold text-foreground">{summary.event.title}</h2>
        </div>
        <button
          type="button"
          onClick={() => setClosed(true)}
          className="grid size-8 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-muted"
          aria-label="Tutup ringkasan"
        >
          <X className="size-4" />
        </button>
      </div>

      <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        {summary.event.meet_with ? (
          <span className="flex items-center gap-1.5">
            <Stethoscope className="size-3.5 shrink-0" aria-hidden />
            <span className="truncate">{summary.event.meet_with}</span>
          </span>
        ) : null}
        <span className="flex items-center gap-1.5">
          <Clock className="size-3.5 shrink-0" aria-hidden />
          <span>{when}</span>
        </span>
        {summary.event.location ? (
          <span className="flex min-w-0 items-center gap-1.5">
            <Hospital className="size-3.5 shrink-0" aria-hidden />
            <span className="truncate">{summary.event.location}</span>
          </span>
        ) : null}
      </p>

      {summary.event.notes ? (
        <p className="mt-3 text-xs text-foreground">
          <span className="font-semibold">Catatan. </span>
          {summary.event.notes}
        </p>
      ) : null}

      <p className="mt-3 text-[10px] font-medium text-muted-foreground">Pengukuran terakhir</p>
      <dl className="mt-1 grid grid-cols-3 gap-1.5 text-xs">
        <Metric label="BB" value={summary.weight} tone="bg-amber-500/15 text-amber-800 dark:text-amber-200" />
        <Metric label="TB" value={summary.height} tone="bg-sky-500/15 text-sky-800 dark:text-sky-200" />
        <Metric
          label="⌀"
          value={summary.head}
          aria="Lingkar kepala"
          tone="bg-emerald-500/15 text-emerald-800 dark:text-emerald-200"
          labelClassName="text-lg leading-none"
        />
      </dl>

      {todayOpen ? (
        <TodayMeasureForm
          initial={today}
          onCancel={() => setTodayOpen(false)}
          onApply={(value) => {
            setToday(value)
            setTodayOpen(false)
          }}
        />
      ) : today ? (
        <button
          type="button"
          onClick={() => setTodayOpen(true)}
          className="mt-1.5 w-full"
          aria-label="Ubah pengukuran hari ini"
        >
          <span className="grid grid-cols-3 gap-1 text-[11px]">
            <Metric label="BB" value={today.weight} tone="bg-amber-500/15 text-amber-800 dark:text-amber-200" />
            <Metric label="TB" value={today.height} tone="bg-sky-500/15 text-sky-800 dark:text-sky-200" />
            <Metric label="⌀" value={today.head} aria="Lingkar kepala" tone="bg-emerald-500/15 text-emerald-800 dark:text-emerald-200" labelClassName="text-base leading-none" />
          </span>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setTodayOpen(true)}
          className="mt-2 flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-border/80 py-1.5 text-xs font-medium text-muted-foreground/80"
        >
          <span aria-hidden>+</span>
          Pengukuran hari ini
        </button>
      )}

      <div className="mt-3 border-t border-border pt-3">
        {summary.notes.length === 0 ? (
          <p className="text-xs text-muted-foreground">Belum ada catatan sejak jadwal sebelumnya.</p>
        ) : notesOpen ? (
          <>
            <button
              type="button"
              onClick={() => setNotesOpen(false)}
              className="text-xs font-semibold text-primary underline-offset-2 hover:underline"
            >
              Sembunyikan catatan
            </button>
            <ul className="mt-2 space-y-2">
              {summary.notes.map((note) => {
                const media = Number(Boolean(note.photo_url)) + Number(Boolean(note.audio_url))
                return (
                  <li key={note.id} className="text-xs text-foreground">
                    <span className="mr-2 text-muted-foreground">
                      {new Date(note.timestamp).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                    </span>
                    {note.content}
                    {media > 0 ? (
                      <button
                        type="button"
                        onClick={() => openNote(note.id)}
                        className="ml-2 font-semibold text-primary underline-offset-2 hover:underline"
                      >
                        {media} lampiran
                      </button>
                    ) : null}
                  </li>
                )
              })}
            </ul>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setNotesOpen(true)}
            className="text-xs font-semibold text-primary underline-offset-2 hover:underline"
          >
            Ada {summary.notes.length} catatan yang bisa ditampilkan
          </button>
        )}
      </div>
    </section>
  )
}

type TodayMeasure = { weight: string; height: string; head: string }

function TodayMeasureForm({
  initial,
  onApply,
  onCancel,
}: {
  initial: TodayMeasure | null
  onApply: (value: TodayMeasure) => void
  onCancel: () => void
}) {
  const [weight, setWeight] = useState(initial?.weight.replace(' kg', '').replace('.', ',') ?? '')
  const [height, setHeight] = useState(initial?.height.replace(' cm', '') ?? '')
  const [head, setHead] = useState(initial?.head.replace(' cm', '') ?? '')

  const apply = () => {
    const asNumber = (raw: string) => {
      const n = Number(raw.replace(',', '.'))
      return raw.trim() && !Number.isNaN(n) ? n : null
    }
    onApply({
      weight: formatMeasure(asNumber(weight), 'kg', 1),
      height: formatMeasure(asNumber(height), 'cm', 0),
      head: formatMeasure(asNumber(head), 'cm', 0),
    })
  }

  return (
    <form
      className="mt-2 space-y-2"
      onSubmit={(event) => {
        event.preventDefault()
        apply()
      }}
    >
      <div className="grid grid-cols-3 gap-1">
        <Field value={weight} onChange={setWeight} placeholder="BB" />
        <Field value={height} onChange={setHeight} placeholder="TB" />
        <Field value={head} onChange={setHead} placeholder="⌀" />
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={onCancel} className="flex-1 rounded-lg border border-border py-1.5 text-xs font-semibold">
          Batal
        </button>
        <button type="submit" className="flex-1 rounded-lg bg-primary py-1.5 text-xs font-semibold text-primary-foreground">
          Tampilkan
        </button>
      </div>
    </form>
  )
}

function Field({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (value: string) => void
  placeholder: string
}) {
  return (
    <input
      inputMode="decimal"
      value={value}
      aria-label={placeholder}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className="w-full rounded-md border border-input bg-background px-1 py-1 text-center text-xs"
    />
  )
}

function Metric({
  label,
  value,
  aria,
  tone,
  labelClassName = 'text-[11px]',
}: {
  label: string
  value: string
  aria?: string
  tone: string
  labelClassName?: string
}) {
  return (
    <div className={`flex items-center justify-center gap-1 rounded-lg px-1.5 py-1.5 ${tone}`} aria-label={aria}>
      <dt className={`font-semibold ${labelClassName}`}>{label}</dt>
      <dd className="font-heading text-xs font-semibold">{value}</dd>
    </div>
  )
}
