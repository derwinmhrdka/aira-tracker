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

function minutesBetweenLocal(startLocal: string, endLocal: string): number | null {
  if (!startLocal || !endLocal) return null
  const ms = new Date(endLocal).getTime() - new Date(startLocal).getTime()
  if (!Number.isFinite(ms) || ms < 0) return null
  return Math.round(ms / 60000)
}

function endFromDuration(startLocal: string, totalMinutes: number): string {
  const start = new Date(startLocal)
  const end = new Date(start.getTime() + Math.max(0, totalMinutes) * 60000)
  return toDatetimeLocal(end.toISOString())
}

type EndMode = 'time' | 'duration'

interface EditLogSheetProps {
  item: HistoryItem | null
  open: boolean
  onClose: () => void
  onSave: (data: UpdateLogInput) => Promise<void>
}

export function EditLogSheet({ item, open, onClose, onSave }: EditLogSheetProps) {
  const [timestamp, setTimestamp] = useState('')
  const [timestampEnd, setTimestampEnd] = useState('')
  const [endMode, setEndMode] = useState<EndMode>('time')
  const [durationHours, setDurationHours] = useState('0')
  const [durationMinutes, setDurationMinutes] = useState('0')
  const [diaperType, setDiaperType] = useState<'pup' | 'pee' | 'both' | 'change'>('pee')
  const [side, setSide] = useState('LEFT')
  const [feedType, setFeedType] = useState<FeedTypeValue>('DIRECT')
  const [amountMl, setAmountMl] = useState('')
  const [notes, setNotes] = useState('')
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!item) return
    const startLocal = toDatetimeLocal(item.timestamp)
    const endLocal = item.timestampEnd ? toDatetimeLocal(item.timestampEnd) : ''
    setTimestamp(startLocal)
    setTimestampEnd(endLocal)
    setEndMode('time')
    const mins = endLocal ? minutesBetweenLocal(startLocal, endLocal) : null
    if (mins != null) {
      setDurationHours(String(Math.floor(mins / 60)))
      setDurationMinutes(String(mins % 60))
    } else {
      setDurationHours('0')
      setDurationMinutes('0')
    }
    setDiaperType(item.diaper_type ?? (item.type as 'pup' | 'pee' | 'both' | 'change') ?? 'pee')
    setSide(item.side ?? 'LEFT')
    setFeedType((item.feed_type as FeedTypeValue) ?? 'DIRECT')
    setAmountMl(item.amount_ml != null ? String(item.amount_ml) : '')
    setNotes(item.notes ?? '')
    setContent(item.content ?? item.details ?? '')
  }, [item])

  const applyDuration = (hoursStr: string, minutesStr: string, startLocal = timestamp) => {
    const h = Math.max(0, parseInt(hoursStr || '0', 10) || 0)
    const m = Math.max(0, Math.min(59, parseInt(minutesStr || '0', 10) || 0))
    setDurationHours(String(h))
    setDurationMinutes(String(m))
    if (!startLocal) return
    const total = h * 60 + m
    if (total <= 0) {
      setTimestampEnd('')
      return
    }
    setTimestampEnd(endFromDuration(startLocal, total))
  }

  const handleStartChange = (value: string) => {
    setTimestamp(value)
    if (endMode === 'duration') {
      applyDuration(durationHours, durationMinutes, value)
    } else if (timestampEnd) {
      const mins = minutesBetweenLocal(value, timestampEnd)
      if (mins != null) {
        setDurationHours(String(Math.floor(mins / 60)))
        setDurationMinutes(String(mins % 60))
      }
    }
  }

  const handleEndChange = (value: string) => {
    setTimestampEnd(value)
    if (timestamp && value) {
      const mins = minutesBetweenLocal(timestamp, value)
      if (mins != null) {
        setDurationHours(String(Math.floor(mins / 60)))
        setDurationMinutes(String(mins % 60))
      }
    }
  }

  const handleSave = async () => {
    if (!item) return
    setSaving(true)
    try {
      let startLocal = timestamp
      let endLocal = timestampEnd

      if (
        (item.category === 'feeding' || item.category === 'sleep') &&
        endMode === 'duration'
      ) {
        const h = Math.max(0, parseInt(durationHours || '0', 10) || 0)
        const m = Math.max(0, Math.min(59, parseInt(durationMinutes || '0', 10) || 0))
        const total = h * 60 + m
        endLocal = total > 0 && startLocal ? endFromDuration(startLocal, total) : ''
      }

      const data: UpdateLogInput = { timestamp: fromDatetimeLocal(startLocal) }

      if (item.category === 'diaper') {
        data.type = diaperType
        data.notes = notes || null
      } else if (item.category === 'feeding') {
        data.timestamp_end = endLocal ? fromDatetimeLocal(endLocal) : null
        data.side = side
        data.feed_type = feedType
        data.amount_ml = amountMl ? parseInt(amountMl, 10) : null
        data.notes = notes || null
      } else if (item.category === 'sleep') {
        data.timestamp_end = endLocal ? fromDatetimeLocal(endLocal) : null
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
                  onChange={(e) => handleStartChange(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background px-3 py-3 text-base"
                />
              </div>

              {item.category === 'diaper' && (
                <>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                      Jenis
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {(['pup', 'pee', 'both', 'change'] as const).map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setDiaperType(t)}
                          className={`rounded-xl py-2.5 text-sm font-medium ${
                            diaperType === t
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-secondary text-foreground'
                          }`}
                        >
                          {t === 'pup'
                            ? '💩 Pup'
                            : t === 'pee'
                              ? '💧 Pee'
                              : t === 'both'
                                ? 'Pupee'
                                : '🩲 Popok'}
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
                      Selesai
                    </label>
                    <div className="mb-2 flex gap-2">
                      {(
                        [
                          { id: 'time' as const, label: 'Waktu selesai' },
                          { id: 'duration' as const, label: 'Durasi' },
                        ] as const
                      ).map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => {
                            setEndMode(m.id)
                            if (m.id === 'duration') {
                              applyDuration(durationHours, durationMinutes)
                            }
                          }}
                          className={`flex-1 rounded-xl py-2 text-sm font-medium ${
                            endMode === m.id
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-secondary text-foreground'
                          }`}
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>
                    {endMode === 'time' ? (
                      <input
                        type="datetime-local"
                        value={timestampEnd}
                        onChange={(e) => handleEndChange(e.target.value)}
                        className="w-full rounded-xl border border-input bg-background px-3 py-3 text-base"
                      />
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="mb-1 block text-[10px] text-muted-foreground">
                            Jam
                          </label>
                          <input
                            type="number"
                            min={0}
                            max={24}
                            value={durationHours}
                            onChange={(e) =>
                              applyDuration(e.target.value, durationMinutes)
                            }
                            className="w-full rounded-xl border border-input bg-background px-3 py-3 text-base"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-[10px] text-muted-foreground">
                            Menit
                          </label>
                          <input
                            type="number"
                            min={0}
                            max={59}
                            value={durationMinutes}
                            onChange={(e) =>
                              applyDuration(durationHours, e.target.value)
                            }
                            className="w-full rounded-xl border border-input bg-background px-3 py-3 text-base"
                          />
                        </div>
                      </div>
                    )}
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
                    <div className="mb-2 flex gap-2">
                      {(
                        [
                          { id: 'time' as const, label: 'Waktu selesai' },
                          { id: 'duration' as const, label: 'Durasi' },
                        ] as const
                      ).map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => {
                            setEndMode(m.id)
                            if (m.id === 'duration') {
                              applyDuration(durationHours, durationMinutes)
                            }
                          }}
                          className={`flex-1 rounded-xl py-2 text-sm font-medium ${
                            endMode === m.id
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-secondary text-foreground'
                          }`}
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>
                    {endMode === 'time' ? (
                      <input
                        type="datetime-local"
                        value={timestampEnd}
                        onChange={(e) => handleEndChange(e.target.value)}
                        className="w-full rounded-xl border border-input bg-background px-3 py-3 text-base"
                      />
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="mb-1 block text-[10px] text-muted-foreground">
                            Jam
                          </label>
                          <input
                            type="number"
                            min={0}
                            max={24}
                            value={durationHours}
                            onChange={(e) =>
                              applyDuration(e.target.value, durationMinutes)
                            }
                            className="w-full rounded-xl border border-input bg-background px-3 py-3 text-base"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-[10px] text-muted-foreground">
                            Menit
                          </label>
                          <input
                            type="number"
                            min={0}
                            max={59}
                            value={durationMinutes}
                            onChange={(e) =>
                              applyDuration(durationHours, e.target.value)
                            }
                            className="w-full rounded-xl border border-input bg-background px-3 py-3 text-base"
                          />
                        </div>
                      </div>
                    )}
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
