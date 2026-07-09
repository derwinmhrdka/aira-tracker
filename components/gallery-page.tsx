'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { PageHeader } from './page-header'
import { ErrorBanner } from './error-banner'
import { PhotoViewer } from './photo-viewer'
import { api, type GalleryItem } from '@/lib/api-client'
import { getDisplayPhotoUrl } from '@/lib/offline-photos'
import { useAppDataSync } from '@/lib/use-app-data-sync'

interface GalleryPageProps {
  onBack: () => void
}

function formatGalleryDate(iso: string) {
  return new Date(iso).toLocaleString('id-ID', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function sourceLabel(source: GalleryItem['source']) {
  return source === 'note' ? 'Catatan' : 'Milestone'
}

export function GalleryPage({ onBack }: GalleryPageProps) {
  const [items, setItems] = useState<GalleryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [nextOffset, setNextOffset] = useState<number | null>(null)
  const [viewing, setViewing] = useState<GalleryItem | null>(null)
  const loadMoreRef = useRef<HTMLDivElement>(null)

  const loadInitial = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) {
      setLoading(true)
      setError(false)
    }
    try {
      const data = await api.getGallery()
      setItems(data.items)
      setHasMore(data.hasMore)
      setNextOffset(data.nextOffset)
    } catch {
      if (!opts?.silent) setError(true)
    } finally {
      if (!opts?.silent) setLoading(false)
    }
  }, [])

  const loadMore = useCallback(async () => {
    if (!hasMore || nextOffset == null || loadingMore) return
    setLoadingMore(true)
    try {
      const data = await api.getGallery({ offset: nextOffset })
      setItems((prev) => [...prev, ...data.items])
      setHasMore(data.hasMore)
      setNextOffset(data.nextOffset)
    } finally {
      setLoadingMore(false)
    }
  }, [hasMore, nextOffset, loadingMore])

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

  const viewingSubtitle = viewing
    ? [
        formatGalleryDate(viewing.timestamp),
        sourceLabel(viewing.source),
        viewing.logged_by,
      ]
        .filter(Boolean)
        .join(' · ')
    : null

  return (
    <div className="px-4 pt-6 pb-8">
      <PageHeader
        title="Gallery"
        subtitle="Foto dari catatan & milestone"
        onBack={onBack}
      />

      {error ? (
        <ErrorBanner message="Gagal memuat gallery" onRetry={loadInitial} />
      ) : loading ? (
        <div className="grid grid-cols-3 gap-1.5">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="aspect-square animate-pulse rounded-lg bg-secondary" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          Belum ada foto terlampir
        </p>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-1.5">
            {items.map((item) => (
              <motion.button
                key={`${item.source}-${item.id}`}
                type="button"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={() => setViewing(item)}
                className="group relative aspect-square overflow-hidden rounded-lg bg-secondary"
                aria-label="Lihat foto"
              >
                <img
                  src={getDisplayPhotoUrl(item.photo_url)}
                  alt=""
                  className="h-full w-full object-cover transition-transform group-active:scale-95"
                />
              </motion.button>
            ))}
          </div>
          {hasMore && (
            <div
              ref={loadMoreRef}
              className="py-4 text-center text-xs text-muted-foreground"
            >
              {loadingMore ? 'Memuat...' : 'Scroll untuk lebih banyak'}
            </div>
          )}
        </>
      )}

      <PhotoViewer
        src={viewing?.photo_url ?? null}
        caption={viewing?.caption}
        subtitle={viewingSubtitle}
        onClose={() => setViewing(null)}
      />
    </div>
  )
}
