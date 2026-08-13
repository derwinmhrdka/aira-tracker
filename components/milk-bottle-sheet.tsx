'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import type { MilkStorageSlot } from '@/lib/api-client'
import {
  DEFAULT_MILK_WARN_MINUTES,
  formatMilkExpiryRemaining,
  getMilkReminderSettings,
  getSlotMilkExpiryStatus,
  MILK_EXPIRY_PRESETS_HOURS,
  MILK_WARN_PRESETS,
} from '@/lib/milk-storage'
import { requestNotificationPermission } from '@/lib/reminder'
import { BottleVisual, FrostVapor } from './milk-bottle-visual'

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

const inputClass =
  'box-border h-[46px] w-full rounded-xl border border-border bg-secondary px-3 text-sm text-foreground outline-none ring-primary focus:ring-2'

export function MilkBottleSheet({
  open,
  slot,
  onClose,
  onSave,
  onClear,
}: MilkBottleSheetProps) {
  const [mounted, setMounted] = useState(false)
  const [amount, setAmount] = useState('30')
  const [filledAt, setFilledAt] = useState(toLocalInputValue(null))
  const [expiresAt, setExpiresAt] = useState(toLocalInputValue(null))
  const [saving, setSaving] = useState(false)
  const [countdown, setCountdown] = useState('')
  const [warnMinutes, setWarnMinutes] = useState(DEFAULT_MILK_WARN_MINUTES)

  const globalReminder = getMilkReminderSettings()

  const isFilled = !!slot?.is_filled

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!open || !slot) return
    setAmount(
      slot.is_filled && slot.amount_ml != null ? String(slot.amount_ml) : '30'
    )
    const filledLocal = toLocalInputValue(slot.filled_at)
    setFilledAt(filledLocal)
    setExpiresAt(
      slot.expires_at
        ? toLocalInputValue(slot.expires_at)
        : addHoursToLocalInput(filledLocal, 24)
    )
    setWarnMinutes(slot.warn_before_minutes ?? DEFAULT_MILK_WARN_MINUTES)
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
    const ml = parseInt(amount, 10)
    if (!Number.isFinite(ml) || ml <= 0) return
    setSaving(true)
    try {
      if (expiresAt && globalReminder.enabled) {
        await requestNotificationPermission()
      }
      const local = new Date(isFilled ? slot?.filled_at ?? filledAt : filledAt)
      const filledIso = Number.isNaN(local.getTime())
        ? new Date().toISOString()
        : local.toISOString()
      let expiresIso: string | null = null
      if (expiresAt) {
        const exp = new Date(expiresAt)
        expiresIso = Number.isNaN(exp.getTime()) ? null : exp.toISOString()
      }
      await onSave({
        amount_ml: ml,
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
  const filledBase = isFilled ? toLocalInputValue(slot?.filled_at ?? null) : filledAt
  const previewMl = parseInt(amount, 10)
  const previewFilled = Number.isFinite(previewMl) && previewMl > 0

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

            <div className="flex gap-4">
              <div className="min-w-0 flex-1">
                <h2 className="font-heading text-lg font-bold text-foreground">
                  Botol {slot.slot_index + 1}
                </h2>

                <div className="mt-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="min-w-0">
                      <label className="mb-1 block text-xs font-medium text-muted-foreground">
                        Jumlah (ml)
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={2000}
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className={`${inputClass} font-semibold tabular-nums`}
                        inputMode="numeric"
                      />
                    </div>

                    <div className="min-w-0">
                      <label className="mb-1 block text-xs font-medium text-muted-foreground">
                        {isFilled ? 'Countdown' : 'Time'}
                      </label>
                      {isFilled ? (
                        <div
                          className={`box-border flex h-[46px] w-full items-center rounded-xl border border-border bg-secondary px-3 text-sm font-semibold tabular-nums ${
                            expiryStatus === 'expired'
                              ? 'text-red-600 dark:text-red-400'
                              : expiryStatus === 'soon'
                                ? 'text-amber-700 dark:text-amber-300'
                                : 'text-foreground'
                          }`}
                        >
                          {expiresAt
                            ? countdown ||
                              formatMilkExpiryRemaining(
                                new Date(expiresAt).toISOString()
                              )
                            : '—'}
                        </div>
                      ) : (
                        <input
                          type="datetime-local"
                          value={filledAt}
                          onChange={(e) => {
                            setFilledAt(e.target.value)
                            if (!slot?.expires_at) {
                              setExpiresAt(addHoursToLocalInput(e.target.value, 24))
                            }
                          }}
                          className={inputClass}
                        />
                      )}
                    </div>
                  </div>

                  <div className="min-w-0">
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                      Expired
                    </label>
                    <input
                      type="datetime-local"
                      value={expiresAt}
                      onChange={(e) => setExpiresAt(e.target.value)}
                      className={inputClass}
                    />
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {MILK_EXPIRY_PRESETS_HOURS.map((p) => (
                        <button
                          key={p.hours}
                          type="button"
                          onClick={() =>
                            setExpiresAt(addHoursToLocalInput(filledBase, p.hours))
                          }
                          className="rounded-lg bg-secondary px-2.5 py-1.5 text-[10px] font-semibold text-foreground"
                        >
                          +{p.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="min-w-0">
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                      Pengingat
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {MILK_WARN_PRESETS.map((p) => (
                        <button
                          key={p.minutes}
                          type="button"
                          onClick={() => setWarnMinutes(p.minutes)}
                          className={`rounded-lg px-2.5 py-1.5 text-[10px] font-semibold ${
                            warnMinutes === p.minutes
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-secondary text-foreground'
                          }`}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-5 flex gap-2">
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
                    disabled={saving || !amount || parseInt(amount, 10) <= 0}
                    onClick={handleSave}
                    className="flex-1 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                  >
                    {saving ? '...' : 'Simpan'}
                  </button>
                </div>
              </div>

              <div className="relative flex w-[38%] max-w-[6.5rem] shrink-0 flex-col items-center justify-center self-stretch overflow-hidden rounded-2xl border border-sky-200/60 bg-gradient-to-b from-sky-50/90 to-sky-100/40 dark:border-sky-800/40 dark:from-sky-950/40 dark:to-sky-900/20 sm:max-w-[7.5rem]">
                <FrostVapor />
                <div className="relative z-[1] flex flex-col items-center gap-2 py-3">
                  <BottleVisual
                    filled={previewFilled}
                    amountMl={previewFilled ? previewMl : null}
                    active
                    expiryStatus={expiryStatus}
                    size="lg"
                  />
                  {previewFilled && (
                    <p className="text-xs font-bold tabular-nums text-foreground">
                      {previewMl} ml
                    </p>
                  )}
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
