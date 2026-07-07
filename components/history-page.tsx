'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion } from 'framer-motion'
import { api, type HistoryItem, type UpdateLogInput } from '@/lib/api-client'
import { EditLogSheet } from './edit-log-sheet'
import { Toast } from './toast'
import { ConfirmDeleteSheet } from './confirm-delete-sheet'

const TYPE_EMOJI: Record<string, string> = {
  pup: '💩', pee: '💧', both: '💩💧', feed: '🍼', 'feed-end': '🍼',
  sleep: '😴', wake: '☀️', note: '📝',
}

const TYPE_LABEL: Record<string, string> = {
  pup: 'Pup', pee: 'Pipis', both: 'Keduanya', feed: 'Mulai Menyusui',
  'feed-end': 'Selesai Menyusui', sleep: 'Mulai Tidur', wake: 'Bangun', note: 'Catatan',
}

const FILTERS = [
  { id: '', label: 'All' },
  { id: 'diaper', label: 'Popok' },
  { id: 'feeding', label: 'Susu' },
  { id: 'sleep', label: 'Tidur' },
  { id: 'note', label: 'Notes' },
]

const DAY_FILTERS = [
  { days: 1, label: 'Today' },
  { days: 7, label: '7d' },
  { days: 30, label: '30d' },
]

const PAGE_SIZE = 15

export function HistoryPage() {
  const [items, setItems] = useState<HistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [nextOffset, setNextOffset] = useState(0)
  const [category, setCategory] = useState('')
  const [days, setDays] = useState(7)
  const loadMoreRef = useRef<HTMLDivElement>(null)
  const requestIdRef = useRef(0)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [editingItem, setEditingItem] = useState<HistoryItem | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<HistoryItem | null>(null)

  const loadInitial = useCallback(async () => {
    const requestId = ++requestIdRef.current
    setLoading(true)
    setLoadingMore(false)
    setItems([])
    setHasMore(false)
    setNextOffset(0)
    try {
      if (category) {
        const allItems = await api.getAllHistory(days, category)
        if (requestId !== requestIdRef.current) return
        setItems(allItems)
      } else {
        const data = await api.getHistory(days, undefined, {
          limit: PAGE_SIZE,
          offset: 0,
        })
        if (requestId !== requestIdRef.current) return
        setItems(data.items)
        setHasMore(data.hasMore)
        setNextOffset(data.nextOffset ?? PAGE_SIZE)
      }
    } catch {
      // handled
    } finally {
      if (requestId === requestIdRef.current) setLoading(false)
    }
  }, [days, category])

  const loadMore = useCallback(async () => {
    if (category || !hasMore || loadingMore || loading) return
    const requestId = requestIdRef.current
    setLoadingMore(true)
    try {
      const data = await api.getHistory(days, undefined, {
        limit: PAGE_SIZE,
        offset: nextOffset,
      })
      if (requestId !== requestIdRef.current) return
      setItems((prev) => [...prev, ...data.items])
      setHasMore(data.hasMore)
      setNextOffset(data.nextOffset ?? nextOffset + PAGE_SIZE)
    } catch {
      // handled
    } finally {
      if (requestId === requestIdRef.current) setLoadingMore(false)
    }
  }, [days, category, hasMore, loadingMore, loading, nextOffset])

  useEffect(() => {
    loadInitial()
  }, [loadInitial])

  useEffect(() => {
    const el = loadMoreRef.current
    if (!el || !hasMore || category) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore()
      },
      { rootMargin: '120px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasMore, loadMore, category])

  const handleEdit = async (data: UpdateLogInput) => {
    if (!editingItem) return
    const updated = await api.updateLog(editingItem.category, editingItem.id, data)
    setItems((prev) =>
      prev.map((i) =>
        i.id === editingItem.id && i.category === editingItem.category ? updated : i
      )
    )
    setToast('✓ Perubahan tersimpan')
    setTimeout(() => setToast(null), 2000)
  }

  const confirmDelete = async () => {
    if (!pendingDelete) return
    const item = pendingDelete
    setDeletingId(item.id)
    try {
      await api.deleteLog(item.category, item.id)
      setItems((prev) => prev.filter((i) => i.id !== item.id))
      setPendingDelete(null)
    } catch {
      alert('Gagal menghapus')
    } finally {
      setDeletingId(null)
    }
  }

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleString('id-ID', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })

  return (
    <div className="space-y-4 px-4 pt-6 pb-8">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">History</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Filter untuk cari aktivitas
        </p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {DAY_FILTERS.map((f) => (
          <button
            key={f.days}
            type="button"
            onClick={() => setDays(f.days)}
            className={`shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition-colors ${
              days === f.days
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-foreground'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setCategory(f.id)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              category === f.id
                ? 'bg-accent text-accent-foreground'
                : 'bg-secondary/60 text-muted-foreground'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-secondary" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="mt-8 flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-border py-12">
          <span className="text-4xl opacity-40">📋</span>
          <p className="text-sm text-muted-foreground">Belum ada riwayat</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
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
                {item.details && (
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {item.details}
                  </p>
                )}
                {item.photo_url && (
                  <img
                    src={item.photo_url}
                    alt=""
                    className="mt-2 h-16 w-16 rounded-lg object-cover"
                  />
                )}
              </div>
              <div className="flex shrink-0 gap-1">
                <button
                  type="button"
                  onClick={() => setEditingItem(item)}
                  className="rounded-lg px-2 py-2 text-xs opacity-60 hover:opacity-100"
                  aria-label="Edit"
                >
                  ✏️
                </button>
                <button
                  type="button"
                  onClick={() => setPendingDelete(item)}
                  disabled={deletingId === item.id}
                  className="rounded-lg px-2 py-2 text-xs text-destructive opacity-60 hover:opacity-100"
                  aria-label="Delete"
                >
                  {deletingId === item.id ? '...' : '🗑️'}
                </button>
              </div>
            </motion.div>
          ))}
          {hasMore && (
            <div ref={loadMoreRef} className="py-2">
              {loadingMore && (
                <div className="space-y-2">
                  {[1, 2].map((i) => (
                    <div
                      key={i}
                      className="h-16 animate-pulse rounded-xl bg-secondary"
                    />
                  ))}
                </div>
              )}
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
      {toast && <Toast message={toast} />}
      <ConfirmDeleteSheet
        open={!!pendingDelete}
        title="Delete?"
        message="Catatan ini akan dihapus permanen."
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
        loading={!!deletingId}
      />
    </div>
  )
}
