'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { getDisplayPhotoUrl } from '@/lib/offline-photos'
import { getDisplayAudioUrl } from '@/lib/offline-audio'

const SWIPE_OFFSET_THRESHOLD = 50
const SWIPE_VELOCITY_THRESHOLD = 400

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? '40%' : '-40%',
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? '-40%' : '40%',
    opacity: 0,
  }),
}

interface PhotoViewerProps {
  src: string | null
  mediaType?: 'photo' | 'audio'
  onClose: () => void
  alt?: string
  caption?: string | null
  subtitle?: string | null
  onPrevious?: () => void
  onNext?: () => void
  hasPrevious?: boolean
  hasNext?: boolean
}

export function PhotoViewer({
  src,
  mediaType = 'photo',
  onClose,
  alt = 'Foto',
  caption,
  subtitle,
  onPrevious,
  onNext,
  hasPrevious = false,
  hasNext = false,
}: PhotoViewerProps) {
  const [mounted, setMounted] = useState(false)
  const [direction, setDirection] = useState(0)
  const displaySrc = src
    ? mediaType === 'audio'
      ? getDisplayAudioUrl(src)
      : getDisplayPhotoUrl(src)
    : null
  const canNavigate = Boolean(onPrevious || onNext)
  const viewerKey = displaySrc ? `${mediaType}:${displaySrc}` : null

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!displaySrc) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft' && hasPrevious && onPrevious) {
        setDirection(-1)
        onPrevious()
      }
      if (e.key === 'ArrowRight' && hasNext && onNext) {
        setDirection(1)
        onNext()
      }
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [displaySrc, onClose, hasPrevious, hasNext, onPrevious, onNext])

  const handleDragEnd = (
    _: MouseEvent | TouchEvent | PointerEvent,
    info: { offset: { x: number }; velocity: { x: number } }
  ) => {
    if (!canNavigate) return
    const { offset, velocity } = info
    if (
      (offset.x < -SWIPE_OFFSET_THRESHOLD || velocity.x < -SWIPE_VELOCITY_THRESHOLD) &&
      hasNext &&
      onNext
    ) {
      setDirection(1)
      onNext()
      return
    }
    if (
      (offset.x > SWIPE_OFFSET_THRESHOLD || velocity.x > SWIPE_VELOCITY_THRESHOLD) &&
      hasPrevious &&
      onPrevious
    ) {
      setDirection(-1)
      onPrevious()
    }
  }

  if (!mounted) return null

  return createPortal(
    <AnimatePresence>
      {displaySrc && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/90 p-4"
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label={mediaType === 'audio' ? 'Pratinjau audio' : 'Pratinjau foto'}
        >
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 z-[101] rounded-full bg-black/50 px-3 py-1.5 text-sm text-white"
            aria-label="Tutup"
          >
            ✕
          </button>

          <div
            className="flex w-full max-w-lg flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={viewerKey ?? displaySrc}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ type: 'spring', stiffness: 320, damping: 32 }}
                drag={canNavigate ? 'x' : false}
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.12}
                onDragEnd={handleDragEnd}
                className="flex w-full touch-pan-y flex-col items-center"
              >
                {mediaType === 'audio' ? (
                  <div className="w-full max-w-md rounded-2xl bg-white/10 p-6">
                    <div className="mb-4 text-center text-5xl">🎤</div>
                    <audio
                      key={displaySrc}
                      src={displaySrc}
                      controls
                      autoPlay
                      className="w-full"
                    />
                  </div>
                ) : (
                  <img
                    src={displaySrc}
                    alt={alt}
                    className="max-h-[min(70vh,100%)] max-w-full rounded-lg object-contain"
                    draggable={false}
                  />
                )}
                {(caption || subtitle) && (
                  <div className="mt-4 max-w-md px-2 text-center">
                    {caption && (
                      <p className="text-sm leading-relaxed text-white/95">{caption}</p>
                    )}
                    {subtitle && (
                      <p className="mt-1.5 text-xs text-white/65">{subtitle}</p>
                    )}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
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
