'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FEED_TYPE_OPTIONS, type FeedTypeValue } from '@/lib/feed-utils'

const SIDES = [
  { value: 'LEFT', label: 'Kiri', emoji: '◀️' },
  { value: 'RIGHT', label: 'Kanan', emoji: '▶️' },
  { value: 'BOTH', label: 'Keduanya', emoji: '↔️' },
]

interface FeedingEndSheetProps {
  open: boolean
  onClose: () => void
  onSave: (data: {
    side?: string
    amount_ml?: number
    feed_type?: FeedTypeValue
  }) => Promise<void>
}

export function FeedingEndSheet({ open, onClose, onSave }: FeedingEndSheetProps) {
  const [feedType, setFeedType] = useState<FeedTypeValue>('DIRECT')
  const [side, setSide] = useState<string | undefined>()
  const [amount, setAmount] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSave = async (withDetails: boolean) => {
    setSaving(true)
    try {
      await onSave({
        feed_type: feedType,
        side: withDetails ? side : undefined,
        amount_ml: withDetails && amount ? parseInt(amount, 10) : undefined,
      })
      setFeedType('DIRECT')
      setSide(undefined)
      setAmount('')
      onClose()
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
            className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl border-t border-border bg-card p-4 pb-8 shadow-2xl"
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-muted" />
            <h2 className="font-heading mb-1 text-lg font-bold text-foreground">
              Selesai Menyusui 🍼
            </h2>
            <p className="mb-4 text-xs text-muted-foreground">
              Opsional — bisa langsung selesai tanpa isi
            </p>

            <p className="mb-2 text-xs font-medium text-foreground">Tipe</p>
            <div className="mb-4 flex gap-2">
              {FEED_TYPE_OPTIONS.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setFeedType(t.value)}
                  className={`flex-1 rounded-xl py-2.5 text-center text-sm font-medium transition-colors ${
                    feedType === t.value
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-foreground'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <p className="mb-2 text-xs font-medium text-foreground">Sisi</p>
            <div className="mb-4 flex gap-2">
              {SIDES.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setSide(s.value)}
                  className={`flex-1 rounded-xl py-3 text-center text-sm font-medium transition-colors ${
                    side === s.value
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-foreground'
                  }`}
                >
                  <span className="block text-lg">{s.emoji}</span>
                  {s.label}
                </button>
              ))}
            </div>

            <div className="mb-4">
              <label className="mb-1 block text-xs font-medium text-foreground">
                Jumlah (ml) — opsional
              </label>
              <input
                type="number"
                inputMode="numeric"
                placeholder="120"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full rounded-xl border border-input bg-background px-3 py-3 text-lg text-foreground"
              />
            </div>

            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => handleSave(true)}
                disabled={saving}
                className="w-full rounded-xl bg-primary py-3.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
              >
                {saving ? '...' : 'Save'}
              </button>
              <button
                type="button"
                onClick={() => handleSave(false)}
                disabled={saving}
                className="w-full rounded-xl border border-border bg-background py-3 text-sm font-semibold text-foreground"
              >
                Skip
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
