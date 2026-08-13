'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import type { MilkStorageSlot } from '@/lib/api-client'
import {
  DEFAULT_MILK_WARN_MINUTES,
  getBottleDisplayNumber,
  getMilkReminderSettings,
  getSlotMilkExpiryStatus,
  MILK_AMOUNT_MAX_ML,
  MILK_EXPIRY_PRESETS_HOURS,
} from '@/lib/milk-storage'
import { requestNotificationPermission } from '@/lib/reminder'
import { BottleVisual, FrostVapor } from './milk-bottle-visual'
import { MilkWarnPicker } from './milk-warn-picker'
import { Chip, ScrollChipRow, splitTotalMinutes, StepperField } from './duration-picker'

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
const MAX_EXPIRY_HOURS = 168 // 7 hari

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

function durationMinutesFromExpiry(filledLocal: string, expiresLocal: string): number {
  const filled = new Date(filledLocal)
  const exp = new Date(expiresLocal)
  if (Number.isNaN(filled.getTime()) || Number.isNaN(exp.getTime())) return 24 * 60
  return Math.max(0, Math.round((exp.getTime() - filled.getTime()) / 60_000))
}

function expiresFromDuration(filledLocal: string, totalMinutes: number): string {
  const filled = new Date(filledLocal)
  if (Number.isNaN(filled.getTime())) {
    const n = new Date()
    n.setMinutes(n.getMinutes() + totalMinutes)
    return toLocalInputValue(n.toISOString())
  }
  const next = new Date(filled)
  next.setMinutes(next.getMinutes() + totalMinutes)
  return toLocalInputValue(next.toISOString())
}

function clampExpiryMinutes(total: number): number {
  return Math.min(MAX_EXPIRY_HOURS * 60, Math.max(0, Math.round(total)))
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
  const [expiryMinutes, setExpiryMinutes] = useState(24 * 60)
  const [saving, setSaving] = useState(false)
  const [warnMinutes, setWarnMinutes] = useState(DEFAULT_MILK_WARN_MINUTES)

  const globalReminder = getMilkReminderSettings()
  const isFilled = !!slot?.is_filled

  const { hours: expiryHours, minutes: expiryMins } = splitTotalMinutes(expiryMinutes)

  const setExpiryDuration = (total: number) => {
    const clamped = clampExpiryMinutes(total)
    setExpiryMinutes(clamped)
    setExpiresAt(expiresFromDuration(filledAt, clamped))
  }

  const applyExpiryParts = (h: number, m: number) => {
    setExpiryDuration(h * 60 + m)
  }

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!open || !slot) return
    const next = clampAmount(
      slot.is_filled && slot.amount_ml != null ? slot.amount_ml : 30
    )
    setAmount(next)
    const filledLocal = toLocalInputValue(slot.filled_at)
    setFilledAt(filledLocal)
    const expLocal = slot.expires_at
      ? toLocalInputValue(slot.expires_at)
      : expiresFromDuration(filledLocal, 24 * 60)
    setExpiresAt(expLocal)
    setExpiryMinutes(durationMinutesFromExpiry(filledLocal, expLocal))
    setWarnMinutes(slot.warn_before_minutes ?? DEFAULT_MILK_WARN_MINUTES)
  }, [open, slot])

  const handleSave = async () => {
    const finalAmount = clampAmount(amount)
    if (finalAmount <= 0) return
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
        amount_ml: finalAmount,
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

            <div className="space-y-4">
              <h2 className="font-heading text-lg font-bold text-foreground">
                Botol {getBottleDisplayNumber(slot)}
              </h2>

              <div className="flex items-stretch gap-3">
                <div className="min-w-0 flex-1 space-y-3">
                  <div>
                    <p className="mb-2 text-xs font-medium text-muted-foreground">
                      Jumlah
                    </p>
                    <StepperField
                      hideLabel
                      label="ml"
                      suffix="ml"
                      value={amount}
                      min={1}
                      max={MILK_AMOUNT_MAX_ML}
                      step={AMOUNT_STEP}
                      onChange={(n) => setAmount(clampAmount(n))}
                      outerClassName="w-full"
                      inputClassName="w-full min-w-[2.5rem] max-w-[4rem] bg-transparent text-center text-base font-bold tabular-nums text-foreground outline-none"
                    />
                  </div>

                  <div>
                    <p className="mb-2 text-xs font-medium text-muted-foreground">
                      Expired
                    </p>
                    <div className="space-y-2 rounded-2xl bg-secondary/50 p-3">
                      <ScrollChipRow>
                        {MILK_EXPIRY_PRESETS_HOURS.map((p) => (
                          <Chip
                            key={p.hours}
                            active={expiryMinutes === p.hours * 60}
                            onClick={() => setExpiryDuration(p.hours * 60)}
                          >
                            +{p.label}
                          </Chip>
                        ))}
                      </ScrollChipRow>
                      <div className="flex gap-2">
                        <StepperField
                          label="jam"
                          value={expiryHours}
                          min={0}
                          max={MAX_EXPIRY_HOURS}
                          onChange={(h) => applyExpiryParts(h, expiryMins)}
                        />
                        <StepperField
                          label="menit"
                          value={expiryMins}
                          min={0}
                          max={59}
                          step={5}
                          onChange={(m) => applyExpiryParts(expiryHours, m)}
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <p className="mb-2 text-xs font-medium text-muted-foreground">
                      Reminder
                    </p>
                    <MilkWarnPicker totalMinutes={warnMinutes} onChange={setWarnMinutes} />
                  </div>
                </div>

                <div className="relative flex w-[5.75rem] shrink-0 flex-col items-center justify-center overflow-hidden rounded-2xl border border-sky-200/60 bg-gradient-to-b from-sky-50/90 to-sky-100/40 px-2 py-3 dark:border-sky-800/40 dark:from-sky-950/40 dark:to-sky-900/20 sm:w-[6.25rem]">
                  <FrostVapor />
                  <div className="relative z-[1] flex flex-col items-center gap-1">
                    <BottleVisual
                      filled={amount > 0}
                      amountMl={amount > 0 ? amount : null}
                      active
                      expiryStatus={expiryStatus}
                      size="lg"
                    />
                    <p className="text-[10px] font-bold tabular-nums text-foreground">
                      {amount} ml
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                {isFilled && (
                  <button
                    type="button"
                    disabled={saving}
                    onClick={handleClear}
                    className="flex-1 rounded-xl bg-background py-3 text-sm font-semibold text-foreground ring-1 ring-border disabled:opacity-50"
                  >
                    Habis
                  </button>
                )}
                <button
                  type="button"
                  disabled={saving}
                  onClick={onClose}
                  className="flex-1 rounded-xl bg-background py-3 text-sm font-semibold text-foreground ring-1 ring-border disabled:opacity-50"
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
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  )
}
