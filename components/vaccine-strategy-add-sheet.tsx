'use client'

import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import type { Immunization, VaccinePaymentMethod } from '@/lib/api-client'
import {
  DEFAULT_DSA_COST_IDR,
  estimateStrategyCost,
  formatIdr,
  formatPriceRange,
  getAllowedPayments,
  getCatalogItem,
  suggestCatalogForImmunization,
  buildStrategyVisit,
  VACCINE_CATALOG,
  PAYMENT_METHOD_LABEL,
  getVaccinePlanRangeWarning,
  type VaccineStrategyVisit,
} from '@/lib/vaccine-strategy'

const PAYMENT_SHORT: Record<VaccinePaymentMethod, string> = {
  INHEALTH: 'IH',
  FULLERTON: 'FT',
  PUSKESMAS: 'PKM',
  CASH: '₿',
}

type VaccineStrategyAddSheetProps = {
  open: boolean
  immunizations: Immunization[]
  birthDate?: string | null
  nextOrder: number
  onClose: () => void
  onSave: (visit: VaccineStrategyVisit) => Promise<void>
}

export function VaccineStrategyAddSheet({
  open,
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
  const [dsaCostIdr, setDsaCostIdr] = useState(String(DEFAULT_DSA_COST_IDR))
  const [targetDate, setTargetDate] = useState('')
  const [saving, setSaving] = useState(false)

  const catalog = getCatalogItem(catalogId) ?? VACCINE_CATALOG[0]
  const allowedPayments = getAllowedPayments(catalog)
  const dsa = Math.max(0, Number(dsaCostIdr) || 0)
  const estimate = estimateStrategyCost(catalog, paymentMethod, dsa)
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
    setDsaCostIdr(String(DEFAULT_DSA_COST_IDR))
    setTargetDate('')
  }, [open])

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

            <div className="space-y-2">
              <select
                value={immunizationId}
                onChange={(e) => applyImmunization(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm"
              >
                <option value="">Jadwal…</option>
                {pending.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.vaccine_name}
                    {item.dose_label ? ` · ${item.dose_label}` : ''}
                  </option>
                ))}
              </select>

              <select
                value={catalogId}
                onChange={(e) => applyCatalog(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm"
              >
                {VACCINE_CATALOG.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.brand ? `${item.name} (${item.brand})` : item.name}
                  </option>
                ))}
              </select>

              <input
                value={vaccineProduct}
                onChange={(e) => setVaccineProduct(e.target.value)}
                placeholder={catalog.brand ?? catalog.name}
                className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm"
              />

              <div className="grid grid-cols-4 gap-1">
                {(['INHEALTH', 'FULLERTON', 'PUSKESMAS', 'CASH'] as const).map((m) => {
                  const disabled = !allowedPayments.includes(m)
                  return (
                    <button
                      key={m}
                      type="button"
                      disabled={disabled}
                      title={PAYMENT_METHOD_LABEL[m]}
                      onClick={() => setPaymentMethod(m)}
                      className={`rounded-lg border py-2 text-[11px] font-bold transition-colors ${
                        paymentMethod === m
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border bg-background text-foreground'
                      } ${disabled ? 'cursor-not-allowed opacity-30' : ''}`}
                    >
                      {PAYMENT_SHORT[m]}
                    </button>
                  )
                })}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  min={0}
                  step={50000}
                  value={dsaCostIdr}
                  onChange={(e) => setDsaCostIdr(e.target.value)}
                  disabled={paymentMethod === 'INHEALTH' || paymentMethod === 'PUSKESMAS'}
                  placeholder="DSA"
                  className="rounded-lg border border-input bg-background px-3 py-2.5 text-sm tabular-nums disabled:opacity-40"
                />
                <input
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className={`rounded-lg border bg-background px-3 py-2.5 text-sm ${
                    rangeWarning
                      ? 'border-amber-500 ring-1 ring-amber-500/30'
                      : 'border-input'
                  }`}
                />
              </div>

              {rangeWarning && (
                <p className="text-center text-[11px] font-medium tabular-nums text-amber-600 dark:text-amber-400">
                  ⚠ {rangeWarning.shortMessage}
                </p>
              )}

              <p className="text-center text-sm font-bold tabular-nums text-foreground">
                {estimate.plafonImpactIdr > 0
                  ? formatIdr(estimate.plafonImpactIdr)
                  : 'Rp0'}
                {paymentMethod !== 'INHEALTH' &&
                  paymentMethod !== 'PUSKESMAS' &&
                  estimate.plafonImpactIdr === 0 && (
                    <span className="ml-1 text-xs font-normal text-muted-foreground">
                      ({formatPriceRange(catalog)})
                    </span>
                  )}
              </p>
            </div>

            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-xl bg-secondary py-3 text-sm font-semibold"
              >
                ×
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
                      targetDate: targetDate || null,
                      order: nextOrder,
                    })
                    await onSave(visit)
                    onClose()
                  } finally {
                    setSaving(false)
                  }
                }}
                className="flex-1 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
              >
                {saving ? '…' : '✓'}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  )
}
