'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion } from 'framer-motion'
import { PageHeader } from './page-header'
import { PhotoUpload } from './photo-upload'
import { VoiceRecorder } from './voice-recorder'
import { Toast } from './toast'
import { ErrorBanner } from './error-banner'
import { EditLogSheet } from './edit-log-sheet'
import { ConfirmDeleteSheet } from './confirm-delete-sheet'
import { playSoundEffect } from '@/lib/sounds'
import {
  api,
  isQueuedResponse,
  type DailyNote,
  type HistoryItem,
  type UpdateLogInput,
} from '@/lib/api-client'
import { useAppDataSync } from '@/lib/use-app-data-sync'

interface NotesPageProps {
  onBack: () => void
}

function noteToHistoryItem(note: DailyNote): HistoryItem {
  return {
    id: note.id,
    category: 'note',
    type: 'note',
    timestamp: note.timestamp,
    content: note.content,
    details: note.content,
    photo_url: note.photo_url,
    audio_url: note.audio_url,
    logged_by: note.logged_by,
  }
}

export function NotesPage({ onBack }: NotesPageProps) {
  const [notes, setNotes] = useState<DailyNote[]>([])
  const [content, setContent] = useState('')
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [editingNote, setEditingNote] = useState<HistoryItem | null>(null)
  const [pendingDelete, setPendingDelete] = useState<DailyNote | null>(null)
  const loadMoreRef = useRef<HTMLDivElement>(null)

  const canSave = content.trim().length > 0 || !!audioUrl

  const loadNotes = useCallback(async (cursor?: string) => {
    const data = await api.getNotes({ limit: 20, cursor })
    return data
  }, [])

  const loadInitial = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) {
      setLoading(true)
      setError(false)
    }
    try {
      const data = await loadNotes()
      setNotes(data.items)
      setHasMore(data.hasMore)
      setNextCursor(data.nextCursor)
    } catch {
      if (!opts?.silent) setError(true)
    } finally {
      if (!opts?.silent) setLoading(false)
    }
  }, [loadNotes])

  const loadMore = useCallback(async () => {
    if (!hasMore || !nextCursor || loadingMore) return
    setLoadingMore(true)
    try {
      const data = await loadNotes(nextCursor)
      setNotes((prev) => [...prev, ...data.items])
      setHasMore(data.hasMore)
      setNextCursor(data.nextCursor)
    } finally {
      setLoadingMore(false)
    }
  }, [hasMore, nextCursor, loadingMore, loadNotes])

  useAppDataSync(() => loadInitial({ silent: true }))

  useEffect(() => {
    loadInitial()
  }, [loadInitial])

  useEffect(() => {
    const el = loadMoreRef.current
    if (!el || !hasMore) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore()
      },
      { rootMargin: '120px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasMore, loadMore])

  const handleSave = async () => {
    if (!canSave) return
    setSaving(true)
    try {
      const result = await api.createNote(
        content.trim(),
        photoUrl ?? undefined,
        audioUrl ?? undefined
      )
      if (isQueuedResponse(result)) {
        setToast('📡 Menunggu sync...')
      } else {
        playSoundEffect('success')
        setToast('📝 Catatan tersimpan!')
      }
      setContent('')
      setPhotoUrl(null)
      setAudioUrl(null)
      await loadInitial()
      setTimeout(() => setToast(null), 2000)
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = async (data: UpdateLogInput) => {
    if (!editingNote) return
    await api.updateLog('note', editingNote.id, data)
    setToast('✓ Diperbarui')
    await loadInitial()
    setTimeout(() => setToast(null), 2000)
  }

  const confirmDelete = async () => {
    if (!pendingDelete) return
    await api.deleteLog('note', pendingDelete.id)
    setNotes((prev) => prev.filter((n) => n.id !== pendingDelete.id))
    setPendingDelete(null)
    setToast('🗑️ Dihapus')
    setTimeout(() => setToast(null), 2000)
  }

  return (
    <div className="px-4 pt-6 pb-8">
      <PageHeader title="Catatan" subtitle="Tummy time, aktivitas, dll" onBack={onBack} />

      <div className="mb-6 space-y-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Misal: Tummy time 5 menit, senang banget!"
          rows={3}
          className="w-full resize-none rounded-xl border border-input bg-background px-3 py-2.5 text-sm text-foreground"
        />
        <PhotoUpload onUploaded={setPhotoUrl} preview={photoUrl} label="Foto" />
        <VoiceRecorder onRecorded={setAudioUrl} preview={audioUrl} />
        <button
          type="button"
          onClick={handleSave}
          disabled={!canSave || saving}
          className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          {saving ? '...' : 'Simpan'}
        </button>
      </div>

      <h2 className="font-heading mb-3 text-base font-semibold text-foreground">
        Terbaru
      </h2>
      {error ? (
        <ErrorBanner message="Gagal memuat catatan" onRetry={loadInitial} />
      ) : loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-secondary" />
          ))}
        </div>
      ) : notes.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Belum ada catatan</p>
      ) : (
        <div className="space-y-2">
          {notes.map((note) => (
            <motion.div
              key={note.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="rounded-xl border border-border bg-card p-3 shadow-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="flex-1 text-sm text-foreground">{note.content}</p>
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    onClick={() => setEditingNote(noteToHistoryItem(note))}
                    className="rounded-lg px-2 py-1 text-xs opacity-60 hover:opacity-100"
                  >
                    ✏️
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingDelete(note)}
                    className="rounded-lg px-2 py-1 text-xs opacity-60 hover:opacity-100"
                  >
                    🗑️
                  </button>
                </div>
              </div>
              {note.audio_url && (
                <audio src={note.audio_url} controls className="mt-2 w-full" />
              )}
              {note.photo_url && (
                <img
                  src={note.photo_url}
                  alt=""
                  className="mt-2 h-32 w-full rounded-lg object-cover"
                />
              )}
              <p className="mt-1 text-xs text-muted-foreground">
                {new Date(note.timestamp).toLocaleString('id-ID')}
                {note.logged_by && ` · ${note.logged_by}`}
              </p>
            </motion.div>
          ))}
          {hasMore && (
            <div ref={loadMoreRef} className="py-3 text-center text-xs text-muted-foreground">
              {loadingMore ? 'Memuat...' : 'Scroll untuk lebih banyak'}
            </div>
          )}
        </div>
      )}

      <EditLogSheet
        item={editingNote}
        open={!!editingNote}
        onClose={() => setEditingNote(null)}
        onSave={handleEdit}
      />
      <ConfirmDeleteSheet
        open={!!pendingDelete}
        title="Hapus catatan?"
        message="Catatan dan file terlampir akan dihapus permanen."
        confirmLabel="Hapus"
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
      {toast && <Toast message={toast} />}
    </div>
  )
}
