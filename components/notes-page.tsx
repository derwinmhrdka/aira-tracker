'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { PageHeader } from './page-header'
import { PhotoUpload } from './photo-upload'
import { Toast } from './toast'
import { playSoundEffect } from '@/lib/sounds'
import { api, type DailyNote } from '@/lib/api-client'

interface NotesPageProps {
  onBack: () => void
}

export function NotesPage({ onBack }: NotesPageProps) {
  const [notes, setNotes] = useState<DailyNote[]>([])
  const [content, setContent] = useState('')
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    api.getNotes().then(setNotes).finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    if (!content.trim()) return
    setSaving(true)
    try {
      await api.createNote(content.trim(), photoUrl ?? undefined)
      playSoundEffect('success')
      setToast('📝 Catatan tersimpan!')
      setContent('')
      setPhotoUrl(null)
      const updated = await api.getNotes()
      setNotes(updated)
      setTimeout(() => setToast(null), 2000)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="px-4 pt-6 pb-8">
      <PageHeader title="Notes" subtitle="Tummy time, aktivitas, dll" onBack={onBack} />

      <div className="mb-6 space-y-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Misal: Tummy time 5 menit, senang banget!"
          rows={3}
          className="w-full resize-none rounded-xl border border-input bg-background px-3 py-2.5 text-sm text-foreground"
        />
        <PhotoUpload
          onUploaded={setPhotoUrl}
          preview={photoUrl}
          label="Photo"
        />
        <button
          type="button"
          onClick={handleSave}
          disabled={!content.trim() || saving}
          className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          {saving ? '...' : 'Save'}
        </button>
      </div>

      <h2 className="font-heading mb-3 text-base font-semibold text-foreground">
        Recent
      </h2>
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-secondary" />
          ))}
        </div>
      ) : notes.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-8">Belum ada catatan</p>
      ) : (
        <div className="space-y-2">
          {notes.map((note) => (
            <motion.div
              key={note.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="rounded-xl border border-border bg-card p-3 shadow-sm"
            >
              <p className="text-sm text-foreground">{note.content}</p>
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
        </div>
      )}

      {toast && <Toast message={toast} />}
    </div>
  )
}
