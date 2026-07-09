'use client'

import { useRef, useState } from 'react'
import { api } from '@/lib/api-client'
import { compressImage } from '@/lib/compress-image'
import { getDisplayPhotoUrl, isLocalPhotoUrl } from '@/lib/offline-photos'
import { PhotoViewer } from './photo-viewer'

interface PhotoUploadProps {
  onUploaded: (url: string) => void
  label?: string
  preview?: string | null
}

export function PhotoUpload({ onUploaded, label = 'Photo', preview }: PhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [localPreview, setLocalPreview] = useState<string | null>(null)
  const [viewerOpen, setViewerOpen] = useState(false)
  const previewSrc = localPreview || (preview ? getDisplayPhotoUrl(preview) : null)
  const viewerSrc = viewerOpen ? (localPreview || preview) : null

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const compressed = await compressImage(file)
      if (compressed.size > 1.5 * 1024 * 1024) {
        alert('Foto masih terlalu besar (max 1.5MB)')
        return
      }
      const { photo_url } = await api.uploadPhoto(compressed)
      if (isLocalPhotoUrl(photo_url)) {
        setLocalPreview(URL.createObjectURL(compressed))
      } else {
        setLocalPreview(null)
      }
      onUploaded(photo_url)
    } catch {
      alert('Gagal upload foto — coba lagi saat online')
    }
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-secondary/50 py-3 text-sm text-foreground"
      >
        📷 {label}
      </button>
      {(localPreview || preview) && (
        <button
          type="button"
          onClick={() => setViewerOpen(true)}
          className="mt-2 block w-full"
          aria-label="Lihat foto"
        >
          <img
            src={previewSrc || ''}
            alt="Preview"
            className="h-24 w-full cursor-zoom-in rounded-xl object-cover"
          />
        </button>
      )}
      <PhotoViewer
        src={viewerSrc}
        onClose={() => setViewerOpen(false)}
        alt="Preview"
      />
    </div>
  )
}
