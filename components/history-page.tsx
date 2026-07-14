'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion } from 'framer-motion'
import { api, isQueuedResponse, type HistoryItem, type UpdateLogInput } from '@/lib/api-client'
import { formatDurationLabel } from '@/lib/baby-utils'
import { useAppDataSync } from '@/lib/use-app-data-sync'
import { EditLogSheet } from './edit-log-sheet'
import { Toast } from './toast'
import { ErrorBanner } from './error-banner'
import { ConfirmDeleteSheet } from './confirm-delete-sheet'
import { ClickablePhoto, PhotoViewer } from './photo-viewer'

const TYPE_EMOJI: Record<string, string> = {
  pup: '💩', pee: '💧', both: '💩💧', change: '🩲', feed: '🍼', 'feed-end': '🍼',
  sleep: '😴', wake: '☀️', note: '📝',
}

const TYPE_LABEL: Record<string, string> = {
  pup: 'Pup', pee: 'Pee', both: 'Pupee', change: 'Popok', feed: 'Mulai Menyusui',
  'feed-end': 'Selesai Menyusui', sleep: 'Mulai Tidur', wake: 'Bangun', note: 'Catatan',
}

const FILTERS = [
  { id: '', label: 'Semua' },
  { id: 'diaper', label: 'Popok' },
  { id: 'feeding', label: 'Susu' },
  { id: 'sleep', label: 'Tidur' },
  { id: 'note', label: 'Catatan' },
]

const DAY_FILTERS = [
  { days: 1, label: 'Hari ini' },
  { days: 7, label: '7 hari' },
  { days: 30, label: '30 hari' },
]

const PAGE_SIZE = 15

function formatTime(iso: string) {
  return new Date(iso).toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function itemDurationMinutes(item: HistoryItem): number | null {
  if (
    (item.category !== 'feeding' && item.category !== 'sleep') ||
    !item.timestampEnd
  ) {
    return null
  }
  const ms =
    new Date(item.timestampEnd).getTime() - new Date(item.timestamp).getTime()
  if (!Number.isFinite(ms) || ms < 0) return null
  return Math.round(ms / 60000)
}

function groupByDay(items: HistoryItem[]) {
  const groups: { label: string; items: HistoryItem[] }[] = []
  let currentKey = ''

  for (const item of items) {
    const key = new Date(item.timestamp).toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    })
    if (key !== currentKey) {
      currentKey = key
      groups.push({ label: key, items: [item] })
    } else {
      groups[groups.length - 1].items.push(item)
    }
  }

  return groups
}

export function HistoryPage() {
  const [items, setItems] = useState<HistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [category, setCategory] = useState('')
  const [days, setDays] = useState(7)
  const loadMoreRef = useRef<HTMLDivElement>(null)
  const requestIdRef = useRef(0)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [editingItem, setEditingItem] = useState<HistoryItem | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<HistoryItem | null>(null)
  const [viewingPhoto, setViewingPhoto] = useState<string | null>(null)

  const loadInitial = useCallback(async (opts?: { silent?: boolean }) => {
    const requestId = ++requestIdRef.current
    if (!opts?.silent) {
      setLoading(true)
      setLoadingMore(false)
      setError(false)
      setItems([])
      setHasMore(false)
      setNextCursor(null)
    }
    try {
      const data = await api.getHistory(days, category || undefined, {
        limit: PAGE_SIZE,
      })
      if (requestId !== requestIdRef.current) return
      setItems(data.items)
      setHasMore(data.hasMore)
      setNextCursor(data.nextCursor)
    } catch {
      if (requestId === requestIdRef.current && !opts?.silent) setError(true)
    } finally {
      if (requestId === requestIdRef.current && !opts?.silent) setLoading(false)
    }
  }, [days, category])

  const loadMore = useCallback(async () => {
    if (!hasMore || !nextCursor || loadingMore || loading) return
    const requestId = requestIdRef.current
    setLoadingMore(true)
    try {
      const data = await api.getHistory(days, category || undefined, {
        limit: PAGE_SIZE,
        cursor: nextCursor,
      })
      if (requestId !== requestIdRef.current) return
      setItems((prev) => {
        const seen = new Set(prev.map((i) => `${i.category}-${i.id}`))
        const next = data.items.filter(
          (i) => !seen.has(`${i.category}-${i.id}`)
        )
        return [...prev, ...next]
      })
      setHasMore(data.hasMore)
      setNextCursor(data.nextCursor)
    } catch {
      // keep existing items
    } finally {
      if (requestId === requestIdRef.current) setLoadingMore(false)
    }
  }, [days, category, hasMore, nextCursor, loadingMore, loading])

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

  const handleEdit = async (data: UpdateLogInput) => {
    if (!editingItem) return
    const updated = await api.updateLog(editingItem.category, editingItem.id, data)
    if (isQueuedResponse(updated)) {
      setItems((prev) =>
        prev.map((i) =>
          i.id === editingItem.id && i.category === editingItem.category
            ? {
                ...i,
                timestamp: data.timestamp ?? i.timestamp,
                timestampEnd:
                  data.timestamp_end !== undefined
                    ? data.timestamp_end
                    : i.timestampEnd,
                notes: data.notes !== undefined ? data.notes : i.notes,
                side: data.side ?? i.side,
                feed_type: data.feed_type ?? i.feed_type,
                amount_ml:
                  data.amount_ml !== undefined ? data.amount_ml : i.amount_ml,
                diaper_type: data.type ?? i.diaper_type,
                content: data.content ?? i.content,
                details: data.content ?? i.details,
              }
            : i
        )
      )
      setToast('📡 Menunggu sync...')
      setTimeout(() => setToast(null), 2000)
      return
    }
    setItems((prev) =>
      prev.map((i) =>
        i.id === editingItem.id && i.category === editingItem.category ? updated : i
      )
    )
    setToast('✓ Diperbarui')
    setTimeout(() => setToast(null), 2000)
  }

  const confirmDelete = async () => {
    if (!pendingDelete) return
    const item = pendingDelete
    setDeletingId(item.id)
    try {
      const result = await api.deleteLog(item.category, item.id)
      setItems((prev) =>
        prev.filter((i) => !(i.id === item.id && i.category === item.category))
      )
      setPendingDelete(null)
      setToast(isQueuedResponse(result) ? '📡 Hapus menunggu sync...' : '🗑️ Dihapus')
      setTimeout(() => setToast(null), 2000)
    } finally {
      setDeletingId(null)
    }
  }

  const groups = groupByDay(items)

  return (
    <div className="px-4 pt-6 pb-24">
      <h1 className="font-heading mb-1 text-xl font-bold text-foreground">Riwayat</h1>
      <p className="mb-4 text-sm text-muted-foreground">Semua aktivitas tercatat</p>

      <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
        {DAY_FILTERS.map((f) => (
          <button
            key={f.days}
            type="button"
            onClick={() => setDays(f.days)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium ${
              days === f.days
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-foreground'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setCategory(f.id)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium ${
              category === f.id
                ? 'bg-accent text-accent-foreground'
                : 'bg-secondary text-foreground'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error ? (
        <ErrorBanner message="Gagal memuat riwayat" onRetry={loadInitial} />
      ) : loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-secondary" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="mt-8 flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-border py-12">
          <span className="text-4xl opacity-40">📋</span>
          <p className="text-sm text-muted-foreground">Belum ada riwayat</p>
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map((group) => (
            <div key={group.label}>
              <p className="mb-2 text-xs font-semibold text-muted-foreground">
                {group.label}
              </p>
              <div className="space-y-2">
                {group.items.map((item) => {
                  const durationMins = itemDurationMinutes(item)
                  return (
                  <motion.div
                    key={`${item.category}-${item.id}`}
                    layout
                    className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-sm"
                  >
                    <span className="text-2xl">{TYPE_EMOJI[item.type] || '📋'}</span>
                    <div className="min-w-0 flex-1">
                      <p className="font-heading text-sm font-semibold text-foreground">
                        {TYPE_LABEL[item.type] || item.type}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatTime(item.timestamp)}
                        {item.loggedBy && ` · ${item.loggedBy}`}
                      </p>
                      {durationMins != null && (
                        <p className="mt-0.5 text-xs font-medium text-foreground">
                          {formatDurationLabel(durationMins)}
                        </p>
                      )}
                      {item.details && (
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {item.details}
                        </p>
                      )}
                      {item.photo_url && (
                        <ClickablePhoto
                          src={item.photo_url}
                          wrapperClassName="mt-2 block"
                          className="h-16 w-16 rounded-lg"
                          onView={setViewingPhoto}
                        />
                      )}
                      {item.audio_url && (
                        <audio
                          src={item.audio_url}
                          controls
                          className="mt-2 w-full max-w-xs"
                        />
                      )}
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <button
                        type="button"
                        onClick={() => setEditingItem(item)}
                        className="rounded-lg px-2 py-2 text-xs opacity-60 hover:opacity-100"
                        aria-label="Ubah"
                      >
                        ✏️
                      </button>
                      <button
                        type="button"
                        onClick={() => setPendingDelete(item)}
                        disabled={deletingId === item.id}
                        className="rounded-lg px-2 py-2 text-xs opacity-60 hover:opacity-100"
                        aria-label="Hapus"
                      >
                        🗑️
                      </button>
                    </div>
                  </motion.div>
                  )
                })}
              </div>
            </div>
          ))}
          {hasMore && (
            <div ref={loadMoreRef} className="py-4 text-center text-xs text-muted-foreground">
              {loadingMore ? 'Memuat...' : 'Scroll untuk lebih banyak'}
            </div>
          )}
        </div>
      )}

      <EditLogSheet
        item={editingItem}
        open={!!editingItem}
        onClose={() => setEditingItem(null)}
        onSave={handleEdit}
      />
      <ConfirmDeleteSheet
        open={!!pendingDelete}
        title="Hapus riwayat?"
        message="Data yang dihapus tidak bisa dikembalikan."
        confirmLabel="Hapus"
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
      <PhotoViewer src={viewingPhoto} onClose={() => setViewingPhoto(null)} />
      {toast && <Toast message={toast} />}
    </div>
  )
}
