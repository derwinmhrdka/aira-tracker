'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { PageHeader } from './page-header'
import { PhotoUpload } from './photo-upload'
import { Celebration } from './celebration'
import { playSoundEffect } from '@/lib/sounds'
import { api, type Milestone, cleanupDraftUploads } from '@/lib/api-client'
import { ConfirmDeleteSheet } from './confirm-delete-sheet'

interface MilestonesPageProps {
  onBack: () => void
}

export function MilestonesPage({ onBack }: MilestonesPageProps) {
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [celebrate, setCelebrate] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Milestone | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<Milestone | null>(null)

  const resetForm = () => {
    setTitle('')
    setDescription('')
    setDate(new Date().toISOString().split('T')[0])
    setPhotoUrl(null)
    setEditing(null)
  }

  useEffect(() => {
    api.getMilestones().then(setMilestones).finally(() => setLoading(false))
  }, [])

  const openEdit = (m: Milestone) => {
    setEditing(m)
    setTitle(m.title)
    setDescription(m.description ?? '')
    setDate(m.date)
    setPhotoUrl(m.photo_url ?? null)
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!title.trim()) return
    setSaving(true)
    try {
      if (editing) {
        const updated = await api.updateMilestone(editing.id, {
          date,
          title: title.trim(),
          description: description.trim() || undefined,
          photo_url: photoUrl ?? undefined,
        })
        setMilestones((prev) =>
          prev.map((m) => (m.id === editing.id ? updated : m))
        )
      } else {
        await api.createMilestone({
          date,
          title: title.trim(),
          description: description.trim() || undefined,
          photo_url: photoUrl ?? undefined,
        })
        playSoundEffect('success')
        setCelebrate(true)
        setTimeout(() => setCelebrate(false), 2500)
        const updated = await api.getMilestones()
        setMilestones(updated)
      }
      resetForm()
      setShowForm(false)
    } finally {
      setSaving(false)
    }
  }

  const closeForm = () => {
    const savedUrls = editing ? [editing.photo_url] : []
    void cleanupDraftUploads([photoUrl], savedUrls)
    resetForm()
    setShowForm(false)
  }

  const confirmDelete = async () => {
    if (!pendingDelete) return
    const m = pendingDelete
    setDeletingId(m.id)
    try {
      await api.deleteMilestone(m.id)
      setMilestones((prev) => prev.filter((x) => x.id !== m.id))
      setPendingDelete(null)
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="px-4 pt-6 pb-8">
      <PageHeader title="Milestone" subtitle="Pencapaian spesial bayi" onBack={onBack} />

      <button
        type="button"
        onClick={() => {
          if (showForm) {
            closeForm()
          } else {
            resetForm()
            setShowForm(true)
          }
        }}
        className="mb-4 w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground"
      >
        {showForm ? 'Tutup' : '+ Tambah'}
      </button>

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-6 space-y-3 overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-sm"
          >
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
            />
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Judul: Senyum pertama, duduk sendiri..."
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
            />
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Cerita singkat (opsional)"
              rows={2}
              className="w-full resize-none rounded-xl border border-input bg-background px-3 py-2 text-sm"
            />
            <PhotoUpload onUploaded={setPhotoUrl} preview={photoUrl} />
            <button
              type="button"
              onClick={handleSave}
              disabled={!title.trim() || saving}
              className="w-full rounded-xl bg-accent py-3 text-sm font-semibold text-accent-foreground disabled:opacity-50"
            >
              {saving ? '...' : editing ? 'Simpan' : '🎉 Simpan'}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-secondary" />
          ))}
        </div>
      ) : milestones.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Belum ada milestone — catat pencapaian pertama!
        </p>
      ) : (
        <div className="space-y-3">
          {milestones.map((m, i) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="rounded-xl border border-border bg-card p-4 shadow-sm"
            >
              <div className="flex items-start gap-2">
                <span className="text-2xl">🏆</span>
                <div className="min-w-0 flex-1">
                  <p className="font-heading font-semibold text-foreground">{m.title}</p>
                  {m.description && (
                    <p className="mt-1 text-sm text-muted-foreground">{m.description}</p>
                  )}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {new Date(m.date).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    onClick={() => openEdit(m)}
                    className="rounded-lg px-2 py-1 opacity-60 hover:opacity-100"
                    aria-label="Ubah"
                  >
                    ✏️
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingDelete(m)}
                    disabled={deletingId === m.id}
                    className="rounded-lg px-2 py-1 text-destructive opacity-60 hover:opacity-100"
                    aria-label="Hapus"
                  >
                    {deletingId === m.id ? '...' : '🗑️'}
                  </button>
                </div>
              </div>
              {m.photo_url && (
                <img
                  src={m.photo_url}
                  alt=""
                  className="mt-2 h-36 w-full rounded-lg object-cover"
                />
              )}
            </motion.div>
          ))}
        </div>
      )}

      {celebrate && <Celebration />}
      <ConfirmDeleteSheet
        open={!!pendingDelete}
        title="Hapus?"
        message={
          pendingDelete
            ? `Milestone "${pendingDelete.title}" akan dihapus permanen.`
            : ''
        }
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
        loading={!!deletingId}
      />
    </div>
  )
}
