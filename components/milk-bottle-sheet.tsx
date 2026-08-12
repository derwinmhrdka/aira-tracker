'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { MilkStorageSlot } from '@/lib/api-client'
import { MILK_EXPIRY_PRESETS_HOURS } from '@/lib/milk-storage'
import { requestNotificationPermission } from '@/lib/reminder'

interface MilkBottleSheetProps {
  open: boolean
  slot: MilkStorageSlot | null
  onClose: () => void
  onSave: (data: {
    amount_ml: number
    filled_at: string
    expires_at: string | null
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

export function MilkBottleSheet({
  open,
  slot,
  onClose,
  onSave,
  onClear,
}: MilkBottleSheetProps) {
  const [amount, setAmount] = useState('30')
  const [filledAt, setFilledAt] = useState(toLocalInputValue(null))
  const [useExpiry, setUseExpiry] = useState(false)
  const [expiresAt, setExpiresAt] = useState(toLocalInputValue(null))
  const [saving, setSaving] = useState(false)

  const isFilled = !!slot?.is_filled

  useEffect(() => {
    if (!open || !slot) return
    setAmount(
      slot.is_filled && slot.amount_ml != null ? String(slot.amount_ml) : '30'
    )
    const filledLocal = toLocalInputValue(slot.filled_at)
    setFilledAt(filledLocal)
    if (slot.expires_at) {
      setUseExpiry(true)
      setExpiresAt(toLocalInputValue(slot.expires_at))
    } else {
      setUseExpiry(false)
      setExpiresAt(addHoursToLocalInput(filledLocal, 24))
    }
  }, [open, slot])

  const handleSave = async () => {
    const ml = parseInt(amount, 10)
    if (!Number.isFinite(ml) || ml <= 0) return
    setSaving(true)
    try {
      if (useExpiry) {
        await requestNotificationPermission()
      }
      const local = new Date(filledAt)
      const filledIso = Number.isNaN(local.getTime())
        ? new Date().toISOString()
        : local.toISOString()

      let expiresIso: string | null = null
      if (useExpiry) {
        const exp = new Date(expiresAt)
        expiresIso = Number.isNaN(exp.getTime()) ? null : exp.toISOString()
      }

      await onSave({
        amount_ml: ml,
        filled_at: filledIso,
        expires_at: expiresIso,
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

  return (
    <AnimatePresence>
      {open && slot && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 34 }}
            className="fixed inset-x-0 bottom-0 z-50 max-h-[90vh] overflow-y-auto rounded-t-3xl border border-border bg-card p-5 pb-8 shadow-xl"
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-muted" />
            <h2 className="font-heading text-lg font-bold text-foreground">
              Botol {slot.slot_index + 1}
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {isFilled
                ? 'Update isi atau tandai habis'
                : 'Simpan ASI di slot ini'}
            </p>

            <label className="mt-4 block text-xs font-medium text-muted-foreground">
              Jumlah (ml)
            </label>
            <input
              type="number"
              min={1}
              max={2000}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="mt-1 w-full rounded-xl border border-border bg-secondary px-4 py-3 text-sm font-semibold text-foreground outline-none ring-primary focus:ring-2"
              inputMode="numeric"
            />

            <label className="mt-3 block text-xs font-medium text-muted-foreground">
              Waktu isi
            </label>
            <input
              type="datetime-local"
              value={filledAt}
              onChange={(e) => {
                setFilledAt(e.target.value)
                if (useExpiry && !slot?.expires_at) {
                  setExpiresAt(addHoursToLocalInput(e.target.value, 24))
                }
              }}
              className="mt-1 w-full rounded-xl border border-border bg-secondary px-4 py-3 text-sm text-foreground outline-none ring-primary focus:ring-2"
            />

            <button
              type="button"
              onClick={() => setUseExpiry((v) => !v)}
              className={`mt-4 flex w-full items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold ${
                useExpiry
                  ? 'bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-100'
                  : 'bg-secondary text-foreground'
              }`}
            >
              <span>Batas waktu (opsional)</span>
              <span>{useExpiry ? 'On' : 'Off'}</span>
            </button>

            {useExpiry && (
              <div className="mt-3 space-y-3">
                <div className="flex flex-wrap gap-2">
                  {MILK_EXPIRY_PRESETS_HOURS.map((p) => (
                    <button
                      key={p.hours}
                      type="button"
                      onClick={() =>
                        setExpiresAt(addHoursToLocalInput(filledAt, p.hours))
                      }
                      className="rounded-lg bg-secondary px-3 py-1.5 text-xs font-semibold text-foreground"
                    >
                      +{p.label}
                    </button>
                  ))}
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground">
                    Kadaluarsa
                  </label>
                  <input
                    type="datetime-local"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-border bg-secondary px-4 py-3 text-sm text-foreground outline-none ring-primary focus:ring-2"
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Reminder muncul ±6 jam sebelum batas waktu.
                </p>
              </div>
            )}

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
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
