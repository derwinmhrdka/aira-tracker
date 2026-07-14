'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FEED_TYPE_OPTIONS, type FeedTypeValue } from '@/lib/feed-utils'
import { formatDurationLabel } from '@/lib/baby-utils'

const SIDES = [
  { value: 'LEFT', label: 'Kiri', emoji: '◀️' },
  { value: 'RIGHT', label: 'Kanan', emoji: '▶️' },
  { value: 'BOTH', label: 'Keduanya', emoji: '↔️' },
]

export type SessionEndData = {
  duration_minutes: number
  side?: string
  amount_ml?: number
  feed_type?: FeedTypeValue
}

interface SessionEndSheetProps {
  open: boolean
  type: 'feeding' | 'sleep'
  startTime: string | null
  onClose: () => void
  onConfirm: (data: SessionEndData) => Promise<void>
}

function elapsedMinutes(startTime: string | null): number {
  if (!startTime) return 0
  return Math.max(0, Math.round((Date.now() - new Date(startTime).getTime()) / 60000))
}

export function SessionEndSheet({
  open,
  type,
  startTime,
  onClose,
  onConfirm,
}: SessionEndSheetProps) {
  const [hours, setHours] = useState('0')
  const [minutes, setMinutes] = useState('0')
  const [feedType, setFeedType] = useState<FeedTypeValue>('DIRECT')
  const [side, setSide] = useState<string | undefined>()
  const [amount, setAmount] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    const total = elapsedMinutes(startTime)
    setHours(String(Math.floor(total / 60)))
    setMinutes(String(total % 60))
    setFeedType('DIRECT')
    setSide(undefined)
    setAmount('')
  }, [open, startTime])

  const totalMinutes = (() => {
    const h = Math.max(0, parseInt(hours || '0', 10) || 0)
    const m = Math.max(0, Math.min(59, parseInt(minutes || '0', 10) || 0))
    return h * 60 + m
  })()

  const handleConfirm = async () => {
    setSaving(true)
    try {
      await onConfirm({
        duration_minutes: totalMinutes,
        feed_type: type === 'feeding' ? feedType : undefined,
        side: type === 'feeding' ? side : undefined,
        amount_ml:
          type === 'feeding' && amount ? parseInt(amount, 10) : undefined,
      })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const isFeed = type === 'feeding'

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
            className="fixed bottom-0 left-0 right-0 z-50 max-h-[90vh] overflow-y-auto rounded-t-2xl border-t border-border bg-card p-4 pb-8 shadow-2xl"
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-muted" />
            <h2 className="font-heading mb-1 text-lg font-bold text-foreground">
              {isFeed ? 'Selesai Menyusui 🍼' : 'Bangun ☀️'}
            </h2>
            <p className="mb-4 text-xs text-muted-foreground">
              Cek & sesuaikan durasi sebelum konfirmasi
            </p>

            <div className="mb-4 rounded-2xl bg-secondary/60 p-4">
              <p className="mb-1 text-xs font-medium text-muted-foreground">
                Durasi
              </p>
              <p className="font-heading mb-3 text-xl font-bold text-foreground">
                {formatDurationLabel(totalMinutes)}
              </p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-[10px] text-muted-foreground">
                    Jam
                  </label>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={24}
                    value={hours}
                    onChange={(e) => setHours(e.target.value)}
                    className="w-full rounded-xl border border-input bg-background px-3 py-3 text-lg text-foreground"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] text-muted-foreground">
                    Menit
                  </label>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={59}
                    value={minutes}
                    onChange={(e) => setMinutes(e.target.value)}
                    className="w-full rounded-xl border border-input bg-background px-3 py-3 text-lg text-foreground"
                  />
                </div>
              </div>
            </div>

            {isFeed && (
              <>
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
              </>
            )}

            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={handleConfirm}
                disabled={saving}
                className="w-full rounded-xl bg-primary py-3.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
              >
                {saving ? '...' : 'Konfirmasi'}
              </button>
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="w-full rounded-xl border border-border bg-background py-3 text-sm font-semibold text-foreground"
              >
                Batal
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
