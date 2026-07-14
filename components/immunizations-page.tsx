'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { PageHeader } from './page-header'
import { api, type Immunization } from '@/lib/api-client'
import {
  STATUS_LABEL,
  STATUS_STYLE,
  type VaccineStatus,
} from '@/lib/immunization-utils'

interface ImmunizationsPageProps {
  onBack: () => void
}

export function ImmunizationsPage({ onBack }: ImmunizationsPageProps) {
  const [items, setItems] = useState<Immunization[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [dateGiven, setDateGiven] = useState('')
  const [notes, setNotes] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [newAge, setNewAge] = useState('0')
  const [newNotes, setNewNotes] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.getImmunizations().then(setItems).finally(() => setLoading(false))
  }, [])

  const startEdit = (item: Immunization) => {
    setEditingId(item.id)
    setDateGiven(item.date_given || new Date().toISOString().split('T')[0])
    setNotes(item.notes ?? '')
  }

  const toggle = async (item: Immunization) => {
    if (!item.is_done) {
      startEdit(item)
      return
    }
  }

  const confirmDate = async (id: string) => {
    const updated = await api.updateImmunization(id, {
      is_done: true,
      date_given: dateGiven,
      notes: notes.trim() || undefined,
    })
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, ...updated } : i))
    )
    setEditingId(null)
  }

  const uncheck = async (item: Immunization) => {
    const updated = await api.updateImmunization(item.id, {
      is_done: false,
      date_given: null,
    })
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, ...updated } : i))
    )
    setEditingId(null)
  }

  const addCustom = async () => {
    const name = newName.trim()
    if (!name) return
    setSaving(true)
    try {
      const created = await api.createImmunization({
        vaccine_name: name,
        scheduled_age_months: Number(newAge) || 0,
        notes: newNotes.trim() || undefined,
      })
      setItems((prev) => [...prev, created].sort(
        (a, b) => a.scheduled_age_months - b.scheduled_age_months
      ))
      setNewName('')
      setNewAge('0')
      setNewNotes('')
      setShowAdd(false)
    } finally {
      setSaving(false)
    }
  }

  const removeCustom = async (item: Immunization) => {
    if (!item.is_custom) return
    if (!confirm(`Hapus vaksin "${item.vaccine_name}"?`)) return
    await api.deleteImmunization(item.id)
    setItems((prev) => prev.filter((i) => i.id !== item.id))
  }

  const grouped = items.reduce<Record<number, Immunization[]>>((acc, item) => {
    const age = item.scheduled_age_months
    if (!acc[age]) acc[age] = []
    acc[age].push(item)
    return acc
  }, {})

  const overdueCount = items.filter((i) => i.status === 'overdue').length

  return (
    <div className="px-4 pt-6 pb-8">
      <PageHeader title="Imunisasi" subtitle="Jadwal vaksin Kemenkes/IDAI" onBack={onBack} />

      {overdueCount > 0 && (
        <div className="mb-4 rounded-xl border border-red-300/50 bg-red-50/50 px-3 py-2 text-sm text-red-800 dark:bg-red-950/20 dark:text-red-300">
          ⚠️ {overdueCount} vaksin terlambat — segera konsultasi ke dokter
        </div>
      )}

      <button
        type="button"
        onClick={() => setShowAdd((v) => !v)}
        className="mb-4 w-full rounded-xl border border-dashed border-border py-3 text-sm font-semibold text-foreground"
      >
        {showAdd ? 'Batal' : '+ Tambah Vaksin'}
      </button>

      {showAdd && (
        <div className="mb-4 space-y-2 rounded-xl border border-border bg-card p-3">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nama vaksin"
            className="w-full rounded-lg border border-input bg-background px-2 py-1.5 text-sm"
          />
          <input
            type="number"
            value={newAge}
            onChange={(e) => setNewAge(e.target.value)}
            placeholder="Usia jadwal (bulan)"
            className="w-full rounded-lg border border-input bg-background px-2 py-1.5 text-sm"
          />
          <input
            type="text"
            value={newNotes}
            onChange={(e) => setNewNotes(e.target.value)}
            placeholder="Catatan (opsional)"
            className="w-full rounded-lg border border-input bg-background px-2 py-1.5 text-sm"
          />
          <button
            type="button"
            onClick={addCustom}
            disabled={!newName.trim() || saving}
            className="w-full rounded-lg bg-primary py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50"
          >
            {saving ? '...' : 'Simpan'}
          </button>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-secondary" />
          ))}
        </div>
      ) : (
        Object.entries(grouped)
          .sort(([a], [b]) => Number(a) - Number(b))
          .map(([age, vaccines]) => (
            <div key={age} className="mb-4">
              <h2 className="font-heading mb-2 text-sm font-semibold text-muted-foreground">
                Usia {age} bulan
              </h2>
              <div className="space-y-2">
                {vaccines.map((item) => {
                  const status = (item.status ?? (item.is_done ? 'done' : 'upcoming')) as VaccineStatus
                  return (
                    <motion.div
                      key={item.id}
                      layout
                      className={`rounded-xl border p-3 shadow-sm ${
                        item.is_done
                          ? 'border-green-300/50 bg-green-50/50 dark:bg-green-950/20'
                          : status === 'overdue'
                            ? 'border-red-300/50 bg-red-50/30 dark:bg-red-950/10'
                            : 'border-border bg-card'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => toggle(item)}
                          className="text-xl"
                        >
                          {item.is_done ? '✅' : status === 'overdue' ? '⚠️' : '⬜'}
                        </button>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-heading text-sm font-semibold text-foreground">
                              {item.vaccine_name}
                              {item.dose_label ? (
                                <span className="font-normal text-muted-foreground">
                                  {' '}
                                  · {item.dose_label}
                                </span>
                              ) : null}
                            </p>
                            {item.is_national_program === false && (
                              <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                                Anjuran
                              </span>
                            )}
                            {item.is_custom && (
                              <span className="rounded-full bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground">
                                Custom
                              </span>
                            )}
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_STYLE[status]}`}
                            >
                              {STATUS_LABEL[status]}
                            </span>
                          </div>
                          {item.date_given && (
                            <p className="text-xs text-muted-foreground">
                              {new Date(item.date_given).toLocaleDateString('id-ID')}
                            </p>
                          )}
                          {item.notes && (
                            <p className="mt-0.5 text-xs text-muted-foreground">{item.notes}</p>
                          )}
                          {!item.is_done && item.schedule_notes && (
                            <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground/90">
                              {item.schedule_notes}
                            </p>
                          )}
                        </div>
                        <div className="flex shrink-0 flex-col gap-1">
                          {item.is_done && (
                            <button
                              type="button"
                              onClick={() => startEdit(item)}
                              className="rounded-lg px-2 py-1 text-xs opacity-60 hover:opacity-100"
                              aria-label="Ubah"
                            >
                              ✏️
                            </button>
                          )}
                          {item.is_custom && (
                            <button
                              type="button"
                              onClick={() => removeCustom(item)}
                              className="rounded-lg px-2 py-1 text-xs text-destructive opacity-60 hover:opacity-100"
                              aria-label="Hapus"
                            >
                              🗑️
                            </button>
                          )}
                        </div>
                      </div>
                      {editingId === item.id && (
                        <div className="mt-2 space-y-2">
                          <input
                            type="date"
                            value={dateGiven}
                            onChange={(e) => setDateGiven(e.target.value)}
                            className="w-full rounded-lg border border-input bg-background px-2 py-1.5 text-sm"
                          />
                          <input
                            type="text"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Catatan (lokasi, batch, dll)"
                            className="w-full rounded-lg border border-input bg-background px-2 py-1.5 text-sm"
                          />
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => confirmDate(item.id)}
                              className="flex-1 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground"
                            >
                              Simpan
                            </button>
                            {item.is_done && (
                              <button
                                type="button"
                                onClick={() => uncheck(item)}
                                className="rounded-lg border border-destructive/30 px-3 py-2 text-xs font-semibold text-destructive"
                              >
                                Uncheck
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )
                })}
              </div>
            </div>
          ))
      )}
    </div>
  )
}
