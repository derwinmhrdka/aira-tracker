'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import type { MilkStorageSlot } from '@/lib/api-client'
import {
  DEFAULT_MILK_WARN_MINUTES,
  formatMilkExpiryRemaining,
  getMilkReminderSettings,
  getSlotMilkExpiryStatus,
  MILK_AMOUNT_MAX_ML,
  MILK_EXPIRY_PRESETS_HOURS,
} from '@/lib/milk-storage'
import { requestNotificationPermission } from '@/lib/reminder'
import { BottleVisual, FrostVapor } from './milk-bottle-visual'
import { MilkWarnPicker } from './milk-warn-picker'

interface MilkBottleSheetProps {
  open: boolean
  slot: MilkStorageSlot | null
  onClose: () => void
  onSave: (data: {
    amount_ml: number
    filled_at: string
    expires_at: string | null
    warn_before_minutes: number
  }) => Promise<void>
  onClear: () => Promise<void>
}

const AMOUNT_STEP = 5

function toLocalInputValue(iso: string | null): string {
  const d = iso ? new Date(iso) : new Date()
  if (Number.isNaN(d.getTime())) {
    const now = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`
  }
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function addHoursToLocalInput(baseLocal: string, hours: number): string {
  const d = new Date(baseLocal)
  if (Number.isNaN(d.getTime())) {
    const n = new Date()
    n.setHours(n.getHours() + hours)
    return toLocalInputValue(n.toISOString())
  }
  d.setHours(d.getHours() + hours)
  return toLocalInputValue(d.toISOString())
}

function splitLocalDateTime(local: string): { date: string; time: string } {
  const [date = '', time = '00:00'] = local.split('T')
  return { date, time: time.slice(0, 5) }
}

function combineLocalDateTime(date: string, time: string): string {
  return `${date}T${time}`
}

function formatShort(local: string): string {
  const d = new Date(local)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('id-ID', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function ScrollChipRow({ children }: { children: ReactNode }) {
  return (
    <div className="-mx-0.5 flex gap-1.5 overflow-x-auto px-0.5 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {children}
    </div>
  )
}

function Chip({
  active,
  onClick,
  children,
}: {
  active?: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${
        active
          ? 'bg-primary text-primary-foreground'
          : 'bg-background text-foreground ring-1 ring-border'
      }`}
    >
      {children}
    </button>
  )
}

function clampAmount(ml: number): number {
  return Math.min(MILK_AMOUNT_MAX_ML, Math.max(1, ml))
}

export function MilkBottleSheet({
  open,
  slot,
  onClose,
  onSave,
  onClear,
}: MilkBottleSheetProps) {
  const [mounted, setMounted] = useState(false)
  const [amount, setAmount] = useState(30)
  const [filledAt, setFilledAt] = useState(toLocalInputValue(null))
  const [expiresAt, setExpiresAt] = useState(toLocalInputValue(null))
  const [saving, setSaving] = useState(false)
  const [countdown, setCountdown] = useState('')
  const [warnMinutes, setWarnMinutes] = useState(DEFAULT_MILK_WARN_MINUTES)
  const [manualExpiry, setManualExpiry] = useState(false)

  const globalReminder = getMilkReminderSettings()
  const isFilled = !!slot?.is_filled

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!open || !slot) return
    setAmount(
      clampAmount(
        slot.is_filled && slot.amount_ml != null ? slot.amount_ml : 30
      )
    )
    const filledLocal = toLocalInputValue(slot.filled_at)
    setFilledAt(filledLocal)
    setExpiresAt(
      slot.expires_at
        ? toLocalInputValue(slot.expires_at)
        : addHoursToLocalInput(filledLocal, 24)
    )
    setWarnMinutes(slot.warn_before_minutes ?? DEFAULT_MILK_WARN_MINUTES)
    setManualExpiry(false)
  }, [open, slot])

  useEffect(() => {
    if (!open || !expiresAt) {
      setCountdown('')
      return
    }
    const tick = () => {
      const exp = new Date(expiresAt)
      setCountdown(
        Number.isNaN(exp.getTime())
          ? ''
          : formatMilkExpiryRemaining(exp.toISOString())
      )
    }
    tick()
    const id = window.setInterval(tick, 30_000)
    return () => window.clearInterval(id)
  }, [open, expiresAt])

  const handleSave = async () => {
    if (!Number.isFinite(amount) || amount <= 0) return
    setSaving(true)
    try {
      if (expiresAt && globalReminder.enabled) {
        await requestNotificationPermission()
      }
      const local = new Date(filledAt)
      const filledIso = Number.isNaN(local.getTime())
        ? new Date().toISOString()
        : local.toISOString()
      let expiresIso: string | null = null
      if (expiresAt) {
        const exp = new Date(expiresAt)
        expiresIso = Number.isNaN(exp.getTime()) ? null : exp.toISOString()
      }
      await onSave({
        amount_ml: amount,
        filled_at: filledIso,
        expires_at: expiresIso,
        warn_before_minutes: warnMinutes,
      })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const handleClear = async () => {
    setSaving(true)
    try {
      await onClear()
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const expiryStatus = getSlotMilkExpiryStatus({
    expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
    warn_before_minutes: warnMinutes,
  })

  const expirySubtitle =
    expiresAt && countdown
      ? countdown
      : expiresAt
        ? formatMilkExpiryRemaining(new Date(expiresAt).toISOString())
        : ''

  const expiryStatusClass =
    expiryStatus === 'expired'
      ? 'text-red-600 dark:text-red-400'
      : expiryStatus === 'soon'
        ? 'text-amber-700 dark:text-amber-300'
        : 'text-muted-foreground'

  const { date: expDate, time: expTime } = splitLocalDateTime(expiresAt)

  if (!mounted) return null

  return createPortal(
    <AnimatePresence>
      {open && slot && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] bg-black/45"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 34 }}
            className="fixed inset-x-0 bottom-0 z-[71] max-h-[90vh] overflow-y-auto rounded-t-3xl border border-border bg-card p-5 shadow-2xl"
            style={{
              paddingBottom: 'calc(2rem + env(safe-area-inset-bottom, 0px))',
            }}
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-muted" />

            <div className="flex gap-3">
              <div className="min-w-0 flex-1 space-y-4">
                <h2 className="font-heading text-lg font-bold text-foreground">
                  Botol {slot.slot_index + 1}
                </h2>

                <div>
                  <p className="mb-2 text-xs font-medium text-muted-foreground">
                    Jumlah
                  </p>
                  <div className="flex items-center rounded-xl bg-secondary/50 ring-1 ring-border">
                    <button
                      type="button"
                      onClick={() =>
                        setAmount((v) => clampAmount(v - AMOUNT_STEP))
                      }
                      className="flex h-11 w-11 items-center justify-center text-lg text-muted-foreground"
                    >
                      −
                    </button>
                    <span className="flex-1 text-center text-base font-bold tabular-nums text-foreground">
                      {amount} ml
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setAmount((v) => clampAmount(v + AMOUNT_STEP))
                      }
                      className="flex h-11 w-11 items-center justify-center text-lg text-muted-foreground"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-xs font-medium text-muted-foreground">
                    Expired
                  </p>
                  <div
                    className={`rounded-2xl bg-secondary/50 p-3 ring-1 ${
                      expiryStatus === 'expired'
                        ? 'ring-red-400/50'
                        : expiryStatus === 'soon'
                          ? 'ring-amber-400/50'
                          : 'ring-border/50'
                    }`}
                  >
                    <p className="text-sm font-semibold capitalize text-foreground">
                      {formatShort(expiresAt)}
                    </p>
                    {expirySubtitle && (
                      <p className={`mt-0.5 text-xs font-semibold ${expiryStatusClass}`}>
                        {expirySubtitle}
                      </p>
                    )}
                    <ScrollChipRow>
                      {MILK_EXPIRY_PRESETS_HOURS.map((p) => (
                        <Chip
                          key={p.hours}
                          onClick={() => {
                            setExpiresAt(addHoursToLocalInput(filledAt, p.hours))
                            setManualExpiry(false)
                          }}
                        >
                          +{p.label}
                        </Chip>
                      ))}
                    </ScrollChipRow>
                    {!manualExpiry ? (
                      <button
                        type="button"
                        onClick={() => setManualExpiry(true)}
                        className="mt-2 text-[11px] font-medium text-primary"
                      >
                        Atur tanggal & jam
                      </button>
                    ) : (
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        <input
                          type="date"
                          value={expDate}
                          onChange={(e) => {
                            if (e.target.value) {
                              setExpiresAt(combineLocalDateTime(e.target.value, expTime))
                            }
                          }}
                          className="rounded-xl bg-background px-2 py-2 text-xs ring-1 ring-border"
                        />
                        <input
                          type="time"
                          value={expTime}
                          onChange={(e) => {
                            if (e.target.value) {
                              setExpiresAt(combineLocalDateTime(expDate, e.target.value))
                            }
                          }}
                          className="rounded-xl bg-background px-2 py-2 text-xs ring-1 ring-border"
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-xs font-medium text-muted-foreground">
                    Reminder
                  </p>
                  <MilkWarnPicker
                    totalMinutes={warnMinutes}
                    onChange={setWarnMinutes}
                  />
                </div>

                <div className="flex gap-2 pt-1">
                  {isFilled && (
                    <button
                      type="button"
                      disabled={saving}
                      onClick={handleClear}
                      className="flex-1 rounded-xl bg-secondary py-3 text-sm font-semibold text-foreground disabled:opacity-50"
                    >
                      Habis
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={saving}
                    onClick={onClose}
                    className="flex-1 rounded-xl bg-secondary py-3 text-sm font-semibold text-foreground disabled:opacity-50"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    disabled={saving || amount <= 0}
                    onClick={handleSave}
                    className="flex-1 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                  >
                    {saving ? '...' : 'Simpan'}
                  </button>
                </div>
              </div>

              <div className="relative flex w-[34%] max-w-[6rem] shrink-0 flex-col items-center justify-center self-stretch overflow-hidden rounded-2xl border border-sky-200/60 bg-gradient-to-b from-sky-50/90 to-sky-100/40 dark:border-sky-800/40 dark:from-sky-950/40 dark:to-sky-900/20">
                <FrostVapor />
                <div className="relative z-[1] flex flex-col items-center gap-1 py-3">
                  <BottleVisual
                    filled={amount > 0}
                    amountMl={amount > 0 ? amount : null}
                    active
                    expiryStatus={expiryStatus}
                    size="lg"
                  />
                  <p className="text-xs font-bold tabular-nums text-foreground">
                    {amount} ml
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  )
}
