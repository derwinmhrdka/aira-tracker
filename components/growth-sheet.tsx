'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { CreateGrowthInput, GrowthLog } from '@/lib/api-client'
import {
  isValidDecimal,
  parseDecimal,
  sanitizeDecimalInput,
} from '@/lib/decimal-input'

function todayStr() {
  return new Date().toISOString().split('T')[0]
}

interface GrowthSheetProps {
  open: boolean
  onClose: () => void
  onSave: (data: CreateGrowthInput) => Promise<void>
  initial?: GrowthLog | null
  mode?: 'create' | 'edit'
}

export function GrowthSheet({
  open,
  onClose,
  onSave,
  initial = null,
  mode = 'create',
}: GrowthSheetProps) {
  const [date, setDate] = useState(todayStr())
  const [weight, setWeight] = useState('')
  const [height, setHeight] = useState('')
  const [headCircumference, setHeadCircumference] = useState('')
  const [isJaundice, setIsJaundice] = useState(false)
  const [bilirubin, setBilirubin] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    if (initial && mode === 'edit') {
      setDate(initial.date)
      setWeight(String(initial.weight_kg))
      setHeight(String(initial.height_cm))
      setHeadCircumference(
        initial.head_circumference_cm != null
          ? String(initial.head_circumference_cm)
          : ''
      )
      setIsJaundice(initial.is_jaundice)
      setBilirubin(initial.bilirubin_level != null ? String(initial.bilirubin_level) : '')
      setNotes(initial.notes ?? '')
    } else {
      setDate(todayStr())
      setWeight('')
      setHeight('')
      setHeadCircumference('')
      setIsJaundice(false)
      setBilirubin('')
      setNotes('')
    }
  }, [open, initial, mode])

  const handleSave = async () => {
    const weightKg = parseDecimal(weight)
    const heightCm = parseDecimal(height)
    if (weightKg == null || heightCm == null) return
    setSaving(true)
    try {
      await onSave({
        date,
        weight_kg: weightKg,
        height_cm: heightCm,
        head_circumference_cm: headCircumference
          ? (parseDecimal(headCircumference) ?? undefined)
          : undefined,
        is_jaundice: isJaundice,
        bilirubin_level: bilirubin ? (parseDecimal(bilirubin) ?? undefined) : undefined,
        notes: notes.trim() || undefined,
      })
      onClose()
    } catch {
      // Error toast handled by parent page
    } finally {
      setSaving(false)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/40"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed bottom-0 left-0 right-0 z-50 max-h-[85vh] overflow-y-auto rounded-t-2xl border-t border-border bg-card p-4 pb-8 shadow-2xl"
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-muted" />

            <h2 className="font-heading mb-1 text-lg font-bold text-foreground">
              {mode === 'edit' ? 'Edit Pertumbuhan' : 'Catat Pertumbuhan'}
            </h2>
            <p className="mb-4 text-xs text-muted-foreground">
              Isi bulanan saat kontrol / timbang di rumah
            </p>

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-foreground">
                  Tanggal
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm text-foreground"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-foreground">
                    Berat (kg)
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="5,2"
                    value={weight}
                    onChange={(e) => setWeight(sanitizeDecimalInput(e.target.value))}
                    className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm text-foreground"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-foreground">
                    Panjang (cm)
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="58,5"
                    value={height}
                    onChange={(e) => setHeight(sanitizeDecimalInput(e.target.value))}
                    className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm text-foreground"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-foreground">
                  Lingkar kepala (cm) — opsional
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="38,5"
                  value={headCircumference}
                  onChange={(e) =>
                    setHeadCircumference(sanitizeDecimalInput(e.target.value))
                  }
                  className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm text-foreground"
                />
              </div>

              <label className="flex items-center gap-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={isJaundice}
                  onChange={(e) => setIsJaundice(e.target.checked)}
                  className="rounded"
                />
                Kuning (jaundice)
              </label>

              {isJaundice && (
                <div>
                  <label className="mb-1 block text-xs font-medium text-foreground">
                    Bilirubin (mg/dL) — opsional
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="12,5"
                    value={bilirubin}
                    onChange={(e) => setBilirubin(sanitizeDecimalInput(e.target.value))}
                    className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm text-foreground"
                  />
                </div>
              )}

              <div>
                <label className="mb-1 block text-xs font-medium text-foreground">
                  Notes (optional)
                </label>
                <input
                  type="text"
                  placeholder="Posisi bayi saat ditimbang..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm text-foreground"
                />
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-xl border border-border bg-background py-3 text-sm font-semibold text-foreground"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={!isValidDecimal(weight) || !isValidDecimal(height) || saving}
                className="flex-1 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
              >
                {saving ? '...' : 'Save'}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
