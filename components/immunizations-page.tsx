'use client'

import { useMemo, useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { PageHeader } from './page-header'
import {
  api,
  type Immunization,
  type VaccinePaymentMethod,
  type VaccineStrategySettings,
} from '@/lib/api-client'
import { ageInWeeks } from '@/lib/baby-utils'
import {
  STATUS_LABEL,
  STATUS_STYLE,
  getImmunizationWeekRange,
  type VaccineStatus,
} from '@/lib/immunization-utils'
import {
  DOSE_KIND_LABEL,
  DOSE_KIND_STYLE,
  formatVaccineRange,
  getDoseKind,
  groupImmunizationsTimeline,
} from '@/lib/immunization-idai'
import {
  formatIdr,
  PAYMENT_METHOD_LABEL,
  PAYMENT_METHOD_STYLE,
} from '@/lib/vaccine-strategy'
import { ImmunizationScheduleChart } from './immunization-schedule-chart'
import { VaccineStrategyPanel } from './vaccine-strategy-panel'
import { VaccineStrategySettingsSheet } from './vaccine-strategy-settings-sheet'
import { VaccineStrategyAddSheet } from './vaccine-strategy-add-sheet'
import {
  syncCompletedImmunizationVisits,
  sortVisitsByDateAsc,
  type VaccineStrategyVisit,
} from '@/lib/vaccine-strategy'

interface ImmunizationsPageProps {
  onBack: () => void
}

type VaccineEditForm = {
  dateGiven: string
  notes: string
  paymentMethod: VaccinePaymentMethod | ''
  costIdr: string
  vaccineProduct: string
  location: string
}

const PAYMENT_OPTIONS: { value: VaccinePaymentMethod | ''; label: string }[] = [
  { value: '', label: '—' },
  { value: 'INHEALTH', label: 'Inhealth' },
  { value: 'FULLERTON', label: 'Fullerton' },
  { value: 'PUSKESMAS', label: 'Puskesmas' },
  { value: 'CASH', label: 'Cash' },
]

function emptyEditForm(): VaccineEditForm {
  return {
    dateGiven: new Date().toISOString().split('T')[0],
    notes: '',
    paymentMethod: '',
    costIdr: '',
    vaccineProduct: '',
    location: '',
  }
}

function editFormFromItem(item: Immunization): VaccineEditForm {
  return {
    dateGiven: item.date_given || new Date().toISOString().split('T')[0],
    notes: item.notes ?? '',
    paymentMethod: item.payment_method ?? '',
    costIdr: item.cost_idr != null ? String(item.cost_idr) : '',
    vaccineProduct: item.vaccine_product ?? '',
    location: item.location ?? '',
  }
}

function VaccineCard({
  item,
  editingId,
  form,
  onToggle,
  onStartEdit,
  onConfirm,
  onUncheck,
  onRemove,
  onFormChange,
}: {
  item: Immunization
  editingId: string | null
  form: VaccineEditForm
  onToggle: (item: Immunization) => void
  onStartEdit: (item: Immunization) => void
  onConfirm: (id: string) => void
  onUncheck: (item: Immunization) => void
  onRemove: (item: Immunization) => void
  onFormChange: (patch: Partial<VaccineEditForm>) => void
}) {
  const status = (item.status ?? (item.is_done ? 'done' : 'upcoming')) as VaccineStatus
  const doseKind = getDoseKind(item.dose_label)
  const { minWeeks, maxWeeks } = getImmunizationWeekRange(item)
  const windowLabel = formatVaccineRange(
    minWeeks,
    maxWeeks,
    item.scheduled_age_weeks
  )

  const statusIcon =
    item.is_done ? '✓' : status === 'overdue' ? '!' : status === 'due' ? '●' : '○'

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
      <div className="flex items-start gap-2.5">
        <button
          type="button"
          onClick={() => onToggle(item)}
          className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
            item.is_done
              ? 'bg-green-500 text-white'
              : status === 'overdue'
                ? 'bg-red-500 text-white'
                : status === 'due'
                  ? 'bg-amber-400 text-amber-950'
                  : 'bg-secondary text-muted-foreground'
          }`}
        >
          {statusIcon}
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <p className="truncate font-heading text-sm font-semibold text-foreground">
              {item.vaccine_name}
            </p>
            {item.dose_label && (
              <span className="shrink-0 text-[10px] text-muted-foreground">
                {item.dose_label}
              </span>
            )}
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_STYLE[status]}`}
            >
              {STATUS_LABEL[status]}
            </span>
            {windowLabel && (
              <span className="text-[10px] tabular-nums text-muted-foreground">
                {windowLabel}
              </span>
            )}
            {item.payment_method && (
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${PAYMENT_METHOD_STYLE[item.payment_method]}`}
              >
                {PAYMENT_METHOD_LABEL[item.payment_method]}
              </span>
            )}
            {doseKind !== 'routine' && (
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${DOSE_KIND_STYLE[doseKind]}`}>
                {DOSE_KIND_LABEL[doseKind]}
              </span>
            )}
          </div>

          {item.date_given && (
            <p className="mt-0.5 text-[10px] tabular-nums text-muted-foreground">
              {new Date(item.date_given).toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'short',
              })}
              {item.cost_idr != null && item.cost_idr > 0
                ? ` · ${formatIdr(item.cost_idr)}`
                : ''}
            </p>
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
            value={form.dateGiven}
            onChange={(e) => onFormChange({ dateGiven: e.target.value })}
            className="w-full rounded-lg border border-input bg-background px-2 py-1.5 text-sm"
          />
          <div className="grid grid-cols-2 gap-2">
            <select
              value={form.paymentMethod}
              onChange={(e) =>
                onFormChange({
                  paymentMethod: e.target.value as VaccinePaymentMethod | '',
                })
              }
              className="rounded-lg border border-input bg-background px-2 py-1.5 text-sm"
            >
              {PAYMENT_OPTIONS.map((opt) => (
                <option key={opt.value || 'none'} value={opt.value}>
                  {opt.label === '—' ? 'Bayar pakai' : opt.label}
                </option>
              ))}
            </select>
            <input
              type="number"
              min={0}
              step={1000}
              value={form.costIdr}
              onChange={(e) => onFormChange({ costIdr: e.target.value })}
              placeholder="Biaya"
              className="rounded-lg border border-input bg-background px-2 py-1.5 text-sm"
            />
          </div>
          <input
            type="text"
            value={form.vaccineProduct}
            onChange={(e) => onFormChange({ vaccineProduct: e.target.value })}
            placeholder="Produk"
            className="w-full rounded-lg border border-input bg-background px-2 py-1.5 text-sm"
          />
          <input
            type="text"
            value={form.location}
            onChange={(e) => onFormChange({ location: e.target.value })}
            placeholder="Lokasi"
            className="w-full rounded-lg border border-input bg-background px-2 py-1.5 text-sm"
          />
          <input
            type="text"
            value={form.notes}
            onChange={(e) => onFormChange({ notes: e.target.value })}
            placeholder="Catatan"
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
                className="rounded-lg border border-destructive/30 px-3 py-2 text-xs text-destructive"
              >
                Batal
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
  const [strategy, setStrategy] = useState<VaccineStrategySettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'chart' | 'list' | 'strategy'>('chart')
  const [babyAgeWeeks, setBabyAgeWeeks] = useState<number | null>(null)
  const [babyBirthDate, setBabyBirthDate] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<VaccineEditForm>(emptyEditForm())
  const [showAdd, setShowAdd] = useState(false)
  const [showStrategySettings, setShowStrategySettings] = useState(false)
  const [showStrategyAdd, setShowStrategyAdd] = useState(false)
  const [editingVisit, setEditingVisit] = useState<VaccineStrategyVisit | null>(null)
  const [newName, setNewName] = useState('')
  const [newAge, setNewAge] = useState('0')
  const [newNotes, setNewNotes] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    Promise.all([api.getImmunizations(), api.getVaccineStrategy()])
      .then(([immunizations, strategyData]) => {
        setItems(immunizations)
        setStrategy(strategyData)
      })
      .finally(() => setLoading(false))
    api
      .getBabyProfile()
      .then((baby) => {
        if (baby?.birth_date) {
          setBabyBirthDate(baby.birth_date)
          setBabyAgeWeeks(ageInWeeks(baby.birth_date))
        }
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!strategy || loading) return
    const { visits, added } = syncCompletedImmunizationVisits(items, strategy)
    if (!added) return
    api
      .updateVaccineStrategy({ visits })
      .then(setStrategy)
      .catch(() => {})
  }, [strategy, items, loading])

  const timeline = useMemo(() => groupImmunizationsTimeline(items), [items])
  const overdueCount = items.filter((i) => i.status === 'overdue').length
  const doneCount = items.filter((i) => i.is_done).length

  const startEdit = (item: Immunization) => {
    setEditingId(item.id)
    setEditForm(editFormFromItem(item))
  }

  const toggle = async (item: Immunization) => {
    if (!item.is_done) startEdit(item)
  }

  const confirmDate = async (id: string) => {
    const updated = await api.updateImmunization(id, {
      is_done: true,
      date_given: editForm.dateGiven,
      notes: editForm.notes.trim() || undefined,
      payment_method: editForm.paymentMethod || null,
      cost_idr:
        editForm.costIdr.trim() === ''
          ? null
          : Math.max(0, Math.round(Number(editForm.costIdr) || 0)),
      vaccine_product: editForm.vaccineProduct.trim() || null,
      location: editForm.location.trim() || null,
    })
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...updated } : i)))
    setEditingId(null)
  }

  const uncheck = async (item: Immunization) => {
    const updated = await api.updateImmunization(item.id, {
      is_done: false,
      date_given: null,
      payment_method: null,
      cost_idr: null,
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

  const saveStrategySettings = async (data: Parameters<
    typeof api.updateVaccineStrategy
  >[0]) => {
    const next = await api.updateVaccineStrategy(data)
    setStrategy(next)
  }

  const saveStrategyVisit = async (data: {
    visit: VaccineStrategyVisit
    catalogPrices: Record<string, number>
  }) => {
    if (!strategy) return
    const visits = sortVisitsByDateAsc(
      editingVisit
        ? strategy.visits.map((visit) =>
            visit.id === editingVisit.id ? data.visit : visit
          )
        : [...strategy.visits, data.visit]
    )
    const catalogPrices = {
      ...(strategy.catalogPrices ?? {}),
      ...data.catalogPrices,
    }
    await saveStrategySettings({ visits, catalog_prices: catalogPrices })
    setEditingVisit(null)
  }

  const deleteStrategyVisit = async (id: string) => {
    if (!strategy) return
    const visits = sortVisitsByDateAsc(strategy.visits.filter((v) => v.id !== id))
    await saveStrategySettings({ visits })
  }

  return (
    <div className="px-4 pt-6 pb-8">
      <PageHeader title="Imunisasi" onBack={onBack} />

      <div className="mb-4 flex gap-1 rounded-xl bg-secondary/60 p-1">
        {(['chart', 'list', 'strategy'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setView(tab)}
            className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-colors ${
              view === tab
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground'
            }`}
          >
            {tab === 'chart' ? 'Jadwal' : tab === 'list' ? 'Daftar' : 'Plan'}
          </button>
        ))}
      </div>

      <div className="mb-4 flex gap-2 text-[11px]">
        <span className="rounded-full bg-secondary px-2.5 py-1 font-semibold tabular-nums text-foreground">
          {doneCount}/{items.length} selesai
        </span>
        {overdueCount > 0 && (
          <span className="rounded-full bg-red-100 px-2.5 py-1 font-semibold text-red-800 dark:bg-red-950/40 dark:text-red-300">
            {overdueCount} terlambat
          </span>
        )}
      </div>

      {view !== 'strategy' && (
        <button
          type="button"
          onClick={() => setShowAdd((v) => !v)}
          className="mb-4 w-full rounded-xl border border-dashed border-border py-2.5 text-sm font-semibold text-foreground"
        >
          {showAdd ? 'Batal' : '+ Tambah vaksin'}
        </button>
      )}

      {showAdd && view !== 'strategy' && (
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
            placeholder="Usia (bulan)"
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
      ) : view === 'strategy' && strategy ? (
        <VaccineStrategyPanel
          strategy={strategy}
          immunizations={items}
          birthDate={babyBirthDate}
          onAdd={() => {
            setEditingVisit(null)
            setShowStrategyAdd(true)
          }}
          onEditVisit={(visit) => {
            setEditingVisit(visit)
            setShowStrategyAdd(true)
          }}
          onDeleteVisit={deleteStrategyVisit}
          onEditSettings={() => setShowStrategySettings(true)}
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
                      form={editForm}
                      onToggle={toggle}
                      onStartEdit={startEdit}
                      onConfirm={confirmDate}
                      onUncheck={uncheck}
                      onRemove={removeCustom}
                      onFormChange={(patch) =>
                        setEditForm((prev) => ({ ...prev, ...patch }))
                      }
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

      {strategy && (
        <>
          <VaccineStrategySettingsSheet
            open={showStrategySettings}
            strategy={strategy}
            onClose={() => setShowStrategySettings(false)}
            onSave={saveStrategySettings}
          />
          <VaccineStrategyAddSheet
            open={showStrategyAdd}
            strategy={strategy}
            immunizations={items}
            birthDate={babyBirthDate}
            nextOrder={strategy.visits.length + 1}
            editingVisit={editingVisit}
            onClose={() => {
              setShowStrategyAdd(false)
              setEditingVisit(null)
            }}
            onSave={saveStrategyVisit}
          />
        </>
      )}
    </div>
  )
}
