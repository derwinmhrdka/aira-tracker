'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, LayoutGroup } from 'framer-motion'
import {
  api,
  type MilkStorageLayout,
  type MilkStorageSlot,
} from '@/lib/api-client'
import {
  dedupeClientMilkSlots,
  formatMilkExpiryRemaining,
  getBottleDisplayNumber,
  getSlotMilkExpiryStatus,
  MILK_STORAGE_LAYOUT_DEFAULTS,
  type MilkExpiryStatus,
} from '@/lib/milk-storage'
import { checkMilkExpiryReminders } from '@/lib/milk-expiry-reminder'
import { MilkBottleSheet } from './milk-bottle-sheet'
import { BottleVisual, FrostVapor } from './milk-bottle-visual'
import { useAppDataSync } from '@/lib/use-app-data-sync'
import { LIVE_SYNC_MS } from '@/lib/use-live-sync'

const DRAG_THRESHOLD_PX = 10

function slotBorderClass(filled: boolean, status: MilkExpiryStatus) {
  if (!filled)
    return 'border-slate-300/80 bg-slate-200/80 dark:border-slate-600/50 dark:bg-slate-800/55'
  if (status === 'expired')
    return 'border-red-300/70 bg-red-50/90 shadow-sm dark:border-red-800/50 dark:bg-red-950/30'
  if (status === 'soon')
    return 'border-amber-300/70 bg-amber-50/90 shadow-sm dark:border-amber-700/50 dark:bg-amber-950/25'
  return 'border-slate-300/70 bg-slate-200/70 shadow-sm dark:border-slate-600/45 dark:bg-slate-800/45'
}

function slotLayoutId(slot: MilkStorageSlot): string {
  return slot.is_filled
    ? `milk-cell-${slot.slot_index}`
    : `milk-empty-${slot.slot_index}`
}

function withUniqueBottleNumbers(slots: MilkStorageSlot[]): MilkStorageSlot[] {
  return dedupeClientMilkSlots(slots)
}

function swapSlotsLocal(
  slots: MilkStorageSlot[],
  fromIndex: number,
  toIndex: number
): MilkStorageSlot[] {
  const fromSlot = slots.find((s) => s.slot_index === fromIndex)
  const toSlot = slots.find((s) => s.slot_index === toIndex)
  if (!fromSlot || !toSlot) return slots

  const swapped = slots.map((s) => {
    if (s.slot_index === fromIndex) return { ...toSlot, slot_index: fromIndex }
    if (s.slot_index === toIndex) return { ...fromSlot, slot_index: toIndex }
    return s
  })

  return swapped
}

function bottleLabel(slot: MilkStorageSlot): number {
  return getBottleDisplayNumber(slot)
}

function BottleUnit({
  slot,
  expiry,
  active,
  faded,
}: {
  slot: MilkStorageSlot
  expiry: MilkExpiryStatus
  active?: boolean
  faded?: boolean
}) {
  return (
    <div
      className={`w-full text-center transition-opacity ${faded ? 'opacity-25' : ''}`}
    >
      <p className="mb-0.5 text-[8px] font-semibold uppercase tracking-wide text-muted-foreground">
        {slot.is_filled ? `Botol ${bottleLabel(slot)}` : '\u00a0'}
      </p>
      <BottleVisual
        filled={slot.is_filled}
        amountMl={slot.amount_ml}
        expiryStatus={expiry}
        active={active}
      />
      <motion.p
        key={slot.is_filled ? `ml-${slot.amount_ml}-${slot.slot_index}` : 'empty'}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        className={`mt-1.5 text-[11px] font-bold tabular-nums ${
          slot.is_filled ? 'text-foreground' : 'text-muted-foreground'
        }`}
      >
        {slot.is_filled ? `${slot.amount_ml} ml` : 'Kosong'}
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
    </div>
  )
}

type DragState = {
  fromIndex: number
  slot: MilkStorageSlot
  startX: number
  startY: number
  x: number
  y: number
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
  const [drag, setDrag] = useState<DragState | null>(null)
  const [dropTarget, setDropTarget] = useState<number | null>(null)
  const [swapping, setSwapping] = useState(false)
  const skipClickRef = useRef(false)
  const slotsBeforeSwapRef = useRef<MilkStorageSlot[] | null>(null)
  const dragRef = useRef<DragState | null>(null)
  const swappingRef = useRef(false)

  swappingRef.current = swapping

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
      setSlots(withUniqueBottleNumbers(data.slots))
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
    slotsBeforeSwapRef.current = slots
    setSlots((prev) => swapSlotsLocal(prev, fromIndex, toIndex))
    try {
      const res = await api.swapMilkStorageSlots(fromIndex, toIndex)
      setSlots(res.slots)
      void checkMilkExpiryReminders(res.slots)
    } catch {
      if (slotsBeforeSwapRef.current) setSlots(slotsBeforeSwapRef.current)
    } finally {
      slotsBeforeSwapRef.current = null
      setSwapping(false)
      window.setTimeout(() => {
        skipClickRef.current = false
      }, 150)
    }
  }

  const resolveDropTarget = useCallback((clientX: number, clientY: number) => {
    const el = document.elementFromPoint(clientX, clientY)
    const cell = el?.closest('[data-slot-index]') as HTMLElement | null
    if (!cell) return null
    const idx = Number(cell.dataset.slotIndex)
    return Number.isFinite(idx) ? idx : null
  }, [])

  const dragDistance = drag
    ? Math.hypot(drag.x - drag.startX, drag.y - drag.startY)
    : 0
  const isDragging = drag != null && dragDistance >= DRAG_THRESHOLD_PX

  const finishDrag = useCallback(
    (clientX: number, clientY: number) => {
      const prev = dragRef.current
      dragRef.current = null
      setDrag(null)
      setDropTarget(null)
      if (!prev) return
      const dist = Math.hypot(clientX - prev.startX, clientY - prev.startY)
      const target = resolveDropTarget(clientX, clientY)
      if (dist < DRAG_THRESHOLD_PX) {
        const slotToOpen = prev.slot
        window.setTimeout(() => openSlot(slotToOpen), 0)
      } else if (
        target != null &&
        target !== prev.fromIndex &&
        !swappingRef.current
      ) {
        void handleSwap(prev.fromIndex, target)
      }
    },
    [resolveDropTarget]
  )

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!dragRef.current) return
      dragRef.current = { ...dragRef.current, x: e.clientX, y: e.clientY }
      setDrag({ ...dragRef.current })
      setDropTarget(resolveDropTarget(e.clientX, e.clientY))
    }

    const onUp = (e: PointerEvent) => {
      if (!dragRef.current) return
      finishDrag(e.clientX, e.clientY)
    }

    const onCancel = () => {
      dragRef.current = null
      setDrag(null)
      setDropTarget(null)
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onCancel)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onCancel)
    }
  }, [finishDrag, resolveDropTarget])

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

  const dragExpiry = drag ? getSlotMilkExpiryStatus(drag.slot) : 'none'

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
              <LayoutGroup>
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
                            const isSource =
                              drag?.fromIndex === slot.slot_index && isDragging
                            const isTarget = dropTarget === slot.slot_index

                            return (
                              <div
                                key={slot.slot_index}
                                data-slot-index={slot.slot_index}
                                className={`rounded-xl border px-1 py-1.5 text-center backdrop-blur-[1px] transition-shadow sm:py-2 ${slotBorderClass(slot.is_filled, expiry)} ${
                                  isTarget && isDragging
                                    ? 'ring-2 ring-primary ring-offset-1'
                                    : ''
                                }`}
                              >
                                <motion.div
                                  layout
                                  layoutId={slotLayoutId(slot)}
                                  transition={{
                                    type: 'spring',
                                    stiffness: 420,
                                    damping: 32,
                                  }}
                                >
                                  <div
                                    onPointerDown={(e) => {
                                      if (swapping || e.button !== 0) return
                                      e.currentTarget.setPointerCapture(e.pointerId)
                                      const next: DragState = {
                                        fromIndex: slot.slot_index,
                                        slot,
                                        startX: e.clientX,
                                        startY: e.clientY,
                                        x: e.clientX,
                                        y: e.clientY,
                                      }
                                      dragRef.current = next
                                      setDrag(next)
                                    }}
                                    className="touch-none select-none active:cursor-grabbing"
                                    style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
                                  >
                                    <BottleUnit
                                      slot={slot}
                                      expiry={expiry}
                                      active={
                                        selected?.slot_index === slot.slot_index &&
                                        sheetOpen
                                      }
                                      faded={isSource}
                                    />
                                  </div>
                                </motion.div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </LayoutGroup>
            )}
          </div>
        </div>
      </div>

      {isDragging &&
        drag &&
        createPortal(
          <div
            className="pointer-events-none fixed z-[100] w-[5.5rem] rounded-xl border border-primary/30 bg-card/95 px-1 py-2 shadow-[0_16px_40px_rgba(0,0,0,0.28)] ring-2 ring-primary/25 backdrop-blur-sm"
            style={{
              left: drag.x,
              top: drag.y,
              transform: 'translate(-50%, -50%) scale(1.06) rotate(-2deg)',
            }}
          >
            <BottleUnit slot={drag.slot} expiry={dragExpiry} />
          </div>,
          document.body
        )}

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
