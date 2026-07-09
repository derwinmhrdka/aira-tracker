'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { getDisplayPhotoUrl } from '@/lib/offline-photos'

interface PhotoViewerProps {
  src: string | null
  onClose: () => void
  alt?: string
  caption?: string | null
  subtitle?: string | null
}

export function PhotoViewer({
  src,
  onClose,
  alt = 'Foto',
  caption,
  subtitle,
}: PhotoViewerProps) {
  const [mounted, setMounted] = useState(false)
  const displaySrc = src ? getDisplayPhotoUrl(src) : null

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!displaySrc) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [displaySrc, onClose])

  if (!mounted) return null

  return createPortal(
    <AnimatePresence>
      {displaySrc && (
        <motion.div
          key={displaySrc}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/90 p-4"
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label="Pratinjau foto"
        >
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 z-[101] rounded-full bg-black/50 px-3 py-1.5 text-sm text-white"
            aria-label="Tutup"
          >
            ✕
          </button>
          <motion.img
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            src={displaySrc}
            alt={alt}
            className="max-h-[min(70vh,100%)] max-w-full rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          {(caption || subtitle) && (
            <div
              className="mt-4 max-w-md px-2 text-center"
              onClick={(e) => e.stopPropagation()}
            >
              {caption && (
                <p className="text-sm leading-relaxed text-white/95">{caption}</p>
              )}
              {subtitle && (
                <p className="mt-1.5 text-xs text-white/65">{subtitle}</p>
              )}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  )
}

interface ClickablePhotoProps {
  src: string
  className?: string
  wrapperClassName?: string
  alt?: string
  onView?: (src: string) => void
}

export function ClickablePhoto({
  src,
  className,
  wrapperClassName,
  alt = '',
  onView,
}: ClickablePhotoProps) {
  const [open, setOpen] = useState(false)
  const displaySrc = getDisplayPhotoUrl(src)

  const handleOpen = () => {
    if (onView) {
      onView(src)
      return
    }
    setOpen(true)
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className={wrapperClassName ?? 'block'}
        aria-label="Lihat foto"
      >
        <img
          src={displaySrc}
          alt={alt}
          className={`cursor-zoom-in object-cover ${className ?? ''}`}
        />
      </button>
      {!onView && (
        <PhotoViewer src={open ? src : null} onClose={() => setOpen(false)} alt={alt} />
      )}
    </>
  )
}
