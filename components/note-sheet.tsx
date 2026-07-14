'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { PhotoUpload } from './photo-upload'
import { VoiceRecorder } from './voice-recorder'
import { playSoundEffect } from '@/lib/sounds'
import { cleanupDraftUploads } from '@/lib/api-client'

const QUICK_NOTES = [
  'Tummy time 🤸',
  'Baby time 👶',
  'Mandi 🛁',
  'Cerita buku 📖',
  'Musik 🎵',
]

interface NoteSheetProps {
  open: boolean
  onClose: () => void
  onSave: (content: string, photoUrl?: string, audioUrl?: string) => Promise<void>
}

export function NoteSheet({ open, onClose, onSave }: NoteSheetProps) {
  const [content, setContent] = useState('')
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const canSave = content.trim().length > 0 || !!audioUrl

  const handleSave = async () => {
    if (!canSave) return
    setSaving(true)
    try {
      await onSave(content.trim(), photoUrl ?? undefined, audioUrl ?? undefined)
      setContent('')
      setPhotoUrl(null)
      setAudioUrl(null)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const handleClose = () => {
    void cleanupDraftUploads([photoUrl, audioUrl], [])
    setContent('')
    setPhotoUrl(null)
    setAudioUrl(null)
    onClose()
  }

  const handleQuickNote = (note: string) => {
    setContent(note)
    playSoundEffect('click')
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
            onClick={handleClose}
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed bottom-0 left-0 right-0 z-50 max-h-[85vh] overflow-y-auto rounded-t-2xl border-t border-border bg-card p-4 pb-8 shadow-2xl"
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-muted" />

            <h2 className="font-heading mb-3 text-lg font-bold text-foreground">
              Tambah Catatan
            </h2>

            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Misal: Tummy time 10 menit..."
              rows={3}
              autoFocus
              className="mb-3 w-full resize-none rounded-xl border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground"
            />

            <div className="mb-3">
              <PhotoUpload onUploaded={setPhotoUrl} preview={photoUrl} label="Photo" />
            </div>

            <div className="mb-3">
              <VoiceRecorder onRecorded={setAudioUrl} preview={audioUrl} />
            </div>

            <p className="mb-2 text-xs text-muted-foreground">Quick pick:</p>
            <div className="mb-4 flex flex-wrap gap-2">
              {QUICK_NOTES.map((note) => (
                <button
                  key={note}
                  type="button"
                  onClick={() => handleQuickNote(note)}
                  className="rounded-full bg-secondary px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-secondary/80"
                >
                  {note}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 rounded-xl border border-border bg-background py-3 text-sm font-semibold text-foreground"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={!canSave || saving}
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
