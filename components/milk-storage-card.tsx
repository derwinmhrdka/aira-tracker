'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import {
  api,
  type MilkStorageLayout,
  type MilkStorageSlot,
} from '@/lib/api-client'
import {
  formatMilkExpiryRemaining,
  getSlotMilkExpiryStatus,
  MILK_STORAGE_LAYOUT_DEFAULTS,
  type MilkExpiryStatus,
} from '@/lib/milk-storage'
import { checkMilkExpiryReminders } from '@/lib/milk-expiry-reminder'
import { MilkBottleSheet } from './milk-bottle-sheet'
import { BottleVisual, FrostVapor } from './milk-bottle-visual'
import { useAppDataSync } from '@/lib/use-app-data-sync'
import { LIVE_SYNC_MS } from '@/lib/use-live-sync'

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
  const [, setMilkReminderRev] = useState(0)
  const [dragFrom, setDragFrom] = useState<number | null>(null)
  const [dropTarget, setDropTarget] = useState<number | null>(null)
  const [swapping, setSwapping] = useState(false)
  const skipClickRef = useRef(false)

  useEffect(() => {
    const onSettingsChange = () => setMilkReminderRev((v) => v + 1)
    window.addEventListener('milk-reminder-settings-changed', onSettingsChange)
    return () =>
      window.removeEventListener('milk-reminder-settings-changed', onSettingsChange)
  }, [])

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
      void checkMilkExpiryReminders(data.slots)
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
      void checkMilkExpiryReminders(slots)
    }, 60_000)
    return () => window.clearInterval(id)
  }, [slots])

  const openSlot = (slot: MilkStorageSlot) => {
    if (skipClickRef.current) return
    setSelected(slot)
    setSheetOpen(true)
  }

  const handleSwap = async (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex || swapping) return
    setSwapping(true)
    skipClickRef.current = true
    try {
      const res = await api.swapMilkStorageSlots(fromIndex, toIndex)
      setSlots(res.slots)
      void checkMilkExpiryReminders(res.slots)
    } catch {
      /* keep previous */
    } finally {
      setSwapping(false)
      window.setTimeout(() => {
        skipClickRef.current = false
      }, 150)
    }
  }

  const handleSave = async (data: {
    amount_ml: number
    filled_at: string
    expires_at: string | null
    warn_before_minutes: number
  }) => {
    if (!selected) return
    const res = await api.upsertMilkStorageSlot({
      slot_index: selected.slot_index,
      amount_ml: data.amount_ml,
      filled_at: data.filled_at,
      expires_at: data.expires_at,
      warn_before_minutes: data.warn_before_minutes,
    })
    setSlots((prev) =>
      prev.map((s) => (s.slot_index === res.slot.slot_index ? res.slot : s))
    )
    void checkMilkExpiryReminders(
      slots.map((s) =>
        s.slot_index === res.slot.slot_index ? res.slot : s
      )
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
                          const expiry = getSlotMilkExpiryStatus(slot)
                          const isDragging = dragFrom === slot.slot_index
                          const isDropTarget = dropTarget === slot.slot_index
                          return (
                            <div
                              key={slot.slot_index}
                              onDragOver={(e) => {
                                e.preventDefault()
                                if (dragFrom != null) setDropTarget(slot.slot_index)
                              }}
                              onDragLeave={() => {
                                if (dropTarget === slot.slot_index) setDropTarget(null)
                              }}
                              onDrop={(e) => {
                                e.preventDefault()
                                if (dragFrom != null) {
                                  void handleSwap(dragFrom, slot.slot_index)
                                }
                                setDragFrom(null)
                                setDropTarget(null)
                              }}
                              className={`rounded-xl border px-1 py-1.5 text-center backdrop-blur-[1px] transition-colors sm:py-2 ${slotBorderClass(slot.is_filled, expiry)} ${
                                isDropTarget ? 'ring-2 ring-primary ring-offset-1' : ''
                              } ${isDragging ? 'opacity-40' : ''}`}
                            >
                              <div
                                draggable={!swapping}
                                onDragStart={(e) => {
                                  setDragFrom(slot.slot_index)
                                  e.dataTransfer.effectAllowed = 'move'
                                  e.dataTransfer.setData(
                                    'text/plain',
                                    String(slot.slot_index)
                                  )
                                }}
                                onDragEnd={() => {
                                  setDragFrom(null)
                                  setDropTarget(null)
                                }}
                                onClick={(e) => e.stopPropagation()}
                                className="mx-auto mb-0.5 cursor-grab touch-none select-none text-[11px] leading-none text-muted-foreground/80 active:cursor-grabbing"
                                aria-label={`Tarik botol ${slot.slot_index + 1}`}
                                title="Tarik untuk pindah"
                              >
                                ⠿
                              </div>
                              <button
                                type="button"
                                onClick={() => openSlot(slot)}
                                className="w-full text-center"
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
                              </button>
                            </div>
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
