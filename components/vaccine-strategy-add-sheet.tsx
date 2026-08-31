'use client'

import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import type {
  Immunization,
  VaccinePaymentMethod,
  VaccineStrategySettings,
} from '@/lib/api-client'
import {
  DEFAULT_DSA_COST_IDR,
  estimateStrategyCost,
  formatIdr,
  formatIdrInput,
  getAllowedPayments,
  getCatalogItem,
  getCatalogPrice,
  getCatalogRecommendedLabel,
  parseIdrInput,
  suggestCatalogForImmunization,
  buildStrategyVisit,
  VACCINE_CATALOG,
  PAYMENT_METHOD_LABEL,
  getVaccinePlanRangeWarning,
  type VaccineStrategyVisit,
} from '@/lib/vaccine-strategy'

type VaccineStrategyAddSheetProps = {
  open: boolean
  strategy: VaccineStrategySettings
  immunizations: Immunization[]
  birthDate?: string | null
  nextOrder: number
  onClose: () => void
  onSave: (data: {
    visit: VaccineStrategyVisit
    vaccinePriceIdr: number
  }) => Promise<void>
}

export function VaccineStrategyAddSheet({
  open,
  strategy,
  immunizations,
  birthDate,
  nextOrder,
  onClose,
  onSave,
}: VaccineStrategyAddSheetProps) {
  const pending = useMemo(
    () => immunizations.filter((i) => !i.is_done),
    [immunizations]
  )

  const [immunizationId, setImmunizationId] = useState('')
  const [catalogId, setCatalogId] = useState(VACCINE_CATALOG[0].id)
  const [vaccineProduct, setVaccineProduct] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<VaccinePaymentMethod>('FULLERTON')
  const [dsaDisplay, setDsaDisplay] = useState(formatIdrInput(DEFAULT_DSA_COST_IDR))
  const [vaccinePriceDisplay, setVaccinePriceDisplay] = useState('')
  const [targetDate, setTargetDate] = useState('')
  const [saving, setSaving] = useState(false)

  const catalog = getCatalogItem(catalogId) ?? VACCINE_CATALOG[0]
  const allowedPayments = getAllowedPayments(catalog)
  const dsa = parseIdrInput(dsaDisplay)
  const vaccinePrice = parseIdrInput(vaccinePriceDisplay)
  const estimate = estimateStrategyCost(catalog, paymentMethod, dsa, vaccinePrice)
  const recommendedLabel = getCatalogRecommendedLabel(catalog)
  const selectedImmunization = pending.find((i) => i.id === immunizationId)
  const rangeWarning = useMemo(() => {
    if (!selectedImmunization || !targetDate) return null
    return getVaccinePlanRangeWarning(selectedImmunization, birthDate, targetDate)
  }, [selectedImmunization, birthDate, targetDate])

  useEffect(() => {
    if (!open) return
    setImmunizationId('')
    setCatalogId(VACCINE_CATALOG[0].id)
    setVaccineProduct('')
    setPaymentMethod('FULLERTON')
    setDsaDisplay(formatIdrInput(DEFAULT_DSA_COST_IDR))
    setTargetDate('')
    const firstPrice = getCatalogPrice(VACCINE_CATALOG[0].id, strategy.catalogPrices)
    setVaccinePriceDisplay(formatIdrInput(firstPrice))
  }, [open, strategy.catalogPrices])

  useEffect(() => {
    const price = getCatalogPrice(catalogId, strategy.catalogPrices)
    setVaccinePriceDisplay(formatIdrInput(price))
  }, [catalogId, strategy.catalogPrices])

  useEffect(() => {
    if (!allowedPayments.includes(paymentMethod)) {
      setPaymentMethod(allowedPayments[0] ?? 'CASH')
    }
  }, [catalogId, allowedPayments, paymentMethod])

  const applyImmunization = (id: string) => {
    setImmunizationId(id)
    const item = pending.find((i) => i.id === id)
    if (!item) return

    const match = suggestCatalogForImmunization(item.vaccine_name)
    if (match) {
      setCatalogId(match.id)
      setVaccineProduct(match.brand ?? '')
      const allowed = getAllowedPayments(match)
      setPaymentMethod(
        match.preferredPayment && allowed.includes(match.preferredPayment)
          ? match.preferredPayment
          : allowed[0] ?? 'CASH'
      )
    }
  }

  const applyCatalog = (id: string) => {
    setCatalogId(id)
    const item = getCatalogItem(id)
    if (item?.brand) setVaccineProduct(item.brand)
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
            className="fixed inset-x-0 bottom-0 z-[71] max-h-[90vh] overflow-y-auto rounded-t-3xl border border-border bg-card p-4 shadow-2xl"
            style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-muted" />
            <h2 className="mb-3 font-heading text-base font-bold text-foreground">
              Tambah rencana
            </h2>

            <div className="space-y-2.5">
              <label className="block">
                <span className="mb-1 block text-xs text-muted-foreground">Vaksin</span>
                <select
                  value={immunizationId}
                  onChange={(e) => applyImmunization(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Pilih dari jadwal…</option>
                  {pending.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.vaccine_name}
                      {item.dose_label ? ` · ${item.dose_label}` : ''}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-1 block text-xs text-muted-foreground">Jenis</span>
                <select
                  value={catalogId}
                  onChange={(e) => applyCatalog(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                >
                  {VACCINE_CATALOG.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.brand ? `${item.name} (${item.brand})` : item.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-1 block text-xs text-muted-foreground">Produk</span>
                <input
                  value={vaccineProduct}
                  onChange={(e) => setVaccineProduct(e.target.value)}
                  placeholder={catalog.brand ?? catalog.name}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-xs text-muted-foreground">Harga vaksin</span>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                    Rp
                  </span>
                  <input
                    inputMode="numeric"
                    value={vaccinePriceDisplay}
                    onChange={(e) => handleIdrChange(e.target.value, setVaccinePriceDisplay)}
                    disabled={paymentMethod === 'INHEALTH' || paymentMethod === 'PUSKESMAS'}
                    className="w-full rounded-lg border border-input bg-background py-2 pl-9 pr-3 text-sm tabular-nums disabled:opacity-40"
                  />
                </div>
                <p className="mt-1 text-[10px] tabular-nums text-muted-foreground">
                  Rek: {recommendedLabel}
                </p>
              </label>

              <label className="block">
                <span className="mb-1 block text-xs text-muted-foreground">Pembayaran</span>
                <div className="grid grid-cols-2 gap-1.5">
                  {(['INHEALTH', 'FULLERTON', 'PUSKESMAS', 'CASH'] as const).map((m) => {
                    const disabled = !allowedPayments.includes(m)
                    return (
                      <button
                        key={m}
                        type="button"
                        disabled={disabled}
                        onClick={() => setPaymentMethod(m)}
                        className={`rounded-lg border px-2 py-2 text-xs font-semibold transition-colors ${
                          paymentMethod === m
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border bg-background text-foreground'
                        } ${disabled ? 'cursor-not-allowed opacity-30' : ''}`}
                      >
                        {PAYMENT_METHOD_LABEL[m]}
                      </button>
                    )
                  })}
                </div>
              </label>

              <div className="grid grid-cols-2 gap-2">
                <label className="block">
                  <span className="mb-1 block text-xs text-muted-foreground">DSA</span>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                      Rp
                    </span>
                    <input
                      inputMode="numeric"
                      value={dsaDisplay}
                      onChange={(e) => handleIdrChange(e.target.value, setDsaDisplay)}
                      disabled={paymentMethod === 'INHEALTH' || paymentMethod === 'PUSKESMAS'}
                      className="w-full rounded-lg border border-input bg-background py-2 pl-9 pr-3 text-sm tabular-nums disabled:opacity-40"
                    />
                  </div>
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs text-muted-foreground">Tanggal</span>
                  <input
                    type="date"
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    className={`w-full rounded-lg border bg-background px-3 py-2 text-sm ${
                      rangeWarning
                        ? 'border-amber-500 ring-1 ring-amber-500/30'
                        : 'border-input'
                    }`}
                  />
                </label>
              </div>

              {rangeWarning && (
                <p className="text-center text-[11px] font-medium tabular-nums text-amber-600 dark:text-amber-400">
                  ⚠ {rangeWarning.shortMessage}
                </p>
              )}

              <div className="rounded-xl border border-border bg-secondary/30 px-3 py-2.5 text-center">
                <p className="text-[10px] text-muted-foreground">Estimasi</p>
                <p className="text-[11px] font-bold tabular-nums text-foreground">
                  {formatIdr(estimate.plafonImpactIdr > 0 ? estimate.plafonImpactIdr : 0)}
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
                disabled={saving}
                onClick={async () => {
                  setSaving(true)
                  try {
                    const selected = pending.find((i) => i.id === immunizationId)
                    const visit = buildStrategyVisit({
                      immunizationId: immunizationId || null,
                      vaccineCatalogId: catalogId,
                      vaccineName: selected?.vaccine_name ?? catalog.name,
                      vaccineProduct: vaccineProduct.trim() || catalog.brand || null,
                      paymentMethod,
                      dsaCostIdr: dsa,
                      vaccinePriceIdr: vaccinePrice,
                      targetDate: targetDate || null,
                      order: nextOrder,
                    })
                    await onSave({ visit, vaccinePriceIdr: vaccinePrice })
                    onClose()
                  } finally {
                    setSaving(false)
                  }
                }}
                className="flex-1 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
              >
                {saving ? '...' : 'Simpan'}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  )
}
