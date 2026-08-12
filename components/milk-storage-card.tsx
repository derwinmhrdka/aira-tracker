'use client'

import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  api,
  type MilkStorageLayout,
  type MilkStorageSlot,
} from '@/lib/api-client'
import {
  formatMilkTime,
  MILK_BOTTLE_MAX_ML,
  MILK_STORAGE_LAYOUT_DEFAULTS,
} from '@/lib/milk-storage'
import { MilkBottleSheet } from './milk-bottle-sheet'
import { useAppDataSync } from '@/lib/use-app-data-sync'
import { LIVE_SYNC_MS } from '@/lib/use-live-sync'

const SCALE_MARKS = [60, 120, 180, 240] as const

function BottleVisual({
  filled,
  amountMl,
  active,
}: {
  filled: boolean
  amountMl: number | null
  active?: boolean
}) {
  const ml = filled && amountMl != null ? amountMl : 0
  const ratio = Math.min(1, Math.max(0, ml / MILK_BOTTLE_MAX_ML))
  const fillPct = ratio * 100

  return (
    <motion.div
      className="relative mx-auto flex h-[6.25rem] w-[3.25rem] flex-col items-center"
      animate={filled ? { y: [0, -1.5, 0] } : { y: 0 }}
      transition={
        filled
          ? { duration: 2.4, repeat: Infinity, ease: 'easeInOut' }
          : { duration: 0.2 }
      }
      whileHover={{ scale: 1.04 }}
      style={active ? { scale: 1.06 } : undefined}
    >
      {/* Cap */}
      <div className="z-[2] h-2 w-5 rounded-t-md bg-sky-300/90 shadow-sm dark:bg-sky-500/80" />
      <div className="z-[2] h-1.5 w-6 rounded-sm bg-sky-400/90 dark:bg-sky-600/80" />

      {/* Body + scale */}
      <div className="relative mt-0.5 h-[5rem] w-11">
        {/* Scale labels (left) */}
        <div className="pointer-events-none absolute -left-0.5 top-1 bottom-2 z-[3] flex w-3.5 flex-col justify-between py-0.5">
          {[...SCALE_MARKS].reverse().map((mark) => (
            <span
              key={mark}
              className="text-[6px] font-bold leading-none tabular-nums text-sky-700/70 dark:text-sky-300/70"
            >
              {mark}
            </span>
          ))}
        </div>

        {/* Glass body */}
        <div className="absolute inset-y-0 left-3 right-0 overflow-hidden rounded-b-[1.15rem] rounded-t-md border-2 border-sky-200/90 bg-gradient-to-b from-white/50 to-sky-50/30 dark:border-sky-700 dark:from-sky-950/30 dark:to-sky-950/50">
          {/* Tick marks on inner right */}
          <div className="pointer-events-none absolute inset-y-1.5 right-0.5 z-[2] flex flex-col justify-between">
            {SCALE_MARKS.map((mark) => (
              <span
                key={mark}
                className="block h-px w-1.5 bg-sky-400/50 dark:bg-sky-500/40"
                title={`${mark} ml`}
              />
            ))}
          </div>

          {/* Milk liquid */}
          {filled && ml > 0 && (
            <motion.div
              key={`fill-${ml}`}
              initial={{ height: 0, opacity: 0.6 }}
              animate={{ height: `${Math.max(8, fillPct * 0.92)}%`, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 180, damping: 18 }}
              className="absolute inset-x-0 bottom-0 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-t from-amber-300 via-amber-100 to-amber-50/95 dark:from-amber-800 dark:via-amber-600/80 dark:to-amber-500/50" />

              {/* Wave surface */}
              <motion.div
                className="absolute -top-1 left-[-20%] h-3 w-[140%] rounded-[40%]"
                style={{
                  background:
                    'radial-gradient(ellipse at center, rgba(255,251,235,0.95) 0%, rgba(253,230,138,0.7) 55%, transparent 70%)',
                }}
                animate={{ x: ['0%', '8%', '-4%', '0%'], rotate: [0, 2, -1, 0] }}
                transition={{
                  duration: 2.8,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />
              <motion.div
                className="absolute -top-0.5 left-[-10%] h-2 w-[120%] bg-white/25"
                animate={{ x: ['0%', '-6%', '4%', '0%'] }}
                transition={{
                  duration: 2.2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  delay: 0.3,
                }}
              />

              {/* Bubbles */}
              <motion.span
                className="absolute bottom-[35%] left-[28%] h-1 w-1 rounded-full bg-white/50"
                animate={{ y: [0, -10, -18], opacity: [0.5, 0.7, 0] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeOut' }}
              />
              <motion.span
                className="absolute bottom-[22%] left-[58%] h-1.5 w-1.5 rounded-full bg-white/40"
                animate={{ y: [0, -12, -22], opacity: [0.4, 0.6, 0] }}
                transition={{
                  duration: 3.1,
                  repeat: Infinity,
                  ease: 'easeOut',
                  delay: 0.8,
                }}
              />
            </motion.div>
          )}

          {/* Empty shimmer */}
          {!filled && (
            <motion.div
              className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent"
              animate={{ x: ['-120%', '120%'] }}
              transition={{
                duration: 2.8,
                repeat: Infinity,
                ease: 'easeInOut',
                repeatDelay: 1.4,
              }}
            />
          )}

          {/* Glass shine */}
          <div className="pointer-events-none absolute inset-y-2 left-1 w-1 rounded-full bg-white/40" />
        </div>
      </div>
    </motion.div>
  )
}

export function MilkStorageCard() {
  const [layout, setLayout] = useState<MilkStorageLayout>(
    MILK_STORAGE_LAYOUT_DEFAULTS
  )
  const [slots, setSlots] = useState<MilkStorageSlot[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<MilkStorageSlot | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true)
    try {
      const data = await api.getMilkStorage()
      setLayout(data.layout)
      setSlots(data.slots)
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

  const openSlot = (slot: MilkStorageSlot) => {
    setSelected(slot)
    setSheetOpen(true)
  }

  const handleSave = async (data: { amount_ml: number; filled_at: string }) => {
    if (!selected) return
    const res = await api.upsertMilkStorageSlot({
      slot_index: selected.slot_index,
      amount_ml: data.amount_ml,
      filled_at: data.filled_at,
    })
    setSlots((prev) =>
      prev.map((s) => (s.slot_index === res.slot.slot_index ? res.slot : s))
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

  return (
    <div className="mb-4 overflow-hidden rounded-2xl border border-cyan-200/70 shadow-[0_12px_40px_-20px_rgba(14,116,144,0.45)] dark:border-cyan-800/50">
      {/* Freezer header bar */}
      <div className="flex items-center justify-between gap-2 border-b border-cyan-300/40 bg-gradient-to-r from-slate-200 via-cyan-100 to-slate-200 px-4 py-2.5 dark:border-cyan-800/40 dark:from-slate-800 dark:via-cyan-950 dark:to-slate-800">
        <div className="flex items-center gap-2">
          <span className="text-base" aria-hidden>
            ❄️
          </span>
          <div>
            <h2 className="font-heading text-sm font-bold tracking-wide text-slate-700 dark:text-cyan-100">
              Milk Storage
            </h2>
            <p className="text-[10px] font-medium text-slate-500 dark:text-cyan-300/70">
              Freezer · ASI
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-md border border-cyan-400/40 bg-cyan-50/80 px-2 py-0.5 font-mono text-[10px] font-bold tabular-nums text-cyan-800 dark:border-cyan-600/50 dark:bg-cyan-950/80 dark:text-cyan-200">
            −18°C
          </span>
          <span className="text-[10px] font-medium text-slate-500 dark:text-cyan-400/70">
            {layout.rows}×{layout.cols}
          </span>
        </div>
      </div>

      {/* Freezer interior */}
      <div
        className="relative px-3 py-4"
        style={{
          background: `
            linear-gradient(180deg, rgba(224,242,254,0.95) 0%, rgba(186,230,253,0.55) 45%, rgba(207,232,245,0.9) 100%)
          `,
        }}
      >
        {/* Dark mode override via overlay */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 hidden dark:block"
          style={{
            background:
              'linear-gradient(180deg, rgba(15,23,42,0.92) 0%, rgba(8,47,73,0.85) 50%, rgba(15,23,42,0.95) 100%)',
          }}
        />

        {/* Frost / frost speckles */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-40 mix-blend-soft-light dark:opacity-25"
          style={{
            backgroundImage: `
              radial-gradient(circle at 12% 18%, rgba(255,255,255,0.7) 0 1px, transparent 2px),
              radial-gradient(circle at 78% 32%, rgba(255,255,255,0.55) 0 1px, transparent 2px),
              radial-gradient(circle at 34% 72%, rgba(255,255,255,0.45) 0 1.5px, transparent 2.5px),
              radial-gradient(circle at 88% 78%, rgba(255,255,255,0.5) 0 1px, transparent 2px),
              radial-gradient(circle at 55% 12%, rgba(255,255,255,0.35) 0 1px, transparent 2px)
            `,
            backgroundSize: '100% 100%',
          }}
        />

        {/* Side walls glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 w-3 bg-gradient-to-r from-white/50 to-transparent dark:from-cyan-950/60"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 w-3 bg-gradient-to-l from-white/50 to-transparent dark:from-cyan-950/60"
        />

        {/* Cold mist animation */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-x-6 top-2 h-8 rounded-full bg-white/30 blur-md dark:bg-cyan-400/10"
          animate={{ opacity: [0.25, 0.5, 0.25], x: [0, 6, -4, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
        />

        <div className="relative z-[1]">
          {loading && slots.length === 0 ? (
            <div className="grid gap-3" style={gridStyle}>
              {Array.from({ length: layout.rows * layout.cols }).map((_, i) => (
                <div
                  key={i}
                  className="h-32 animate-pulse rounded-xl bg-white/40 dark:bg-slate-800/50"
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
                    {/* Wire shelf rack */}
                    <div
                      aria-hidden
                      className="absolute inset-x-1 bottom-1 h-2 rounded-sm border border-slate-300/80 bg-gradient-to-b from-slate-200/90 to-slate-300/70 shadow-sm dark:border-slate-600 dark:from-slate-700/80 dark:to-slate-800/90"
                    />
                    <div
                      aria-hidden
                      className="absolute inset-x-2 bottom-0.5 h-px bg-slate-400/40 dark:bg-slate-500/40"
                    />

                    <div className="relative grid gap-2 pb-3" style={gridStyle}>
                      {rowSlots.map((slot) => (
                        <motion.button
                          key={slot.slot_index}
                          type="button"
                          whileTap={{ scale: 0.96 }}
                          onClick={() => openSlot(slot)}
                          className={`rounded-xl border px-1 py-2 text-center backdrop-blur-[2px] transition-colors ${
                            slot.is_filled
                              ? 'border-amber-200/70 bg-white/55 shadow-sm dark:border-amber-700/40 dark:bg-slate-900/45'
                              : 'border-white/70 bg-white/35 dark:border-cyan-800/40 dark:bg-slate-900/30'
                          }`}
                        >
                          <BottleVisual
                            filled={slot.is_filled}
                            amountMl={slot.amount_ml}
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
                                ? 'text-amber-800 dark:text-amber-200'
                                : 'text-slate-500 dark:text-cyan-200/60'
                            }`}
                          >
                            {slot.is_filled ? `${slot.amount_ml} ml` : 'Kosong'}
                          </motion.p>
                          {slot.is_filled && slot.filled_at && (
                            <p className="mt-0.5 line-clamp-1 text-[9px] text-slate-500 dark:text-cyan-300/50">
                              {formatMilkTime(slot.filled_at)}
                            </p>
                          )}
                        </motion.button>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <MilkBottleSheet
        open={sheetOpen}
        slot={selected}
        onClose={() => setSheetOpen(false)}
        onSave={handleSave}
        onClear={handleClear}
      />
    </div>
  )
}
