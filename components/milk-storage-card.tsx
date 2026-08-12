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

const BOTTLE_PATH =
  'M14 2h12l2 6 4 4v18c0 2-1 3.5-2.5 4.5v2c0 1.2-.8 2.2-2 2.5v1.5c0 4.5-3.5 8-8 8s-8-3.5-8-8v-1.5c-1.2-.3-2-1.3-2-2.5v-2C10.5 33.5 9.5 32 9.5 30V12l4-4 2-6z'

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
          className="absolute bottom-2 rounded-full bg-white/25 blur-md dark:bg-cyan-200/15"
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

  const glassStroke =
    expiryStatus === 'expired'
      ? '#f87171'
      : expiryStatus === 'soon'
        ? '#fbbf24'
        : 'rgba(148,163,184,0.85)'

  return (
    <motion.div
      className="relative mx-auto h-[4.75rem] w-[2.6rem] sm:h-[5.5rem] sm:w-[3rem]"
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
        className="h-full w-full drop-shadow-sm"
        aria-hidden
      >
        <defs>
          <clipPath id={`bottle-clip-${clipId}`}>
            <rect x="6" y={80 - (fillPct / 100) * 68} width="28" height={(fillPct / 100) * 68} />
          </clipPath>
          <linearGradient id="glassGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="rgba(255,255,255,0.08)" />
            <stop offset="35%" stopColor="rgba(255,255,255,0.22)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.04)" />
          </linearGradient>
          <linearGradient id="milkGrad" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#e7e5e4" />
            <stop offset="55%" stopColor="#fafaf9" />
            <stop offset="100%" stopColor="#ffffff" />
          </linearGradient>
        </defs>

        {/* Bottle body outline with waist indent */}
        <path
          d={BOTTLE_PATH}
          fill="url(#glassGrad)"
          stroke={glassStroke}
          strokeWidth="1.4"
          strokeLinejoin="round"
        />

        {/* Grip indent / lekukan */}
        <ellipse
          cx="20"
          cy="44"
          rx="9.5"
          ry="2.2"
          fill="none"
          stroke="rgba(100,116,139,0.35)"
          strokeWidth="1"
        />
        <path
          d="M11 44 Q20 40.5 29 44"
          fill="none"
          stroke="rgba(255,255,255,0.12)"
          strokeWidth="0.8"
        />
        <path
          d="M11 46.5 Q20 50 29 46.5"
          fill="none"
          stroke="rgba(15,23,42,0.12)"
          strokeWidth="0.8"
        />

        {/* Milk fill */}
        {filled && ml > 0 && (
          <g clipPath={`url(#bottle-clip-${clipId})`}>
            <path d={BOTTLE_PATH} fill="url(#milkGrad)" />
            <ellipse
              cx="20"
              cy={80 - (fillPct / 100) * 68}
              rx="10"
              ry="2.5"
              fill="rgba(255,255,255,0.85)"
            />
          </g>
        )}

        {/* Highlight */}
        <path
          d="M13 14 L13 68"
          stroke="rgba(255,255,255,0.35)"
          strokeWidth="1.2"
          strokeLinecap="round"
        />

        {/* Scale marks inside */}
        {SCALE_MARKS.map((mark, i) => {
          const y = 68 - (mark / MILK_BOTTLE_MAX_ML) * 52
          return (
            <g key={mark}>
              <line
                x1="28"
                y1={y}
                x2="31"
                y2={y}
                stroke="rgba(100,116,139,0.45)"
                strokeWidth="0.8"
              />
              {i % 2 === 0 && (
                <text
                  x="6"
                  y={y + 2}
                  fontSize="4"
                  fill="rgba(100,116,139,0.7)"
                  fontWeight="600"
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
    return 'border-slate-400/25 bg-slate-700/20 dark:border-slate-500/30 dark:bg-slate-900/40'
  if (status === 'expired')
    return 'border-red-400/50 bg-red-950/30 shadow-sm dark:border-red-700/50'
  if (status === 'soon')
    return 'border-amber-400/45 bg-amber-950/25 shadow-sm dark:border-amber-600/45'
  return 'border-slate-400/30 bg-slate-800/25 shadow-sm dark:border-slate-500/35'
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
      <div className="relative mb-4 overflow-hidden rounded-2xl border border-slate-600/40 shadow-[0_12px_40px_-20px_rgba(15,23,42,0.55)] dark:border-slate-500/30">
        <div className="flex items-center justify-between gap-2 border-b border-slate-600/30 bg-gradient-to-r from-slate-700 via-slate-600 to-slate-700 px-4 py-2.5 dark:from-slate-800 dark:via-slate-700 dark:to-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-base" aria-hidden>
              ❄️
            </span>
            <h2 className="font-heading text-sm font-bold tracking-wide text-slate-100">
              Milk Storage
            </h2>
          </div>
          <span className="text-[10px] font-medium tabular-nums text-slate-300/90">
            Available : {emptySlots}/{totalSlots}
          </span>
        </div>

        <div className="relative max-h-[min(22rem,52vh)] overflow-y-auto overscroll-contain px-3 py-3 sm:max-h-none sm:overflow-visible sm:py-4">
          {/* Dark freezer interior — contrasts with white milk */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'linear-gradient(180deg, #334155 0%, #1e293b 42%, #0f172a 100%)',
            }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-30"
            style={{
              backgroundImage: `
                radial-gradient(circle at 15% 20%, rgba(255,255,255,0.12) 0 1px, transparent 2px),
                radial-gradient(circle at 72% 35%, rgba(255,255,255,0.1) 0 1px, transparent 2px),
                radial-gradient(circle at 40% 68%, rgba(255,255,255,0.08) 0 1.5px, transparent 2.5px),
                radial-gradient(circle at 85% 75%, rgba(255,255,255,0.09) 0 1px, transparent 2px)
              `,
            }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-0 w-4 bg-gradient-to-r from-black/25 to-transparent"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 right-0 w-4 bg-gradient-to-l from-black/25 to-transparent"
          />
          <FrostVapor />

          <div className="relative z-[1]">
            {loading && slots.length === 0 ? (
              <div className="grid gap-3" style={gridStyle}>
                {Array.from({ length: totalSlots }).map((_, i) => (
                  <div
                    key={i}
                    className="h-32 animate-pulse rounded-xl bg-slate-600/30"
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
                        className="absolute inset-x-1 bottom-1 h-2 rounded-sm border border-slate-500/50 bg-gradient-to-b from-slate-600/80 to-slate-700/90 shadow-sm"
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
                              <p className="mb-0.5 text-[8px] font-semibold uppercase tracking-wide text-slate-400/90">
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
                                    ? 'text-slate-100'
                                    : 'text-slate-400'
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
                                      ? 'text-red-400'
                                      : expiry === 'soon'
                                        ? 'text-amber-300'
                                        : 'text-slate-400'
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
