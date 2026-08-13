'use client'

import { useMemo, useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { PageHeader } from './page-header'
import { api, type Immunization } from '@/lib/api-client'
import { ageInWeeks } from '@/lib/baby-utils'
import {
  STATUS_LABEL,
  STATUS_STYLE,
  type VaccineStatus,
} from '@/lib/immunization-utils'
import {
  DOSE_KIND_LABEL,
  DOSE_KIND_STYLE,
  formatVaccineRange,
  getCatchUpRuleLines,
  getDoseKind,
  groupImmunizationsTimeline,
} from '@/lib/immunization-idai'
import { ImmunizationScheduleChart } from './immunization-schedule-chart'

interface ImmunizationsPageProps {
  onBack: () => void
}

function VaccineCard({
  item,
  editingId,
  dateGiven,
  notes,
  onToggle,
  onStartEdit,
  onConfirm,
  onUncheck,
  onRemove,
  setDateGiven,
  setNotes,
}: {
  item: Immunization
  editingId: string | null
  dateGiven: string
  notes: string
  onToggle: (item: Immunization) => void
  onStartEdit: (item: Immunization) => void
  onConfirm: (id: string) => void
  onUncheck: (item: Immunization) => void
  onRemove: (item: Immunization) => void
  setDateGiven: (v: string) => void
  setNotes: (v: string) => void
}) {
  const status = (item.status ?? (item.is_done ? 'done' : 'upcoming')) as VaccineStatus
  const doseKind = getDoseKind(item.dose_label)
  const catchUpLines = getCatchUpRuleLines(item.vaccine_name)
  const windowLabel = formatVaccineRange(
    item.min_weeks,
    item.max_weeks,
    item.scheduled_age_weeks
  )

  return (
    <motion.div
      layout
      className={`rounded-xl border p-3 shadow-sm ${
        item.is_done
          ? 'border-green-300/50 bg-green-50/50 dark:bg-green-950/20'
          : status === 'overdue'
            ? 'border-red-300/50 bg-red-50/30 dark:bg-red-950/10'
            : 'border-border bg-card'
      }`}
    >
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={() => onToggle(item)}
          className="mt-0.5 text-xl leading-none"
        >
          {item.is_done ? '✅' : status === 'overdue' ? '⚠️' : '⬜'}
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="font-heading text-sm font-semibold text-foreground">
              {item.vaccine_name}
              {item.dose_label ? (
                <span className="font-normal text-muted-foreground">
                  {' '}
                  · {item.dose_label}
                </span>
              ) : null}
            </p>
          </div>

          <div className="mt-1.5 flex flex-wrap gap-1">
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_STYLE[status]}`}
            >
              {STATUS_LABEL[status]}
            </span>
            {doseKind !== 'routine' && (
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${DOSE_KIND_STYLE[doseKind]}`}
              >
                {DOSE_KIND_LABEL[doseKind]}
              </span>
            )}
            {item.is_national_program === false && (
              <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                Anjuran
              </span>
            )}
            {item.is_national_program !== false && !item.is_custom && (
              <span className="rounded-full bg-sky-100 px-1.5 py-0.5 text-[10px] text-sky-800 dark:bg-sky-950/40 dark:text-sky-300">
                Program
              </span>
            )}
            {item.is_custom && (
              <span className="rounded-full bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground">
                Custom
              </span>
            )}
          </div>

          {windowLabel && (
            <p className="mt-1 text-[10px] tabular-nums text-muted-foreground">
              {windowLabel}
            </p>
          )}

          {item.date_given && (
            <p className="mt-1 text-xs text-muted-foreground">
              {new Date(item.date_given).toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </p>
          )}

          {item.notes && (
            <p className="mt-1 text-[11px] italic text-muted-foreground">
              {item.notes}
            </p>
          )}

          {catchUpLines.length > 0 &&
            (status === 'overdue' || doseKind !== 'routine') && (
            <ul className="mt-1.5 space-y-0.5">
              {catchUpLines.slice(0, 2).map((line) => (
                <li
                  key={line}
                  className="text-[10px] leading-snug text-muted-foreground"
                >
                  · {line}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex shrink-0 flex-col gap-1">
          {item.is_done && (
            <button
              type="button"
              onClick={() => onStartEdit(item)}
              className="rounded-lg px-2 py-1 text-xs opacity-60 hover:opacity-100"
              aria-label="Ubah"
            >
              ✏️
            </button>
          )}
          {item.is_custom && (
            <button
              type="button"
              onClick={() => onRemove(item)}
              className="rounded-lg px-2 py-1 text-xs text-destructive opacity-60 hover:opacity-100"
              aria-label="Hapus"
            >
              🗑️
            </button>
          )}
        </div>
      </div>

      {editingId === item.id && (
        <div className="mt-2 space-y-2 border-t border-border/50 pt-2">
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
              onClick={() => onConfirm(item.id)}
              className="flex-1 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground"
            >
              Simpan
            </button>
            {item.is_done && (
              <button
                type="button"
                onClick={() => onUncheck(item)}
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
}

export function ImmunizationsPage({ onBack }: ImmunizationsPageProps) {
  const [items, setItems] = useState<Immunization[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'chart' | 'list'>('chart')
  const [babyAgeWeeks, setBabyAgeWeeks] = useState<number | null>(null)
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
    api.getBabyProfile().then((baby) => {
      if (baby?.birth_date) {
        setBabyAgeWeeks(ageInWeeks(baby.birth_date))
      }
    }).catch(() => {})
  }, [])

  const timeline = useMemo(() => groupImmunizationsTimeline(items), [items])
  const overdueCount = items.filter((i) => i.status === 'overdue').length
  const doneCount = items.filter((i) => i.is_done).length

  const startEdit = (item: Immunization) => {
    setEditingId(item.id)
    setDateGiven(item.date_given || new Date().toISOString().split('T')[0])
    setNotes(item.notes ?? '')
  }

  const toggle = async (item: Immunization) => {
    if (!item.is_done) startEdit(item)
  }

  const confirmDate = async (id: string) => {
    const updated = await api.updateImmunization(id, {
      is_done: true,
      date_given: dateGiven,
      notes: notes.trim() || undefined,
    })
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...updated } : i)))
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
      setItems((prev) =>
        [...prev, created].sort(
          (a, b) => a.scheduled_age_months - b.scheduled_age_months
        )
      )
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

  return (
    <div className="px-4 pt-6 pb-8">
      <PageHeader title="Imunisasi" onBack={onBack} />

      <div className="mb-4 flex gap-1 rounded-xl bg-secondary/60 p-1">
        <button
          type="button"
          onClick={() => setView('chart')}
          className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-colors ${
            view === 'chart'
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground'
          }`}
        >
          Jadwal
        </button>
        <button
          type="button"
          onClick={() => setView('list')}
          className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-colors ${
            view === 'list'
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground'
          }`}
        >
          Daftar
        </button>
      </div>

      <div className="mb-4 flex gap-2 text-[11px]">
        <span className="rounded-full bg-secondary px-2.5 py-1 font-semibold text-foreground">
          {doneCount}/{items.length} selesai
        </span>
        {overdueCount > 0 && (
          <span className="rounded-full bg-red-100 px-2.5 py-1 font-semibold text-red-800 dark:bg-red-950/40 dark:text-red-300">
            {overdueCount} terlambat
          </span>
        )}
      </div>

      <button
        type="button"
        onClick={() => setShowAdd((v) => !v)}
        className="mb-4 w-full rounded-xl border border-dashed border-border py-3 text-sm font-semibold text-foreground"
      >
        {showAdd ? 'Batal' : '+ Tambah Vaksin Custom'}
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
      ) : view === 'chart' ? (
        <ImmunizationScheduleChart
          items={items}
          babyAgeWeeks={babyAgeWeeks}
          onSelectItem={(item) => {
            if (!item.is_done) {
              setView('list')
              startEdit(item)
            }
          }}
        />
      ) : (
        <div className="relative ml-1 pl-5">
          <div
            aria-hidden
            className="absolute bottom-4 left-[9px] top-2 w-0.5 bg-border"
          />

          {timeline.map((group, groupIdx) => {
            const groupDone = group.vaccines.every((v) => v.is_done)
            const groupOverdue = group.vaccines.some((v) => v.status === 'overdue')

            return (
              <div key={group.weeks} className="relative pb-6 last:pb-2">
                <div
                  className={`absolute -left-5 top-1 flex h-[18px] w-[18px] items-center justify-center rounded-full border-2 bg-card ${
                    groupOverdue
                      ? 'border-red-500'
                      : groupDone
                        ? 'border-green-500'
                        : 'border-primary'
                  }`}
                >
                  <div
                    className={`h-1.5 w-1.5 rounded-full ${
                      groupOverdue
                        ? 'bg-red-500'
                        : groupDone
                          ? 'bg-green-500'
                          : 'bg-primary'
                    }`}
                  />
                </div>

                <div className="mb-2">
                  <h2 className="font-heading text-sm font-bold text-foreground">
                    {group.label}
                  </h2>
                </div>

                <div className="space-y-2">
                  {group.vaccines.map((item) => (
                    <VaccineCard
                      key={item.id}
                      item={item}
                      editingId={editingId}
                      dateGiven={dateGiven}
                      notes={notes}
                      onToggle={toggle}
                      onStartEdit={startEdit}
                      onConfirm={confirmDate}
                      onUncheck={uncheck}
                      onRemove={removeCustom}
                      setDateGiven={setDateGiven}
                      setNotes={setNotes}
                    />
                  ))}
                </div>

                {groupIdx < timeline.length - 1 && (
                  <div className="mt-3 h-px bg-border/40" aria-hidden />
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
