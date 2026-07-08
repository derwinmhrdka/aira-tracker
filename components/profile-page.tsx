'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { PageHeader } from './page-header'
import { PhotoUpload } from './photo-upload'
import { Toast } from './toast'
import { playSoundEffect } from '@/lib/sounds'
import { api, type BabyProfile, cleanupDraftUploads } from '@/lib/api-client'

interface ProfilePageProps {
  onBack: () => void
}

export function ProfilePage({ onBack }: ProfilePageProps) {
  const [profile, setProfile] = useState<BabyProfile | null>(null)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({
    name: '',
    birth_date: '',
    birth_weight_kg: '',
    birth_height_cm: '',
    blood_type: '',
    parent_names: '',
    photo_url: '' as string | null,
    gender: 'MALE' as 'MALE' | 'FEMALE',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    api
      .getBabyProfile()
      .then((p) => {
        setProfile(p)
        setForm({
          name: p.name,
          birth_date: p.birth_date,
          birth_weight_kg: String(p.birth_weight_kg ?? ''),
          birth_height_cm: String(p.birth_height_cm ?? ''),
          blood_type: p.blood_type ?? '',
          parent_names: p.parent_names ?? '',
          photo_url: p.photo_url ?? null,
          gender: p.gender ?? 'MALE',
        })
      })
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      const updated = await api.updateBabyProfile({
        name: form.name,
        birth_date: form.birth_date,
        birth_weight_kg: form.birth_weight_kg ? parseFloat(form.birth_weight_kg) : undefined,
        birth_height_cm: form.birth_height_cm ? parseFloat(form.birth_height_cm) : undefined,
        blood_type: form.blood_type || undefined,
        parent_names: form.parent_names || undefined,
        photo_url: form.photo_url ?? undefined,
        gender: form.gender,
      })
      setProfile(updated)
      setEditing(false)
      playSoundEffect('success')
      setToast('👶 Profil tersimpan!')
      setTimeout(() => setToast(null), 2000)
    } finally {
      setSaving(false)
    }
  }

  const handleCancelEdit = () => {
    void cleanupDraftUploads([form.photo_url], [profile?.photo_url])
    if (profile) {
      setForm({
        name: profile.name,
        birth_date: profile.birth_date,
        birth_weight_kg: String(profile.birth_weight_kg ?? ''),
        birth_height_cm: String(profile.birth_height_cm ?? ''),
        blood_type: profile.blood_type ?? '',
        parent_names: profile.parent_names ?? '',
        photo_url: profile.photo_url ?? null,
        gender: profile.gender ?? 'MALE',
      })
    }
    setEditing(false)
  }

  if (loading) {
    return (
      <div className="px-4 pt-6">
        <div className="h-64 animate-pulse rounded-2xl bg-secondary" />
      </div>
    )
  }

  return (
    <div className="px-4 pt-6 pb-8">
      <PageHeader title="Profil Bayi" subtitle="Kartu identitas" onBack={onBack} />

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-border bg-card p-5 shadow-sm"
      >
        <div className="mb-4 flex flex-col items-center">
          {form.photo_url ? (
            <img
              src={form.photo_url}
              alt={form.name}
              className="h-24 w-24 rounded-full object-cover ring-4 ring-primary/30"
            />
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-secondary text-4xl">
              👶
            </div>
          )}
          {!editing && (
            <>
              <h2 className="font-heading mt-3 text-xl font-bold text-foreground">
                {profile?.name}
              </h2>
              {(profile?.horoscope || profile?.shio) && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {profile.horoscope_emoji && profile.horoscope
                    ? `${profile.horoscope_emoji} ${profile.horoscope}`
                    : null}
                  {profile.horoscope && profile.shio ? ' · ' : null}
                  {profile.shio ? profile.shio : null}
                </p>
              )}
            </>
          )}
        </div>

        {editing ? (
          <div className="space-y-3">
            <PhotoUpload
              onUploaded={(url) => setForm((f) => ({ ...f, photo_url: url }))}
              preview={form.photo_url}
              label="Photo"
            />
            <div>
              <label className="mb-1 block text-xs font-medium">Jenis kelamin</label>
              <div className="flex gap-2">
                {(['MALE', 'FEMALE'] as const).map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, gender: g }))}
                    className={`flex-1 rounded-xl py-2.5 text-sm font-medium ${
                      form.gender === g
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary text-foreground'
                    }`}
                  >
                    {g === 'MALE' ? '👦 Laki' : '👧 Wanita'}
                  </button>
                ))}
              </div>
            </div>
            {[
              { key: 'name', label: 'Nama', type: 'text' },
              { key: 'birth_date', label: 'Tanggal lahir', type: 'date' },
              { key: 'birth_weight_kg', label: 'Berat lahir (kg)', type: 'number' },
              { key: 'birth_height_cm', label: 'Panjang lahir (cm)', type: 'number' },
              { key: 'blood_type', label: 'Golongan darah', type: 'text' },
              { key: 'parent_names', label: 'Nama orang tua', type: 'text' },
            ].map((field) => (
              <div key={field.key}>
                <label className="mb-1 block text-xs font-medium">{field.label}</label>
                <input
                  type={field.type}
                  value={form[field.key as keyof typeof form] as string}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, [field.key]: e.target.value }))
                  }
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
            ))}
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={handleCancelEdit}
                className="flex-1 rounded-xl border border-border py-2.5 text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
              >
                {saving ? '...' : 'Save'}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2 text-sm">
            <Row
              label="Jenis kelamin"
              value={profile?.gender === 'FEMALE' ? '👧 Perempuan' : '👦 Laki-laki'}
            />
            <Row label="Tanggal lahir" value={profile?.birth_date} />
            <Row
              label="Horoskop"
              value={
                profile?.horoscope
                  ? `${profile.horoscope_emoji ?? ''} ${profile.horoscope}`.trim()
                  : '-'
              }
            />
            <Row label="Shio" value={profile?.shio ? profile.shio : '-'} />
            <Row
              label="Berat"
              value={
                profile?.latest_weight_kg != null
                  ? `${profile.latest_weight_kg} kg`
                  : profile?.birth_weight_kg
                    ? `${profile.birth_weight_kg} kg`
                    : '-'
              }
            />
            <Row
              label="Panjang"
              value={
                profile?.latest_height_cm != null
                  ? `${profile.latest_height_cm} cm`
                  : profile?.birth_height_cm
                    ? `${profile.birth_height_cm} cm`
                    : '-'
              }
            />
            <Row label="Gol. darah" value={profile?.blood_type ?? '-'} />
            <Row label="Orang tua" value={profile?.parent_names ?? '-'} />
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="mt-4 w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground"
            >
              Edit
            </button>
          </div>
        )}
      </motion.div>

      {toast && <Toast message={toast} />}
    </div>
  )
}

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex justify-between rounded-lg bg-secondary/50 px-3 py-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value ?? '-'}</span>
    </div>
  )
}
