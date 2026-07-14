'use client'

import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { PageHeader } from './page-header'
import { EventSheet } from './event-sheet'
import { ConfirmDeleteSheet } from './confirm-delete-sheet'
import { Toast } from './toast'
import { playSoundEffect } from '@/lib/sounds'
import { api, type CalendarEvent, type CreateEventInput } from '@/lib/api-client'
import { useAppDataSync } from '@/lib/use-app-data-sync'
import { notifyDataSynced } from '@/lib/use-live-sync'

interface EventsPageProps {
  onBack: () => void
}

function formatEventWhen(startIso: string, endIso: string) {
  const start = new Date(startIso)
  const end = new Date(endIso)
  const date = start.toLocaleDateString('id-ID', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
  const startTime = start.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  })
  const endTime = end.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  })
  return `${date} · ${startTime}–${endTime}`
}

export function EventsPage({ onBack }: EventsPageProps) {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editing, setEditing] = useState<CalendarEvent | null>(null)
  const [pendingDelete, setPendingDelete] = useState<CalendarEvent | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const loadEvents = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const data = await api.getEvents()
      setEvents(data)
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadEvents()
  }, [loadEvents])

  useAppDataSync(() => loadEvents(true))

  const handleCreate = async (data: CreateEventInput) => {
    await api.createEvent(data)
    playSoundEffect('success')
    setToast('📅 Event tersimpan!')
    setTimeout(() => setToast(null), 2000)
    setSheetOpen(false)
    await loadEvents(true)
    notifyDataSynced()
  }

  const handleEdit = async (data: CreateEventInput) => {
    if (!editing) return
    await api.updateEvent(editing.id, data)
    playSoundEffect('success')
    setToast('✓ Event diperbarui!')
    setTimeout(() => setToast(null), 2000)
    setEditing(null)
    await loadEvents(true)
    notifyDataSynced()
  }

  const confirmDelete = async () => {
    if (!pendingDelete) return
    setDeleting(true)
    try {
      await api.deleteEvent(pendingDelete.id)
      setEvents((prev) => prev.filter((e) => e.id !== pendingDelete.id))
      setPendingDelete(null)
      notifyDataSynced()
    } finally {
      setDeleting(false)
    }
  }

  const now = Date.now()
  const upcoming = events.filter((e) => new Date(e.end_at).getTime() >= now)
  const past = events.filter((e) => new Date(e.end_at).getTime() < now)

  return (
    <div className="px-4 pt-6 pb-8">
      <PageHeader title="Event" subtitle="Jadwal & pertemuan" onBack={onBack} />

      <button
        type="button"
        onClick={() => {
          setEditing(null)
          setSheetOpen(true)
        }}
        className="mb-4 w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground"
      >
        + Tambah Event
      </button>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-secondary" />
          ))}
        </div>
      ) : events.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          Belum ada event
        </p>
      ) : (
        <div className="space-y-5">
          {upcoming.length > 0 && (
            <section>
              <h2 className="font-heading mb-2 text-sm font-semibold text-foreground">
                Mendatang
              </h2>
              <div className="space-y-2">
                {upcoming.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    onEdit={() => setEditing(event)}
                    onDelete={() => setPendingDelete(event)}
                  />
                ))}
              </div>
            </section>
          )}
          {past.length > 0 && (
            <section>
              <h2 className="font-heading mb-2 text-sm font-semibold text-muted-foreground">
                Selesai
              </h2>
              <div className="space-y-2 opacity-70">
                {past.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    onEdit={() => setEditing(event)}
                    onDelete={() => setPendingDelete(event)}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      <EventSheet
        open={sheetOpen || !!editing}
        onClose={() => {
          setSheetOpen(false)
          setEditing(null)
        }}
        onSave={editing ? handleEdit : handleCreate}
        initial={editing}
        mode={editing ? 'edit' : 'create'}
      />
      <ConfirmDeleteSheet
        open={!!pendingDelete}
        title="Hapus event?"
        message="Event ini akan dihapus permanen."
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
        loading={deleting}
      />
      {toast && <Toast message={toast} />}
    </div>
  )
}

function EventCard({
  event,
  onEdit,
  onDelete,
}: {
  event: CalendarEvent
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <motion.div
      layout
      className="rounded-xl border border-border bg-card p-3 shadow-sm"
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-heading text-sm font-semibold text-foreground">
            📅 {event.title}
          </p>
          <p className="mt-0.5 text-xs text-primary">
            {formatEventWhen(event.start_at, event.end_at)}
          </p>
          <div className="mt-1 space-y-0.5 text-[11px] text-muted-foreground">
            {event.location && <p>📍 {event.location}</p>}
            {event.meet_with && <p>👤 {event.meet_with}</p>}
            {event.notes && <p>📝 {event.notes}</p>}
          </div>
        </div>
        <button
          type="button"
          onClick={onEdit}
          className="shrink-0 rounded-lg px-2 py-1 opacity-60 hover:opacity-100"
          aria-label="Ubah"
        >
          ✏️
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="shrink-0 rounded-lg px-2 py-1 text-destructive opacity-60 hover:opacity-100"
          aria-label="Hapus"
        >
          🗑️
        </button>
      </div>
    </motion.div>
  )
}
