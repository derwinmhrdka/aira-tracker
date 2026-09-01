'use client'

import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2 } from 'lucide-react'
import type {
  Immunization,
  VaccinePaymentMethod,
  VaccineStrategySettings,
} from '@/lib/api-client'
import {
  DEFAULT_DSA_COST_IDR,
  estimateVisitCost,
  formatIdr,
  formatIdrInput,
  getAllowedPaymentsForVaccines,
  getCatalogItem,
  getCatalogOptionsForPlan,
  getCatalogPrice,
  getCatalogRecommendedLabel,
  getVisitDisplayTotal,
  getVisitDoctorSuggestions,
  getVisitLocationSuggestions,
  getVaccinePlanRangeWarning,
  isImmunizationCompatibleWithPlan,
  isManualCatalogId,
  MANUAL_CATALOG_ID,
  parseIdrInput,
  pickCatalogForPlan,
  buildStrategyVisit,
  getVisitVaccines,
  VACCINE_CATALOG,
  type VaccineCatalogItem,
  type VaccineStrategyVisit,
} from '@/lib/vaccine-strategy'
import { SearchableSelect } from './searchable-select'
import { PaymentMethodSelectButton } from './payment-method-logo'

type VaccineLine = {
  key: string
  immunizationId: string
  catalogId: string
  vaccineProduct: string
  vaccinePriceDisplay: string
  isManual: boolean
}

type VaccineStrategyAddSheetProps = {
  open: boolean
  strategy: VaccineStrategySettings
  immunizations: Immunization[]
  birthDate?: string | null
  nextOrder: number
  editingVisit?: VaccineStrategyVisit | null
  onClose: () => void
  onSave: (data: {
    visit: VaccineStrategyVisit
    catalogPrices: Record<string, number>
  }) => Promise<void>
}

function visitToLines(visit: VaccineStrategyVisit): VaccineLine[] {
  const vaccines = getVisitVaccines(visit)
  if (vaccines.length === 0) return [createLine()]
  return vaccines.map((row) => ({
    key: row.id,
    immunizationId: row.immunizationId ?? '',
    catalogId: row.vaccineCatalogId,
    vaccineProduct: row.vaccineProduct ?? '',
    vaccinePriceDisplay: formatIdrInput(row.vaccineCostIdr),
    isManual: isManualCatalogId(row.vaccineCatalogId),
  }))
}

function createLine(): VaccineLine {
  return {
    key: `line-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    immunizationId: '',
    catalogId: '',
    vaccineProduct: '',
    vaccinePriceDisplay: '',
    isManual: false,
  }
}

function catalogToOption(item: VaccineCatalogItem) {
  return {
    value: item.id,
    label: item.brand ? `${item.name} (${item.brand})` : item.name,
    keywords: `${item.name} ${item.brand ?? ''} ${item.id}`,
  }
}

function immunizationToOption(item: Immunization) {
  return {
    value: item.id,
    label: item.vaccine_name,
    sublabel: [item.dose_label, item.is_done ? 'selesai' : null].filter(Boolean).join(' · '),
    keywords: `${item.vaccine_name} ${item.dose_label ?? ''}`,
  }
}

export function VaccineStrategyAddSheet({
  open,
  strategy,
  immunizations,
  birthDate,
  nextOrder,
  editingVisit,
  onClose,
  onSave,
}: VaccineStrategyAddSheetProps) {
  const [lines, setLines] = useState<VaccineLine[]>([createLine()])
  const [paymentMethod, setPaymentMethod] = useState<VaccinePaymentMethod>('FULLERTON')
  const [dsaDisplay, setDsaDisplay] = useState(formatIdrInput(DEFAULT_DSA_COST_IDR))
  const [location, setLocation] = useState('')
  const [doctorName, setDoctorName] = useState('')
  const [targetDate, setTargetDate] = useState('')
  const [saving, setSaving] = useState(false)

  const catalogCtx = useMemo(
    () => ({
      customCatalog: strategy.customCatalog,
      catalogPrices: strategy.catalogPrices,
    }),
    [strategy.customCatalog, strategy.catalogPrices]
  )

  const locationSuggestions = useMemo(
    () => getVisitLocationSuggestions(strategy.visits),
    [strategy.visits]
  )
  const doctorSuggestions = useMemo(
    () => getVisitDoctorSuggestions(strategy.visits),
    [strategy.visits]
  )

  const sortedImmunizations = useMemo(
    () =>
      [...immunizations].sort(
        (a, b) =>
          (a.scheduled_age_weeks ?? a.scheduled_age_months * 4) -
          (b.scheduled_age_weeks ?? b.scheduled_age_months * 4)
      ),
    [immunizations]
  )

  const getOtherCatalogIds = (lineKey: string, source: VaccineLine[]) =>
    source.filter((l) => l.key !== lineKey && l.catalogId).map((l) => l.catalogId)

  const getUsedImmunizationIds = (lineKey: string, source: VaccineLine[]) =>
    source.filter((l) => l.key !== lineKey && l.immunizationId).map((l) => l.immunizationId)

  const getScheduleOptionsForLine = (lineKey: string) =>
    sortedImmunizations
      .filter((item) => !getUsedImmunizationIds(lineKey, lines).includes(item.id))
      .filter((item) =>
        isImmunizationCompatibleWithPlan(
          item.vaccine_name,
          item.dose_label,
          paymentMethod,
          getOtherCatalogIds(lineKey, lines),
          catalogCtx
        )
      )
      .map(immunizationToOption)

  const canAddMoreVaccines = useMemo(() => {
    const usedIds = lines.map((l) => l.immunizationId).filter(Boolean)
    const catalogIds = lines.map((l) => l.catalogId).filter(Boolean)
    return sortedImmunizations.some(
      (item) =>
        !usedIds.includes(item.id) &&
        isImmunizationCompatibleWithPlan(
          item.vaccine_name,
          item.dose_label,
          paymentMethod,
          catalogIds,
          catalogCtx
        )
    )
  }, [sortedImmunizations, lines, paymentMethod, catalogCtx])

  const selectedCatalogIds = lines.map((l) => l.catalogId).filter(Boolean)
  const allowedPayments =
    selectedCatalogIds.length > 0
      ? getAllowedPaymentsForVaccines(selectedCatalogIds, catalogCtx)
      : (['INHEALTH', 'FULLERTON', 'PUSKESMAS', 'CASH'] as VaccinePaymentMethod[])

  const dsa = parseIdrInput(dsaDisplay)
  const estimate = estimateVisitCost(
    lines
      .filter((l) => l.catalogId)
      .map((l) => ({
        catalogId: l.catalogId,
        vaccinePriceIdr: parseIdrInput(l.vaccinePriceDisplay),
      })),
    paymentMethod,
    dsa,
    strategy.catalogPrices,
    catalogCtx
  )

  const rangeWarnings = useMemo(() => {
    if (!targetDate) return []
    return lines
      .map((line) => {
        if (!line.immunizationId) return null
        const item = immunizations.find((i) => i.id === line.immunizationId)
        if (!item) return null
        return getVaccinePlanRangeWarning(item, birthDate, targetDate)
      })
      .filter((w): w is NonNullable<typeof w> => !!w)
  }, [lines, immunizations, birthDate, targetDate])

  const canSave = lines.every(
    (line) =>
      line.immunizationId &&
      line.catalogId &&
      (!line.isManual || line.vaccineProduct.trim().length > 0)
  )

  useEffect(() => {
    if (!open) return
    if (editingVisit) {
      setLines(visitToLines(editingVisit))
      setPaymentMethod(editingVisit.paymentMethod)
      setDsaDisplay(formatIdrInput(editingVisit.dsaCostIdr))
      setLocation(editingVisit.location ?? '')
      setDoctorName(editingVisit.doctorName ?? '')
      setTargetDate(editingVisit.targetDate ?? '')
      return
    }
    setLines([createLine()])
    setPaymentMethod('FULLERTON')
    setDsaDisplay(formatIdrInput(DEFAULT_DSA_COST_IDR))
    setLocation('')
    setDoctorName('')
    setTargetDate('')
  }, [open, editingVisit])

  useEffect(() => {
    if (!allowedPayments.includes(paymentMethod)) {
      setPaymentMethod(allowedPayments[0] ?? 'CASH')
    }
  }, [allowedPayments, paymentMethod])

  useEffect(() => {
    setLines((prev) => {
      let changed = false
      const next = prev.map((line) => {
        if (!line.immunizationId) return line
        const item = immunizations.find((i) => i.id === line.immunizationId)
        if (!item) return line

        const otherCatalogIds = getOtherCatalogIds(line.key, prev)
        const compatible = pickCatalogForPlan(
          item.vaccine_name,
          item.dose_label,
          paymentMethod,
          otherCatalogIds,
          catalogCtx
        )

        if (!compatible) {
          changed = true
          return {
            ...line,
            immunizationId: '',
            catalogId: '',
            isManual: false,
            vaccineProduct: '',
            vaccinePriceDisplay: '',
          }
        }

        if (line.isManual || isManualCatalogId(line.catalogId)) {
          return line
        }

        if (line.catalogId !== compatible.id) {
          changed = true
          return {
            ...line,
            catalogId: compatible.id,
            isManual: false,
            vaccineProduct: compatible.brand ?? compatible.name,
            vaccinePriceDisplay: formatIdrInput(
              getCatalogPrice(compatible.id, strategy.catalogPrices, catalogCtx)
            ),
          }
        }

        return line
      })
      return changed ? next : prev
    })
  }, [paymentMethod, immunizations, strategy.catalogPrices, catalogCtx])

  const updateLine = (key: string, patch: Partial<VaccineLine>) => {
    setLines((prev) => prev.map((line) => (line.key === key ? { ...line, ...patch } : line)))
  }

  const getLineCatalogOptions = (line: VaccineLine) => {
    const item = immunizations.find((i) => i.id === line.immunizationId)
    if (!item) return []
    return getCatalogOptionsForPlan(
      item.vaccine_name,
      item.dose_label,
      paymentMethod,
      getOtherCatalogIds(line.key, lines),
      catalogCtx
    ).map(catalogToOption)
  }

  const applyImmunization = (key: string, id: string) => {
    if (!id) {
      updateLine(key, {
        immunizationId: '',
        catalogId: '',
        isManual: false,
        vaccineProduct: '',
        vaccinePriceDisplay: '',
      })
      return
    }

    const item = immunizations.find((i) => i.id === id)
    if (!item) {
      updateLine(key, { immunizationId: id })
      return
    }

    const otherCatalogIds = getOtherCatalogIds(key, lines)
    const match = pickCatalogForPlan(
      item.vaccine_name,
      item.dose_label,
      paymentMethod,
      otherCatalogIds,
      catalogCtx
    )

    if (match) {
      updateLine(key, {
        immunizationId: id,
        catalogId: match.id,
        isManual: false,
        vaccineProduct: match.brand ?? match.name,
        vaccinePriceDisplay: formatIdrInput(
          getCatalogPrice(match.id, strategy.catalogPrices, catalogCtx)
        ),
      })
      return
    }

    updateLine(key, {
      immunizationId: id,
      catalogId: MANUAL_CATALOG_ID,
      isManual: true,
      vaccineProduct: '',
      vaccinePriceDisplay: '',
    })
  }

  const applyCatalog = (key: string, id: string) => {
    const item = getCatalogItem(id, catalogCtx)
    if (!item) return
    updateLine(key, {
      catalogId: id,
      isManual: false,
      vaccineProduct: item.brand ?? item.name,
      vaccinePriceDisplay: formatIdrInput(
        getCatalogPrice(id, strategy.catalogPrices, catalogCtx)
      ),
    })
  }

  const handleIdrChange = (raw: string, setter: (v: string) => void) => {
    const n = parseIdrInput(raw)
    setter(n > 0 ? formatIdrInput(n) : '')
  }

  if (typeof window === 'undefined') return null

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] bg-black/45"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 34 }}
            className="fixed inset-x-0 bottom-0 z-[71] max-h-[92vh] overflow-y-auto rounded-t-3xl border border-border bg-card p-4 shadow-2xl"
            style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-muted" />
            <h2 className="mb-3 font-heading text-base font-bold text-foreground">
              {editingVisit ? 'Edit Plan' : 'Tambah Plan'}
            </h2>

            <div className="space-y-3">
              <label className="block min-w-0">
                <span className="mb-1 block text-xs text-muted-foreground">Pembayaran</span>
                <div className="grid grid-cols-2 gap-1.5">
                  {(['INHEALTH', 'FULLERTON', 'PUSKESMAS', 'CASH'] as const).map((m) => (
                    <PaymentMethodSelectButton
                      key={m}
                      method={m}
                      selected={paymentMethod === m}
                      disabled={!allowedPayments.includes(m)}
                      onClick={() => setPaymentMethod(m)}
                    />
                  ))}
                </div>
              </label>

              {lines.map((line, index) => {
                const catalog = line.catalogId
                  ? getCatalogItem(line.catalogId, catalogCtx)
                  : undefined
                const lineCatalogOptions = getLineCatalogOptions(line)
                const scheduleOptions = getScheduleOptionsForLine(line.key)
                const recommendedLabel = catalog ? getCatalogRecommendedLabel(catalog) : '—'
                const showManualJenis = line.isManual || isManualCatalogId(line.catalogId)

                return (
                  <div
                    key={line.key}
                    className="space-y-2.5 rounded-xl border border-border bg-secondary/20 p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-muted-foreground">
                        Vaksin {index + 1}
                      </p>
                      {lines.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setLines((prev) => prev.filter((l) => l.key !== line.key))}
                          className="rounded-lg p-1 text-muted-foreground hover:bg-secondary"
                          aria-label="Hapus vaksin"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>

                    <label className="block min-w-0">
                      <span className="mb-1 block text-xs text-muted-foreground">Vaksin</span>
                      <SearchableSelect
                        options={scheduleOptions}
                        value={line.immunizationId}
                        onChange={(id) => applyImmunization(line.key, id)}
                        placeholder={
                          scheduleOptions.length > 0
                            ? 'Pilih dari jadwal…'
                            : 'Tidak ada vaksin cocok'
                        }
                        searchPlaceholder="Cari vaksin…"
                        allowClear
                        disabled={scheduleOptions.length === 0 && !line.immunizationId}
                      />
                    </label>

                    <label className="block min-w-0">
                      <span className="mb-1 block text-xs text-muted-foreground">Jenis</span>
                      {showManualJenis ? (
                        <input
                          value={line.vaccineProduct}
                          onChange={(e) =>
                            updateLine(line.key, { vaccineProduct: e.target.value })
                          }
                          placeholder="Ketik jenis / produk vaksin"
                          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                        />
                      ) : (
                        <SearchableSelect
                          options={lineCatalogOptions}
                          value={line.catalogId}
                          onChange={(id) => applyCatalog(line.key, id)}
                          placeholder={
                            line.immunizationId ? 'Pilih jenis…' : 'Pilih vaksin dulu'
                          }
                          searchPlaceholder="Cari jenis vaksin…"
                          disabled={!line.immunizationId || lineCatalogOptions.length === 0}
                        />
                      )}
                      {showManualJenis && (
                        <p className="mt-1 text-[10px] text-muted-foreground">
                          Tidak ada jenis di daftar — isi manual.
                        </p>
                      )}
                    </label>

                    {!showManualJenis && (
                      <label className="block min-w-0">
                        <span className="mb-1 block text-xs text-muted-foreground">Produk</span>
                        <input
                          readOnly
                          value={line.vaccineProduct}
                          placeholder={line.immunizationId ? 'Otomatis dari jenis' : '—'}
                          className="w-full cursor-default rounded-lg border border-input bg-secondary/40 px-3 py-2 text-sm text-foreground"
                        />
                      </label>
                    )}

                    <label className="block min-w-0">
                      <span className="mb-1 block text-xs text-muted-foreground">
                        Harga vaksin
                      </span>
                      <div className="relative">
                        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                          Rp
                        </span>
                        <input
                          inputMode="numeric"
                          value={line.vaccinePriceDisplay}
                          onChange={(e) =>
                            handleIdrChange(e.target.value, (v) =>
                              updateLine(line.key, { vaccinePriceDisplay: v })
                            )
                          }
                          disabled={!line.catalogId || paymentMethod === 'PUSKESMAS'}
                          className="w-full rounded-lg border border-input bg-background py-2 pl-9 pr-3 text-sm tabular-nums disabled:opacity-40"
                        />
                      </div>
                      <p className="mt-1 text-[10px] tabular-nums text-muted-foreground">
                        Est: {recommendedLabel}
                      </p>
                    </label>
                  </div>
                )
              })}

              <button
                type="button"
                disabled={!canAddMoreVaccines}
                onClick={() => setLines((prev) => [...prev, createLine()])}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-border py-2.5 text-xs font-semibold text-foreground disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Plus className="h-4 w-4" />
                Tambah vaksin lain
              </button>

              <label className="block min-w-0">
                <span className="mb-1 block text-xs text-muted-foreground">DSA</span>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                    Rp
                  </span>
                  <input
                    inputMode="numeric"
                    value={dsaDisplay}
                    onChange={(e) => handleIdrChange(e.target.value, setDsaDisplay)}
                    disabled={paymentMethod === 'PUSKESMAS'}
                    className="w-full rounded-lg border border-input bg-background py-2 pl-9 pr-3 text-sm tabular-nums disabled:opacity-40"
                  />
                </div>
              </label>

              <div className="grid grid-cols-2 gap-2">
                <label className="block min-w-0">
                  <span className="mb-1 block text-xs text-muted-foreground">Tempat</span>
                  <input
                    list="plan-location-suggestions"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="RS / klinik"
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  />
                </label>
                <label className="block min-w-0">
                  <span className="mb-1 block text-xs text-muted-foreground">Dokter</span>
                  <input
                    list="plan-doctor-suggestions"
                    value={doctorName}
                    onChange={(e) => setDoctorName(e.target.value)}
                    placeholder="Nama dokter"
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  />
                </label>
              </div>
              <datalist id="plan-location-suggestions">
                {locationSuggestions.map((value) => (
                  <option key={value} value={value} />
                ))}
              </datalist>
              <datalist id="plan-doctor-suggestions">
                {doctorSuggestions.map((value) => (
                  <option key={value} value={value} />
                ))}
              </datalist>

              <label className="block min-w-0">
                <span className="mb-1 block text-xs text-muted-foreground">Tanggal</span>
                <input
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className={`box-border w-full min-w-0 max-w-full appearance-none rounded-lg border bg-background px-3 py-2 text-sm ${
                    rangeWarnings.length > 0
                      ? 'border-amber-500 ring-1 ring-amber-500/30'
                      : 'border-input'
                  }`}
                />
              </label>

              {rangeWarnings.length > 0 && (
                <div className="space-y-1">
                  {rangeWarnings.map((warning, i) => (
                    <p
                      key={i}
                      className="text-center text-[11px] font-medium tabular-nums text-amber-600 dark:text-amber-400"
                    >
                      ⚠ {warning.shortMessage}
                    </p>
                  ))}
                </div>
              )}

              <div className="rounded-xl border border-border bg-secondary/30 px-3 py-2.5 text-center">
                <p className="text-[10px] text-muted-foreground">
                  Estimasi ({lines.length} vaksin)
                </p>
                <p className="text-[11px] font-bold tabular-nums text-foreground">
                  {formatIdr(
                    getVisitDisplayTotal({
                      id: '',
                      order: 0,
                      paymentMethod,
                      dsaCostIdr: dsa,
                      vaccineCostIdr: estimate.vaccineCostIdr,
                      estimatedCostIdr: 0,
                      vaccines: [],
                    })
                  )}
                </p>
              </div>
            </div>

            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-xl bg-secondary py-3 text-sm font-semibold text-foreground"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={saving || !canSave}
                onClick={async () => {
                  setSaving(true)
                  try {
                    const catalogPrices: Record<string, number> = {}
                    const vaccines = lines.map((line) => {
                      const catalog = getCatalogItem(line.catalogId, catalogCtx) ?? VACCINE_CATALOG[0]
                      const selected = immunizations.find((i) => i.id === line.immunizationId)
                      const vaccinePriceIdr = parseIdrInput(line.vaccinePriceDisplay)
                      if (!isManualCatalogId(line.catalogId)) {
                        catalogPrices[line.catalogId] = vaccinePriceIdr
                      }
                      return {
                        id: line.key.startsWith('line-') ? undefined : line.key,
                        immunizationId: line.immunizationId || null,
                        vaccineCatalogId: line.catalogId,
                        vaccineName: selected?.vaccine_name ?? catalog.name,
                        vaccineProduct: line.vaccineProduct.trim() || catalog.brand || null,
                        vaccinePriceIdr,
                      }
                    })

                    const visit = buildStrategyVisit({
                      id: editingVisit?.id,
                      vaccines,
                      paymentMethod,
                      dsaCostIdr: dsa,
                      catalogPrices: {
                        ...(strategy.catalogPrices ?? {}),
                        ...catalogPrices,
                      },
                      customCatalog: strategy.customCatalog,
                      targetDate: targetDate || null,
                      location: location || null,
                      doctorName: doctorName || null,
                      order: editingVisit?.order ?? nextOrder,
                    })

                    await onSave({ visit, catalogPrices })
                    onClose()
                  } finally {
                    setSaving(false)
                  }
                }}
                className="flex-1 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
              >
                {saving ? '...' : editingVisit ? 'Perbarui' : 'Simpan'}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  )
}
