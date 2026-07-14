'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FEED_TYPE_OPTIONS, type FeedTypeValue } from '@/lib/feed-utils'

interface QuickFeedSheetProps {
  open: boolean
  defaultType?: FeedTypeValue
  onClose: () => void
  onSave: (data: { feed_type: FeedTypeValue; amount_ml?: number }) => Promise<void>
}

export function QuickFeedSheet({
  open,
  defaultType = 'PUMPED',
  onClose,
  onSave,
}: QuickFeedSheetProps) {
  const [feedType, setFeedType] = useState<FeedTypeValue>(defaultType)
  const [amount, setAmount] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    const ml = amount ? parseInt(amount, 10) : undefined
    if (feedType === 'PUMPED' && !ml) return
    setSaving(true)
    try {
      await onSave({ feed_type: feedType, amount_ml: ml })
      setAmount('')
      setFeedType(defaultType)
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
              Catat Cepat 🍼
            </h2>
            <p className="mb-4 text-xs text-muted-foreground">
              Tanpa timer — langsung tercatat
            </p>

            <p className="mb-2 text-xs font-medium text-foreground">Tipe</p>
            <div className="mb-4 flex gap-2">
              {FEED_TYPE_OPTIONS.filter((t) => t.value !== 'DIRECT').map((t) => (
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

            <div className="mb-4">
              <label className="mb-1 block text-xs font-medium text-foreground">
                Jumlah (ml){feedType === 'PUMPED' ? '' : ' — opsional'}
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

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-xl border border-border bg-background py-3 text-sm font-semibold text-foreground"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || (feedType === 'PUMPED' && !amount)}
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
