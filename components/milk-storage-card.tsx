'use client'

import { useCallback, useEffect, useId, useState } from 'react'
import { motion } from 'framer-motion'
import {
  api,
  type MilkStorageLayout,
  type MilkStorageSlot,
} from '@/lib/api-client'
import {
  formatMilkExpiryRemaining,
  getMilkExpiryStatus,
  MILK_BOTTLE_MAX_ML,
  MILK_EXPIRY_WARN_HOURS,
  MILK_STORAGE_LAYOUT_DEFAULTS,
  type MilkExpiryStatus,
} from '@/lib/milk-storage'
import { checkMilkExpiryReminders } from '@/lib/milk-expiry-reminder'
import { MilkBottleSheet } from './milk-bottle-sheet'
import { useAppDataSync } from '@/lib/use-app-data-sync'
import { LIVE_SYNC_MS } from '@/lib/use-live-sync'

const SCALE_MARKS = [60, 120, 180, 240] as const

const BOTTLE_BODY =
  'M13 10 L13 8 L15 4 L25 4 L27 8 L27 10 L31 13 L31 64 C31 71 26 76 20 76 C14 76 9 71 9 64 L9 13 Z'

function FrostVapor() {
  const puffs = [
    { left: '8%', delay: 0, w: 28 },
    { left: '32%', delay: 1.2, w: 22 },
    { left: '58%', delay: 0.6, w: 26 },
    { left: '78%', delay: 1.8, w: 20 },
    { left: '45%', delay: 2.4, w: 18 },
  ]

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {puffs.map((p, i) => (
        <motion.div
          key={i}
          className="absolute bottom-2 rounded-full bg-sky-200/40 blur-md dark:bg-sky-400/10"
          style={{ left: p.left, width: p.w, height: p.w * 0.55 }}
          initial={{ opacity: 0, y: 8, scale: 0.85 }}
          animate={{
            opacity: [0, 0.45, 0.25, 0],
            y: [8, -18, -36, -52],
            scale: [0.85, 1, 1.15, 1.25],
          }}
          transition={{
            duration: 5.5,
            repeat: Infinity,
            ease: 'easeOut',
            delay: p.delay,
          }}
        />
      ))}
    </div>
  )
}

function BottleVisual({
  filled,
  amountMl,
  active,
  expiryStatus,
}: {
  filled: boolean
  amountMl: number | null
  active?: boolean
  expiryStatus: MilkExpiryStatus
}) {
  const clipId = useId().replace(/:/g, '')
  const ml = filled && amountMl != null ? amountMl : 0
  const ratio = Math.min(1, Math.max(0, ml / MILK_BOTTLE_MAX_ML))
  const fillPct = Math.max(8, ratio * 88)
  const fillTop = 76 - (fillPct / 100) * 58

  const glassStroke =
    expiryStatus === 'expired'
      ? '#dc2626'
      : expiryStatus === 'soon'
        ? '#d97706'
        : '#334155'

  return (
    <motion.div
      className="relative mx-auto h-[5rem] w-[2.75rem] sm:h-[5.75rem] sm:w-[3.1rem]"
      animate={filled ? { y: [0, -1.5, 0] } : { y: 0 }}
      transition={
        filled
          ? { duration: 2.4, repeat: Infinity, ease: 'easeInOut' }
          : { duration: 0.2 }
      }
      whileHover={{ scale: 1.04 }}
      style={active ? { scale: 1.06 } : undefined}
    >
      <svg
        viewBox="0 0 40 80"
        className="h-full w-full"
        shapeRendering="geometricPrecision"
        aria-hidden
      >
        <defs>
          <clipPath id={`bottle-clip-${clipId}`}>
            <rect x="8" y={fillTop} width="24" height={76 - fillTop} />
          </clipPath>
          <linearGradient id={`milkGrad-${clipId}`} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#e2e8f0" />
            <stop offset="100%" stopColor="#ffffff" />
          </linearGradient>
        </defs>

        {/* Cap */}
        <rect
          x="15"
          y="0"
          width="10"
          height="4"
          rx="0.5"
          fill="#cbd5e1"
          stroke={glassStroke}
          strokeWidth="1.5"
        />

        {/* Body fill */}
        <path d={BOTTLE_BODY} fill="#f1f5f9" stroke="none" />

        {/* Milk */}
        {filled && ml > 0 && (
          <g clipPath={`url(#bottle-clip-${clipId})`}>
            <path d={BOTTLE_BODY} fill={`url(#milkGrad-${clipId})`} stroke="none" />
            <ellipse
              cx="20"
              cy={fillTop}
              rx="9"
              ry="2"
              fill="rgba(255,255,255,0.9)"
            />
          </g>
        )}

        {/* Body outline — drawn last for crisp edge */}
        <path
          d={BOTTLE_BODY}
          fill="none"
          stroke={glassStroke}
          strokeWidth="2.25"
          strokeLinejoin="miter"
          strokeLinecap="square"
          vectorEffect="non-scaling-stroke"
        />

        {/* Scale marks */}
        {SCALE_MARKS.map((mark, i) => {
          const y = 68 - (mark / MILK_BOTTLE_MAX_ML) * 52
          return (
            <g key={mark}>
              <line
                x1="27"
                y1={y}
                x2="30"
                y2={y}
                stroke="#64748b"
                strokeWidth="1.2"
                strokeLinecap="square"
              />
              {i % 2 === 0 && (
                <text
                  x="10"
                  y={y + 2.5}
                  fontSize="4.5"
                  fill="#475569"
                  fontWeight="700"
                >
                  {mark}
                </text>
              )}
            </g>
          )
        })}
      </svg>
    </motion.div>
  )
}

function slotBorderClass(filled: boolean, status: MilkExpiryStatus) {
  if (!filled)
    return 'border-slate-300/80 bg-slate-200/80 dark:border-slate-600/50 dark:bg-slate-800/55'
  if (status === 'expired')
    return 'border-red-300/70 bg-red-50/90 shadow-sm dark:border-red-800/50 dark:bg-red-950/30'
  if (status === 'soon')
    return 'border-amber-300/70 bg-amber-50/90 shadow-sm dark:border-amber-700/50 dark:bg-amber-950/25'
  return 'border-slate-300/70 bg-slate-200/70 shadow-sm dark:border-slate-600/45 dark:bg-slate-800/45'
}

export function MilkStorageCard() {
  const [layout, setLayout] = useState<MilkStorageLayout>(
    MILK_STORAGE_LAYOUT_DEFAULTS
  )
  const [slots, setSlots] = useState<MilkStorageSlot[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<MilkStorageSlot | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [, setTick] = useState(0)

  useEffect(() => {
    const hasExpiry = slots.some((s) => s.is_filled && s.expires_at)
    if (!hasExpiry) return
    const id = window.setInterval(() => setTick((t) => t + 1), 30_000)
    return () => window.clearInterval(id)
  }, [slots])

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true)
    try {
      const data = await api.getMilkStorage()
      setLayout(data.layout)
      setSlots(data.slots)
      void checkMilkExpiryReminders(data.slots, MILK_EXPIRY_WARN_HOURS)
    } catch {
      /* keep previous */
    } finally {
      if (!opts?.silent) setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useAppDataSync(() => load({ silent: true }), { intervalMs: LIVE_SYNC_MS })

  useEffect(() => {
    const id = window.setInterval(() => {
      void checkMilkExpiryReminders(slots, MILK_EXPIRY_WARN_HOURS)
    }, 60_000)
    return () => window.clearInterval(id)
  }, [slots])

  const openSlot = (slot: MilkStorageSlot) => {
    setSelected(slot)
    setSheetOpen(true)
  }

  const handleSave = async (data: {
    amount_ml: number
    filled_at: string
    expires_at: string | null
  }) => {
    if (!selected) return
    const res = await api.upsertMilkStorageSlot({
      slot_index: selected.slot_index,
      amount_ml: data.amount_ml,
      filled_at: data.filled_at,
      expires_at: data.expires_at,
    })
    setSlots((prev) =>
      prev.map((s) => (s.slot_index === res.slot.slot_index ? res.slot : s))
    )
    void checkMilkExpiryReminders(
      slots.map((s) =>
        s.slot_index === res.slot.slot_index ? res.slot : s
      ),
      MILK_EXPIRY_WARN_HOURS
    )
  }

  const handleClear = async () => {
    if (!selected) return
    const res = await api.clearMilkStorageSlot(selected.slot_index)
    setSlots((prev) =>
      prev.map((s) => (s.slot_index === res.slot.slot_index ? res.slot : s))
    )
  }

  const gridStyle = {
    gridTemplateColumns: `repeat(${layout.cols}, minmax(0, 1fr))`,
  }

  const totalSlots = layout.rows * layout.cols
  const emptySlots = slots.filter((s) => !s.is_filled).length

  return (
    <>
      <div className="relative mb-4 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="flex items-center justify-between gap-2 border-b border-border bg-secondary/50 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <span className="text-base" aria-hidden>
              ❄️
            </span>
            <h2 className="font-heading text-sm font-bold tracking-wide text-foreground">
              Milk Storage
            </h2>
          </div>
          <span className="text-[10px] font-medium tabular-nums text-muted-foreground">
            Available : {emptySlots}/{totalSlots}
          </span>
        </div>

        <div className="relative max-h-[min(22rem,52vh)] overflow-y-auto overscroll-contain bg-gradient-to-b from-sky-50/40 to-card px-3 py-3 dark:from-sky-950/15 sm:max-h-none sm:overflow-visible sm:py-4">
          <FrostVapor />

          <div className="relative z-[1]">
            {loading && slots.length === 0 ? (
              <div className="grid gap-3" style={gridStyle}>
                {Array.from({ length: totalSlots }).map((_, i) => (
                  <div
                    key={i}
                    className="h-32 animate-pulse rounded-xl bg-secondary"
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {Array.from({ length: layout.rows }).map((_, rowIdx) => {
                  const rowSlots = slots.slice(
                    rowIdx * layout.cols,
                    rowIdx * layout.cols + layout.cols
                  )
                  return (
                    <div key={rowIdx} className="relative">
                      <div
                        aria-hidden
                        className="absolute inset-x-1 bottom-1 h-1.5 rounded-sm bg-border/60"
                      />

                      <div className="relative grid gap-2 pb-3" style={gridStyle}>
                        {rowSlots.map((slot) => {
                          const expiry = getMilkExpiryStatus(slot.expires_at)
                          return (
                            <motion.button
                              key={slot.slot_index}
                              type="button"
                              whileTap={{ scale: 0.96 }}
                              onClick={() => openSlot(slot)}
                              className={`rounded-xl border px-1 py-1.5 text-center backdrop-blur-[1px] transition-colors sm:py-2 ${slotBorderClass(slot.is_filled, expiry)}`}
                            >
                              <p className="mb-0.5 text-[8px] font-semibold uppercase tracking-wide text-muted-foreground">
                                Bottle {slot.slot_index + 1}
                              </p>
                              <BottleVisual
                                filled={slot.is_filled}
                                amountMl={slot.amount_ml}
                                expiryStatus={expiry}
                                active={
                                  selected?.slot_index === slot.slot_index &&
                                  sheetOpen
                                }
                              />
                              <motion.p
                                key={
                                  slot.is_filled ? `ml-${slot.amount_ml}` : 'empty'
                                }
                                initial={{ opacity: 0, y: 4 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={`mt-1.5 text-[11px] font-bold tabular-nums ${
                                  slot.is_filled
                                    ? 'text-foreground'
                                    : 'text-muted-foreground'
                                }`}
                              >
                                {slot.is_filled
                                  ? `${slot.amount_ml} ml`
                                  : 'Kosong'}
                              </motion.p>
                              {slot.is_filled && slot.expires_at && (
                                <p
                                  className={`mt-0.5 line-clamp-1 text-[9px] font-semibold tabular-nums ${
                                    expiry === 'expired'
                                      ? 'text-red-600 dark:text-red-400'
                                      : expiry === 'soon'
                                        ? 'text-amber-700 dark:text-amber-300'
                                        : 'text-muted-foreground'
                                  }`}
                                >
                                  {expiry === 'expired'
                                    ? 'Kadaluarsa'
                                    : formatMilkExpiryRemaining(slot.expires_at)}
                                </p>
                              )}
                            </motion.button>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <MilkBottleSheet
        open={sheetOpen}
        slot={selected}
        onClose={() => setSheetOpen(false)}
        onSave={handleSave}
        onClear={handleClear}
      />
    </>
  )
}
