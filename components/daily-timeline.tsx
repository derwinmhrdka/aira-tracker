'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { api, type TimelineResponse, type TimelineEvent } from '@/lib/api-client'
import { AppIcon } from './app-icon'
import { ErrorBanner } from './error-banner'
import { useAppDataSync } from '@/lib/use-app-data-sync'

const PX_PER_HOUR = 56
const TRACK_WIDTH = PX_PER_HOUR * 24
const LANE_H = 32
const HEADER_H = 28
const ACTION_GUTTER = 28

const LANES: {
  kind: TimelineEvent['kind']
  barClass: string
}[] = [
  { kind: 'sleep', barClass: 'bg-violet-400/80 dark:bg-violet-500/70' },
  { kind: 'feeding', barClass: 'bg-orange-400/80 dark:bg-orange-500/70' },
  { kind: 'pup', barClass: 'bg-amber-400/80 dark:bg-amber-500/70' },
  { kind: 'pee', barClass: 'bg-sky-400/80 dark:bg-sky-500/70' },
  { kind: 'change', barClass: 'bg-teal-400/80 dark:bg-teal-500/70' },
  { kind: 'mood', barClass: 'bg-pink-400/80 dark:bg-pink-500/70' },
]

function formatHour(h: number) {
  return `${String(h).padStart(2, '0')}:00`
}

function formatMin(min: number) {
  const h = Math.floor(min / 60)
  const m = min % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function leftPx(min: number) {
  return (min / 60) * PX_PER_HOUR
}

function widthPx(startMin: number, endMin: number) {
  return Math.max(6, ((endMin - startMin) / 60) * PX_PER_HOUR)
}

export function DailyTimeline() {
  const [data, setData] = useState<TimelineResponse | null>(null)
  const [date, setDate] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [selected, setSelected] = useState<TimelineEvent | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const touchStartX = useRef<number | null>(null)

  const load = useCallback(async (targetDate?: string, opts?: { silent?: boolean }) => {
    if (!opts?.silent) {
      setLoading(true)
      setError(false)
    }
    try {
      const res = await api.getTimeline(targetDate)
      setData(res)
      setDate(res.date)
      setSelected(null)
    } catch {
      if (!opts?.silent) setError(true)
    } finally {
      if (!opts?.silent) setLoading(false)
    }
  }, [])

  useAppDataSync(() => {
    if (date) load(date, { silent: true })
  })

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (!data || !scrollRef.current) return
    const focusMin = data.now_min ?? data.events[0]?.start_min ?? 8 * 60
    const target = leftPx(focusMin) - scrollRef.current.clientWidth / 3
    scrollRef.current.scrollLeft = Math.max(0, target)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.date])

  const goPrev = () => {
    if (data?.prev_date) load(data.prev_date)
  }

  const goNext = () => {
    if (data?.next_date) load(data.next_date)
  }

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.changedTouches[0]?.clientX ?? null
  }

  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current == null) return
    const dx = (e.changedTouches[0]?.clientX ?? 0) - touchStartX.current
    touchStartX.current = null
    if (Math.abs(dx) < 80) return
    if (dx > 0) goPrev()
    else goNext()
  }

  const trackHeight = HEADER_H + LANE_H * LANES.length

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="font-heading font-semibold text-foreground">
          Timeline Harian
        </h2>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={goPrev}
            disabled={!data?.prev_date || loading}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-foreground disabled:opacity-40"
            aria-label="Hari sebelumnya"
          >
            <AppIcon icon={ChevronLeft} size={18} />
          </button>
          <button
            type="button"
            onClick={goNext}
            disabled={!data?.next_date || loading}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-foreground disabled:opacity-40"
            aria-label="Hari berikutnya"
          >
            <AppIcon icon={ChevronRight} size={18} />
          </button>
        </div>
      </div>

      <p
        className="mb-3 touch-pan-y text-center text-sm font-medium text-foreground"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {data?.label ?? '—'}
        {data?.is_today ? (
          <span className="ml-1 text-xs text-primary">(hari ini)</span>
        ) : null}
      </p>

      {error ? (
        <ErrorBanner message="Gagal memuat timeline" onRetry={() => load(date ?? undefined)} />
      ) : loading && !data ? (
        <div className="h-48 animate-pulse rounded-lg bg-secondary" />
      ) : (
        <div className="space-y-2">
          <div className="flex overflow-hidden rounded-xl border border-border/60 bg-secondary/30">
            <div
              className="relative shrink-0 border-r border-border/50 bg-card/60"
              style={{ width: ACTION_GUTTER, height: trackHeight }}
            >
              <span
                className="absolute left-1/2 top-1/2 text-[10px] font-semibold tracking-wide text-muted-foreground"
                style={{ transform: 'translate(-50%, -50%) rotate(-90deg)' }}
              >
                Action
              </span>
            </div>

            <div
              ref={scrollRef}
              className="min-w-0 flex-1 overflow-x-auto overscroll-x-contain"
            >
              <div className="relative" style={{ width: TRACK_WIDTH, height: trackHeight }}>
                <div
                  className="sticky top-0 z-10 border-b border-border/50 bg-card/90 backdrop-blur-sm"
                  style={{ height: HEADER_H }}
                >
                  {Array.from({ length: 25 }, (_, h) => (
                    <div
                      key={h}
                      className="absolute top-0 flex items-end pb-1 text-[9px] text-muted-foreground"
                      style={{
                        left: leftPx(h * 60),
                        height: HEADER_H,
                        transform: 'translateX(-50%)',
                      }}
                    >
                      {h < 24 ? formatHour(h) : '24:00'}
                    </div>
                  ))}
                </div>

                {Array.from({ length: 25 }, (_, h) => (
                  <div
                    key={`line-${h}`}
                    className="absolute bottom-0 w-px bg-border/40"
                    style={{ left: leftPx(h * 60), top: HEADER_H }}
                  />
                ))}

                {data?.now_min != null && (
                  <div
                    className="absolute bottom-0 z-20 w-0.5 bg-primary"
                    style={{ left: leftPx(data.now_min), top: HEADER_H }}
                  >
                    <span className="absolute -top-0.5 left-1/2 -translate-x-1/2 rounded bg-primary px-1 text-[8px] text-primary-foreground">
                      now
                    </span>
                  </div>
                )}

                {LANES.map((lane, laneIdx) => {
                  const laneEvents = (data?.events ?? []).filter(
                    (e) => e.kind === lane.kind
                  )
                  const top = HEADER_H + laneIdx * LANE_H
                  return (
                    <div
                      key={lane.kind}
                      className="absolute left-0 right-0 border-b border-border/20 last:border-b-0"
                      style={{ top, height: LANE_H }}
                    >
                      {laneEvents.map((ev) => {
                        if (ev.end_min != null) {
                          return (
                            <motion.button
                              key={ev.id}
                              type="button"
                              whileTap={{ scale: 0.98 }}
                              onClick={() => setSelected(ev)}
                              className={`absolute top-1.5 h-5 rounded-md ${lane.barClass} ${
                                selected?.id === ev.id ? 'ring-2 ring-primary' : ''
                              }`}
                              style={{
                                left: leftPx(ev.start_min),
                                width: widthPx(ev.start_min, ev.end_min),
                              }}
                              title={`${ev.label} ${formatMin(ev.start_min)}–${formatMin(ev.end_min)}`}
                            >
                              <span className="block truncate px-1 text-left text-[9px] leading-5 text-white">
                                {ev.emoji} {formatMin(ev.start_min)}
                              </span>
                            </motion.button>
                          )
                        }
                        return (
                          <motion.button
                            key={ev.id}
                            type="button"
                            whileTap={{ scale: 0.9 }}
                            onClick={() => setSelected(ev)}
                            className={`absolute top-1 flex h-6 w-6 -translate-x-1/2 items-center justify-center rounded-full bg-card text-sm shadow-sm ring-1 ring-border ${
                              selected?.id === ev.id ? 'ring-2 ring-primary' : ''
                            }`}
                            style={{ left: leftPx(ev.start_min) }}
                            title={`${ev.label} ${formatMin(ev.start_min)}`}
                          >
                            {ev.emoji}
                          </motion.button>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {selected ? (
            <div className="rounded-lg bg-secondary/70 px-3 py-2 text-xs text-foreground">
              <span className="mr-1 text-base">{selected.emoji}</span>
              <span className="font-semibold capitalize">{selected.label}</span>
              <span className="text-muted-foreground">
                {' · '}
                {formatMin(selected.start_min)}
                {selected.end_min != null ? ` – ${formatMin(selected.end_min)}` : ''}
                {selected.ongoing ? ' (berlangsung)' : ''}
              </span>
            </div>
          ) : (data?.events.length ?? 0) === 0 ? (
            <p className="py-2 text-center text-xs text-muted-foreground">
              Belum ada aktivitas
            </p>
          ) : null}
        </div>
      )}
    </div>
  )
}
