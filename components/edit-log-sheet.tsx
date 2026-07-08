'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { HistoryItem, UpdateLogInput } from '@/lib/api-client'
import { FEED_TYPE_OPTIONS, type FeedTypeValue } from '@/lib/feed-utils'

function toDatetimeLocal(iso: string) {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function fromDatetimeLocal(value: string) {
  return new Date(value).toISOString()
}

interface EditLogSheetProps {
  item: HistoryItem | null
  open: boolean
  onClose: () => void
  onSave: (data: UpdateLogInput) => Promise<void>
}

export function EditLogSheet({ item, open, onClose, onSave }: EditLogSheetProps) {
  const [timestamp, setTimestamp] = useState('')
  const [timestampEnd, setTimestampEnd] = useState('')
  const [diaperType, setDiaperType] = useState<'pup' | 'pee' | 'both'>('pee')
  const [side, setSide] = useState('LEFT')
  const [feedType, setFeedType] = useState<FeedTypeValue>('DIRECT')
  const [amountMl, setAmountMl] = useState('')
  const [notes, setNotes] = useState('')
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!item) return
    setTimestamp(toDatetimeLocal(item.timestamp))
    setTimestampEnd(item.timestampEnd ? toDatetimeLocal(item.timestampEnd) : '')
    setDiaperType(item.diaper_type ?? (item.type as 'pup' | 'pee' | 'both') ?? 'pee')
    setSide(item.side ?? 'LEFT')
    setFeedType((item.feed_type as FeedTypeValue) ?? 'DIRECT')
    setAmountMl(item.amount_ml != null ? String(item.amount_ml) : '')
    setNotes(item.notes ?? '')
    setContent(item.content ?? item.details ?? '')
  }, [item])

  const handleSave = async () => {
    if (!item) return
    setSaving(true)
    try {
      const data: UpdateLogInput = { timestamp: fromDatetimeLocal(timestamp) }

      if (item.category === 'diaper') {
        data.type = diaperType
        data.notes = notes || null
      } else if (item.category === 'feeding') {
        data.timestamp_end = timestampEnd ? fromDatetimeLocal(timestampEnd) : null
        data.side = side
        data.feed_type = feedType
        data.amount_ml = amountMl ? parseInt(amountMl, 10) : null
        data.notes = notes || null
      } else if (item.category === 'sleep') {
        data.timestamp_end = timestampEnd ? fromDatetimeLocal(timestampEnd) : null
        data.notes = notes || null
      } else if (item.category === 'note') {
        data.content = content.trim()
      }

      await onSave(data)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const title =
    item?.category === 'diaper'
      ? 'Edit Popok'
      : item?.category === 'feeding'
        ? 'Edit Menyusui'
        : item?.category === 'sleep'
          ? 'Edit Tidur'
          : 'Edit Note'

  return (
    <AnimatePresence>
      {open && item && (
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
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-y-auto rounded-t-3xl bg-card p-5 pb-8 shadow-2xl"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-heading text-lg font-bold text-foreground">{title}</h2>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full bg-secondary px-3 py-1 text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  {item.category === 'note' ? 'Time' : 'Start'}
                </label>
                <input
                  type="datetime-local"
                  value={timestamp}
                  onChange={(e) => setTimestamp(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background px-3 py-3 text-base"
                />
              </div>

              {item.category === 'diaper' && (
                <>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                      Jenis
                    </label>
                    <div className="flex gap-2">
                      {(['pup', 'pee', 'both'] as const).map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setDiaperType(t)}
                          className={`flex-1 rounded-xl py-2.5 text-sm font-medium ${
                            diaperType === t
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-secondary text-foreground'
                          }`}
                        >
                          {t === 'pup' ? '💩 Pup' : t === 'pee' ? '💧 Pee' : 'Pupee'}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                      Notes
                    </label>
                    <input
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Optional"
                      className="w-full rounded-xl border border-input bg-background px-3 py-3 text-base"
                    />
                  </div>
                </>
              )}

              {item.category === 'feeding' && (
                <>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                      Tipe
                    </label>
                    <div className="flex gap-2">
                      {FEED_TYPE_OPTIONS.map((t) => (
                        <button
                          key={t.value}
                          type="button"
                          onClick={() => setFeedType(t.value)}
                          className={`flex-1 rounded-xl py-2.5 text-sm font-medium ${
                            feedType === t.value
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-secondary text-foreground'
                          }`}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                      End
                    </label>
                    <input
                      type="datetime-local"
                      value={timestampEnd}
                      onChange={(e) => setTimestampEnd(e.target.value)}
                      className="w-full rounded-xl border border-input bg-background px-3 py-3 text-base"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                      Sisi
                    </label>
                    <div className="flex gap-2">
                      {[
                        { id: 'LEFT', label: 'Kiri' },
                        { id: 'RIGHT', label: 'Kanan' },
                        { id: 'BOTH', label: 'Keduanya' },
                      ].map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => setSide(s.id)}
                          className={`flex-1 rounded-xl py-2.5 text-sm font-medium ${
                            side === s.id
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-secondary text-foreground'
                          }`}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                      Jumlah (ml)
                    </label>
                    <input
                      type="number"
                      value={amountMl}
                      onChange={(e) => setAmountMl(e.target.value)}
                      placeholder="Optional"
                      className="w-full rounded-xl border border-input bg-background px-3 py-3 text-base"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                      Notes
                    </label>
                    <input
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Optional"
                      className="w-full rounded-xl border border-input bg-background px-3 py-3 text-base"
                    />
                  </div>
                </>
              )}

              {item.category === 'sleep' && (
                <>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                      Bangun
                    </label>
                    <input
                      type="datetime-local"
                      value={timestampEnd}
                      onChange={(e) => setTimestampEnd(e.target.value)}
                      className="w-full rounded-xl border border-input bg-background px-3 py-3 text-base"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                      Notes
                    </label>
                    <input
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Optional"
                      className="w-full rounded-xl border border-input bg-background px-3 py-3 text-base"
                    />
                  </div>
                </>
              )}

              {item.category === 'note' && (
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    Isi catatan
                  </label>
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    rows={4}
                    className="w-full rounded-xl border border-input bg-background px-3 py-3 text-base resize-none"
                  />
                </div>
              )}

              <button
                type="button"
                onClick={handleSave}
                disabled={
                  saving ||
                  (item.category === 'note' &&
                    !content.trim() &&
                    !item.audio_url)
                }
                className="w-full rounded-xl bg-primary py-3.5 font-semibold text-primary-foreground disabled:opacity-50"
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
