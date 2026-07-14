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

function sourceLabel(source: GalleryItem['source'], mediaType: GalleryItem['media_type']) {
  if (mediaType === 'audio') return 'Audio catatan'
  return source === 'note' ? 'Catatan' : 'Milestone'
}

function galleryItemKey(item: GalleryItem) {
  return `${item.source}-${item.id}-${item.media_type}`
}

function viewingMediaSrc(item: GalleryItem | null) {
  if (!item) return null
  return item.media_type === 'audio' ? item.audio_url : item.photo_url
}

export function GalleryPage({ onBack }: GalleryPageProps) {
  const [items, setItems] = useState<GalleryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [nextOffset, setNextOffset] = useState<number | null>(null)
  const [viewingIndex, setViewingIndex] = useState<number | null>(null)
  const loadMoreRef = useRef<HTMLDivElement>(null)

  const viewing = viewingIndex != null ? (items[viewingIndex] ?? null) : null

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

  const handlePrevious = useCallback(() => {
    setViewingIndex((current) => {
      if (current == null || current <= 0) return current
      return current - 1
    })
  }, [])

  const handleNext = useCallback(async () => {
    if (viewingIndex == null) return
    if (viewingIndex < items.length - 1) {
      setViewingIndex(viewingIndex + 1)
      return
    }
    if (!hasMore || loadingMore || nextOffset == null) return
    setLoadingMore(true)
    try {
      const data = await api.getGallery({ offset: nextOffset })
      if (data.items.length === 0) return
      setItems((prev) => [...prev, ...data.items])
      setHasMore(data.hasMore)
      setNextOffset(data.nextOffset)
      setViewingIndex(viewingIndex + 1)
    } finally {
      setLoadingMore(false)
    }
  }, [viewingIndex, items.length, hasMore, loadingMore, nextOffset])

  const viewingSubtitle = viewing
    ? [
        formatGalleryDate(viewing.timestamp),
        sourceLabel(viewing.source, viewing.media_type),
        viewing.logged_by,
      ]
        .filter(Boolean)
        .join(' · ')
    : null

  return (
    <div className="px-4 pt-6 pb-8">
      <PageHeader
        title="Galeri"
        subtitle="Foto & audio dari catatan & milestone"
        onBack={onBack}
      />

      {error ? (
        <ErrorBanner message="Gagal memuat galeri" onRetry={loadInitial} />
      ) : loading ? (
        <div className="grid grid-cols-3 gap-1.5">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="aspect-square animate-pulse rounded-lg bg-secondary" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          Belum ada lampiran
        </p>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-1.5">
            {items.map((item, index) => (
              <motion.button
                key={galleryItemKey(item)}
                type="button"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={() => setViewingIndex(index)}
                className="group relative aspect-square overflow-hidden rounded-lg bg-secondary"
                aria-label={item.media_type === 'audio' ? 'Lihat audio' : 'Lihat foto'}
              >
                {item.media_type === 'audio' ? (
                  <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-violet-500/25 to-sky-500/20">
                    <span className="text-3xl">🎤</span>
                  </div>
                ) : (
                  <img
                    src={getDisplayPhotoUrl(item.photo_url!)}
                    alt=""
                    className="h-full w-full object-cover transition-transform group-active:scale-95"
                  />
                )}
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
        mediaType={viewing?.media_type ?? 'photo'}
        src={viewingMediaSrc(viewing)}
        caption={viewing?.caption}
        subtitle={viewingSubtitle}
        onClose={() => setViewingIndex(null)}
        onPrevious={handlePrevious}
        onNext={handleNext}
        hasPrevious={viewingIndex != null && viewingIndex > 0}
        hasNext={
          viewingIndex != null &&
          (viewingIndex < items.length - 1 || hasMore)
        }
      />
    </div>
  )
}
