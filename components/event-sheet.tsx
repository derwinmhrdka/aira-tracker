'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { CalendarEvent, CreateEventInput } from '@/lib/api-client'

interface EventSheetProps {
  open: boolean
  onClose: () => void
  onSave: (data: CreateEventInput) => Promise<void>
  initial?: CalendarEvent | null
  mode?: 'create' | 'edit'
}

function toDatetimeLocal(iso: string) {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function fromDatetimeLocal(value: string) {
  return new Date(value).toISOString()
}

function defaultStart() {
  const d = new Date()
  d.setMinutes(0, 0, 0)
  d.setHours(d.getHours() + 1)
  return toDatetimeLocal(d.toISOString())
}

function defaultEnd(startLocal: string) {
  const d = new Date(startLocal)
  d.setHours(d.getHours() + 1)
  return toDatetimeLocal(d.toISOString())
}

export function EventSheet({
  open,
  onClose,
  onSave,
  initial,
  mode = 'create',
}: EventSheetProps) {
  const [title, setTitle] = useState('')
  const [location, setLocation] = useState('')
  const [meetWith, setMeetWith] = useState('')
  const [startAt, setStartAt] = useState(defaultStart())
  const [endAt, setEndAt] = useState(defaultEnd(defaultStart()))
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    if (initial) {
      setTitle(initial.title)
      setLocation(initial.location ?? '')
      setMeetWith(initial.meet_with ?? '')
      setStartAt(toDatetimeLocal(initial.start_at))
      setEndAt(toDatetimeLocal(initial.end_at))
      setNotes(initial.notes ?? '')
    } else {
      const start = defaultStart()
      setTitle('')
      setLocation('')
      setMeetWith('')
      setStartAt(start)
      setEndAt(defaultEnd(start))
      setNotes('')
    }
    setError(null)
  }, [open, initial])

  const handleSave = async () => {
    if (!title.trim()) {
      setError('Judul event wajib diisi')
      return
    }
    if (!startAt || !endAt) {
      setError('Tanggal & jam wajib diisi')
      return
    }
    if (new Date(endAt).getTime() < new Date(startAt).getTime()) {
      setError('Jam selesai harus setelah mulai')
      return
    }

    setSaving(true)
    setError(null)
    try {
      await onSave({
        title: title.trim(),
        location: location.trim() || undefined,
        meet_with: meetWith.trim() || undefined,
        start_at: fromDatetimeLocal(startAt),
        end_at: fromDatetimeLocal(endAt),
        notes: notes.trim() || undefined,
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan')
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
            className="fixed bottom-0 left-0 right-0 z-50 max-h-[90vh] overflow-y-auto rounded-t-2xl border-t border-border bg-card p-4 pb-8 shadow-2xl"
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-muted" />
            <h2 className="font-heading mb-4 text-lg font-bold text-foreground">
              {mode === 'edit' ? 'Edit Event' : 'Tambah Event'}
            </h2>

            <div className="space-y-3">
              <label className="block">
                <span className="mb-1 block text-xs text-muted-foreground">Event</span>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Mis. Kontrol dokter"
                  className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs text-muted-foreground">Di mana</span>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Mis. RS Hermina"
                  className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs text-muted-foreground">Bertemu siapa</span>
                <input
                  type="text"
                  value={meetWith}
                  onChange={(e) => setMeetWith(e.target.value)}
                  placeholder="Mis. Dr. Andi"
                  className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs text-muted-foreground">Mulai</span>
                <input
                  type="datetime-local"
                  value={startAt}
                  onChange={(e) => {
                    setStartAt(e.target.value)
                    if (new Date(endAt) <= new Date(e.target.value)) {
                      setEndAt(defaultEnd(e.target.value))
                    }
                  }}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs text-muted-foreground">Selesai</span>
                <input
                  type="datetime-local"
                  value={endAt}
                  onChange={(e) => setEndAt(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs text-muted-foreground">Catatan</span>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Opsional"
                  className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm"
                />
              </label>
            </div>

            {error && (
              <p className="mt-3 text-xs text-destructive">{error}</p>
            )}

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-xl border border-border py-3 text-sm font-semibold"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
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
