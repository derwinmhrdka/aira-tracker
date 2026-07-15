'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Award, FileText, ListChecks, Trophy, type LucideIcon } from 'lucide-react'
import { PageHeader } from './page-header'
import { ErrorBanner } from './error-banner'
import {
  api,
  type DailyNote,
  type DevelopmentItem,
  type Milestone,
  type TitleItem,
} from '@/lib/api-client'
import { getDisplayPhotoUrl } from '@/lib/offline-photos'

interface TimelinePageProps {
  onBack: () => void
}

type TimelineSource = 'note' | 'milestone' | 'development' | 'achievement'

type TimelineEvent = {
  id: string
  source: TimelineSource
  title: string
  detail: string
  dateIso: string
  photoUrl: string | null
  emoji: string | null
}

type MonthGroup = {
  key: string
  label: string
  events: TimelineEvent[]
}

const SOURCE_LABEL: Record<TimelineSource, string> = {
  note: 'Catatan',
  milestone: 'Milestone',
  development: 'Perkembangan',
  achievement: 'Pencapaian',
}

const SOURCE_ICON: Record<TimelineSource, LucideIcon> = {
  note: FileText,
  milestone: Trophy,
  development: ListChecks,
  achievement: Award,
}

const SOURCE_ICON_BG: Record<TimelineSource, string> = {
  note: 'bg-sky-500',
  milestone: 'bg-amber-500',
  development: 'bg-violet-500',
  achievement: 'bg-cyan-500',
}

const SOURCE_TINT: Record<TimelineSource, string> = {
  note: 'from-sky-400/90 to-cyan-500/80',
  milestone: 'from-amber-400/90 to-orange-500/80',
  development: 'from-violet-400/90 to-indigo-500/80',
  achievement: 'from-cyan-400/90 to-teal-500/80',
}

const DEV_EMOJI: Record<string, string> = {
  physical: '💪',
  cognitive: '🧠',
  linguistic: '💬',
  social: '💝',
}

const AGE_LABEL: Record<number, string> = {
  0: 'Baru lahir',
  2: '2 bulan',
  4: '4 bulan',
  6: '6 bulan',
  9: '9 bulan',
  12: '12 bulan',
  15: '15 bulan',
  18: '18 bulan',
  24: '2 tahun',
  30: '2,5 tahun',
  36: '3 tahun',
  48: '4 tahun',
  60: '5 tahun',
}

function truncate(text: string, max = 28) {
  const t = text.trim().replace(/\s+/g, ' ')
  if (t.length <= max) return t
  return `${t.slice(0, max - 1)}…`
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('id-ID', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function monthKey(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function monthLabel(iso: string) {
  return new Date(iso).toLocaleDateString('id-ID', {
    month: 'long',
    year: 'numeric',
  })
}

function groupByMonth(events: TimelineEvent[]): MonthGroup[] {
  const map = new Map<string, MonthGroup>()
  for (const event of events) {
    const key = monthKey(event.dateIso)
    const existing = map.get(key)
    if (existing) {
      existing.events.push(event)
    } else {
      map.set(key, {
        key,
        label: monthLabel(event.dateIso),
        events: [event],
      })
    }
  }
  return Array.from(map.values())
}

function noteToEvent(n: DailyNote): TimelineEvent {
  return {
    id: `note-${n.id}`,
    source: 'note',
    title: truncate(n.content || 'Catatan'),
    detail: n.content,
    dateIso: n.timestamp,
    photoUrl: n.photo_url ?? null,
    emoji: null,
  }
}

function milestoneToEvent(m: Milestone): TimelineEvent {
  return {
    id: `milestone-${m.id}`,
    source: 'milestone',
    title: truncate(m.title),
    detail: m.description?.trim() || m.title,
    dateIso: m.date.includes('T') ? m.date : `${m.date}T12:00:00.000Z`,
    photoUrl: m.photo_url ?? null,
    emoji: null,
  }
}

function developmentToEvent(d: DevelopmentItem): TimelineEvent | null {
  if (!d.is_checked || !d.date_checked) return null
  const age = AGE_LABEL[d.age_group_months] ?? `${d.age_group_months} bulan`
  return {
    id: `dev-${d.id}`,
    source: 'development',
    title: truncate(d.question, 24),
    detail: `${age} · ${d.question}`,
    dateIso: `${d.date_checked}T12:00:00.000Z`,
    photoUrl: null,
    emoji: DEV_EMOJI[d.category ?? ''] ?? '✨',
  }
}

const CATEGORY_LABEL: Record<string, string> = {
  physical: 'Fisik',
  cognitive: 'Kognitif',
  linguistic: 'Bahasa',
  social: 'Sosial',
}

function achievementToEvent(t: TitleItem): TimelineEvent | null {
  if (!t.is_unlocked || !t.unlocked_at) return null
  const age =
    AGE_LABEL[t.age_group_months] ?? `${t.age_group_months} bulan`
  const cat = CATEGORY_LABEL[t.category] ?? t.category
  return {
    id: `achievement-${t.id}`,
    source: 'achievement',
    title: truncate(t.name, 24),
    detail: `${t.emoji} ${t.name} · ${age} · ${cat} — ${t.description}`,
    dateIso: t.unlocked_at,
    photoUrl: null,
    emoji: t.emoji,
  }
}

async function fetchAllNotes(): Promise<DailyNote[]> {
  const all: DailyNote[] = []
  let cursor: string | undefined
  for (let i = 0; i < 6; i++) {
    const page = await api.getNotes({ limit: 50, cursor })
    all.push(...page.items)
    if (!page.hasMore || !page.nextCursor) break
    cursor = page.nextCursor
  }
  return all
}

function SourceBadge({ source }: { source: TimelineSource }) {
  const Icon = SOURCE_ICON[source]
  return (
    <span
      className={`absolute -bottom-1 left-1/2 flex h-5 w-5 -translate-x-1/2 items-center justify-center rounded-full text-white shadow ${SOURCE_ICON_BG[source]}`}
    >
      <Icon className="h-3 w-3" strokeWidth={2.5} />
    </span>
  )
}

export function TimelinePage({ onBack }: TimelinePageProps) {
  const [events, setEvents] = useState<TimelineEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)
  const scrollerRef = useRef<HTMLDivElement>(null)
  const nodeRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const dragRef = useRef<{
    active: boolean
    startX: number
    scrollLeft: number
    moved: boolean
  } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      const [notes, milestones, development, titles] = await Promise.all([
        fetchAllNotes(),
        api.getMilestones(),
        api.getDevelopmentChecklist(),
        api.getTitles(),
      ])

      const merged = [
        ...notes.map(noteToEvent),
        ...milestones.map(milestoneToEvent),
        ...development
          .map(developmentToEvent)
          .filter((e): e is TimelineEvent => e != null),
        ...titles
          .map(achievementToEvent)
          .filter((e): e is TimelineEvent => e != null),
      ].sort(
        (a, b) => new Date(a.dateIso).getTime() - new Date(b.dateIso).getTime()
      )

      setEvents(merged)
      if (merged.length > 0) {
        const last = merged[merged.length - 1]
        setSelectedId(last.id)
        setExpanded(false)
      } else {
        setSelectedId(null)
        setExpanded(false)
      }
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const monthGroups = useMemo(() => groupByMonth(events), [events])

  const selected = useMemo(
    () => events.find((e) => e.id === selectedId) ?? null,
    [events, selectedId]
  )

  const selectedIndex = useMemo(
    () => events.findIndex((e) => e.id === selectedId),
    [events, selectedId]
  )

  const progressPct =
    events.length <= 1
      ? 100
      : selectedIndex < 0
        ? 0
        : (selectedIndex / (events.length - 1)) * 100

  const cardBg =
    selected?.photoUrl != null
      ? getDisplayPhotoUrl(selected.photoUrl)
      : null

  useEffect(() => {
    if (!selectedId) return
    const el = nodeRefs.current[selectedId]
    el?.scrollIntoView({
      behavior: 'smooth',
      inline: 'center',
      block: 'nearest',
    })
  }, [selectedId, loading])

  const selectEvent = (id: string) => {
    if (dragRef.current?.moved) return
    if (selectedId === id) {
      setExpanded((v) => !v)
      return
    }
    setSelectedId(id)
    setExpanded(true)
  }

  const onLanePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'touch') return
    const el = scrollerRef.current
    if (!el) return
    dragRef.current = {
      active: true,
      startX: e.clientX,
      scrollLeft: el.scrollLeft,
      moved: false,
    }
    el.setPointerCapture(e.pointerId)
  }

  const onLanePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = scrollerRef.current
    const drag = dragRef.current
    if (!el || !drag?.active) return
    const dx = e.clientX - drag.startX
    if (Math.abs(dx) > 6) drag.moved = true
    el.scrollLeft = drag.scrollLeft - dx
  }

  const onLanePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = scrollerRef.current
    const drag = dragRef.current
    if (el && drag?.active) {
      try {
        el.releasePointerCapture(e.pointerId)
      } catch {
        /* already released */
      }
    }
    window.setTimeout(() => {
      if (dragRef.current === drag) dragRef.current = null
    }, 0)
  }

  return (
    <div className="px-4 pt-6 pb-8">
      <PageHeader
        title="Timeline"
        subtitle="Jejak kenangan bayi"
        onBack={onBack}
      />

      {error ? (
        <ErrorBanner message="Gagal memuat timeline" onRetry={load} />
      ) : loading ? (
        <div className="mt-6 space-y-4">
          <div className="h-28 animate-pulse rounded-3xl bg-secondary" />
          <div className="h-48 animate-pulse rounded-3xl bg-secondary" />
        </div>
      ) : events.length === 0 ? (
        <p className="py-16 text-center text-sm text-muted-foreground">
          Belum ada jejak. Tambah catatan, milestone, badge, atau centang
          perkembangan.
        </p>
      ) : (
        <div className="relative mt-2 overflow-hidden rounded-[1.75rem] border border-white/20 shadow-[0_20px_50px_-28px_rgba(14,116,144,0.55)]">
          {/* Washed-out selected photo as card backdrop */}
          <AnimatePresence mode="wait">
            {cardBg ? (
              <motion.div
                key={cardBg}
                aria-hidden
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.45 }}
                className="absolute inset-0"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={cardBg}
                  alt=""
                  className="h-full w-full scale-110 object-cover blur-[2px]"
                />
                <div className="absolute inset-0 bg-slate-950/72" />
                <div className="absolute inset-0 bg-gradient-to-b from-sky-950/40 via-transparent to-slate-950/80" />
              </motion.div>
            ) : (
              <motion.div
                key="fallback-bg"
                aria-hidden
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-gradient-to-b from-sky-900 via-slate-900 to-cyan-950"
              />
            )}
          </AnimatePresence>

          <div className="relative px-1 pb-5 pt-5 sm:px-2">
            <div className="relative mb-5 min-w-0">
              {/* Track aligns with photo row (~ titles 2.25rem + month 1.5rem + gaps) */}
              <div className="pointer-events-none absolute left-4 right-4 top-[6.85rem] h-[3px] rounded-full bg-white/20" />
              <div
                className="pointer-events-none absolute left-4 top-[6.85rem] h-[3px] origin-left rounded-full bg-gradient-to-r from-cyan-300 via-sky-400 to-indigo-300 transition-transform duration-500 ease-out"
                style={{
                  width: 'calc(100% - 2rem)',
                  transform: `scaleX(${Math.max(0.02, progressPct / 100)})`,
                }}
              />

              <div
                ref={scrollerRef}
                onPointerDown={onLanePointerDown}
                onPointerMove={onLanePointerMove}
                onPointerUp={onLanePointerUp}
                onPointerCancel={onLanePointerUp}
                className="flex cursor-grab touch-pan-x items-start gap-8 overflow-x-auto px-4 pb-3 pt-1 active:cursor-grabbing [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              >
                {monthGroups.map((group) => (
                  <div
                    key={group.key}
                    className="flex shrink-0 flex-col items-center"
                  >
                    <p className="mb-2 text-center font-heading text-xs font-semibold capitalize tracking-wide text-white/90">
                      {group.label}
                    </p>

                    <div className="flex gap-5">
                      {group.events.map((event) => {
                        const flatIndex = events.findIndex(
                          (e) => e.id === event.id
                        )
                        const active = event.id === selectedId
                        const past =
                          selectedIndex >= 0 && flatIndex <= selectedIndex
                        const photoSrc = event.photoUrl
                          ? getDisplayPhotoUrl(event.photoUrl)
                          : null

                        return (
                          <button
                            key={event.id}
                            type="button"
                            ref={(el) => {
                              nodeRefs.current[event.id] = el
                            }}
                            onClick={() => selectEvent(event.id)}
                            className="group relative flex w-[4.75rem] shrink-0 flex-col items-center gap-2"
                          >
                            <span
                              className={`line-clamp-2 min-h-[2.25rem] text-center text-[10px] font-semibold leading-tight transition-colors ${
                                active
                                  ? 'text-white'
                                  : 'text-white/65'
                              }`}
                            >
                              {event.title}
                            </span>

                            <span className="relative mt-0.5">
                              <motion.span
                                layout
                                className={`relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border-[3px] shadow-md transition-all ${
                                  active
                                    ? 'scale-110 border-white ring-4 ring-white/30'
                                    : past
                                      ? 'border-cyan-300/90'
                                      : 'border-white/40'
                                }`}
                              >
                                {photoSrc ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={photoSrc}
                                    alt=""
                                    className="pointer-events-none h-full w-full object-cover"
                                    draggable={false}
                                  />
                                ) : (
                                  <span
                                    className={`flex h-full w-full items-center justify-center bg-gradient-to-br text-xl text-white ${SOURCE_TINT[event.source]}`}
                                  >
                                    {event.emoji ??
                                      (event.source === 'milestone'
                                        ? '🏆'
                                        : event.source === 'note'
                                          ? '📝'
                                          : event.source === 'achievement'
                                            ? '🏅'
                                            : '✨')}
                                  </span>
                                )}
                              </motion.span>
                              <SourceBadge source={event.source} />
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <AnimatePresence mode="wait">
              {selected && (
                <motion.div
                  key={selected.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ type: 'spring', stiffness: 320, damping: 28 }}
                  className="overflow-hidden px-2 sm:px-3"
                >
                  <motion.button
                    type="button"
                    layout
                    onClick={() => setExpanded((v) => !v)}
                    className="w-full overflow-hidden rounded-2xl border border-white/20 bg-white/12 text-left shadow-sm backdrop-blur-md"
                  >
                    <div className="flex items-center justify-between gap-2 border-b border-white/15 px-4 py-2.5">
                      <div className="min-w-0">
                        <p className="truncate font-heading text-sm font-semibold text-white">
                          {selected.title}
                        </p>
                        <p className="text-[11px] text-white/70">
                          {SOURCE_LABEL[selected.source]} ·{' '}
                          {formatDate(selected.dateIso)}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-semibold text-white">
                        {expanded ? 'Tutup' : 'Buka'}
                      </span>
                    </div>

                    <AnimatePresence initial={false}>
                      {expanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.28, ease: 'easeOut' }}
                          className="overflow-hidden"
                        >
                          <div className="space-y-3 p-4">
                            {selected.photoUrl ? (
                              <motion.div
                                layoutId={`photo-${selected.id}`}
                                className="overflow-hidden rounded-xl"
                                initial={{ scale: 0.92, opacity: 0.7 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{
                                  type: 'spring',
                                  stiffness: 260,
                                  damping: 22,
                                }}
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={getDisplayPhotoUrl(selected.photoUrl)}
                                  alt=""
                                  className="max-h-64 w-full object-cover"
                                />
                              </motion.div>
                            ) : (
                              <div
                                className={`flex h-28 items-center justify-center rounded-xl bg-gradient-to-br text-5xl text-white ${SOURCE_TINT[selected.source]}`}
                              >
                                {selected.emoji ??
                                  (selected.source === 'milestone'
                                    ? '🏆'
                                    : selected.source === 'note'
                                      ? '📝'
                                      : selected.source === 'achievement'
                                        ? '🏅'
                                        : '✨')}
                              </div>
                            )}
                            <p className="text-sm leading-relaxed text-white/90">
                              {selected.detail}
                            </p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  )
}
