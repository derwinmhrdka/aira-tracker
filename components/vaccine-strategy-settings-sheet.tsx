'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import type { VaccineStrategySettings } from '@/lib/api-client'
import {
  VACCINE_CATALOG,
  catalogMidPrice,
  formatIdrInput,
  getCatalogRecommendedLabel,
  parseIdrInput,
} from '@/lib/vaccine-strategy'

type VaccineStrategySettingsSheetProps = {
  open: boolean
  strategy: VaccineStrategySettings
  onClose: () => void
  onSave: (data: {
    clinic_name?: string
    doctor_name?: string
    rotavirus_type?: string
    visit_gap_weeks?: number
    fullerton_used_before_tracking_idr?: number
    catalog_prices?: Record<string, number>
  }) => Promise<void>
}

export function VaccineStrategySettingsSheet({
  open,
  strategy,
  onClose,
  onSave,
}: VaccineStrategySettingsSheetProps) {
  const [clinicName, setClinicName] = useState(strategy.clinicName ?? '')
  const [doctorName, setDoctorName] = useState(strategy.doctorName ?? '')
  const [rotavirusType, setRotavirusType] = useState(strategy.rotavirusType ?? '')
  const [visitGapWeeks, setVisitGapWeeks] = useState(String(strategy.visitGapWeeks ?? 3))
  const [fullertonDisplay, setFullertonDisplay] = useState(
    formatIdrInput(strategy.fullertonUsedBeforeTrackingIdr ?? 0)
  )
  const [priceDisplays, setPriceDisplays] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setClinicName(strategy.clinicName ?? '')
    setDoctorName(strategy.doctorName ?? '')
    setRotavirusType(strategy.rotavirusType ?? '')
    setVisitGapWeeks(String(strategy.visitGapWeeks ?? 3))
    setFullertonDisplay(formatIdrInput(strategy.fullertonUsedBeforeTrackingIdr ?? 0))
    const prices: Record<string, string> = {}
    for (const item of VACCINE_CATALOG) {
      const saved = strategy.catalogPrices?.[item.id]
      const n = saved != null ? saved : catalogMidPrice(item)
      prices[item.id] = formatIdrInput(n)
    }
    setPriceDisplays(prices)
  }, [open, strategy])

  const handlePriceChange = (id: string, raw: string) => {
    const n = parseIdrInput(raw)
    setPriceDisplays((prev) => ({
      ...prev,
      [id]: n > 0 ? formatIdrInput(n) : '',
    }))
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
            className="fixed inset-x-0 bottom-0 z-[71] max-h-[85vh] overflow-y-auto rounded-t-3xl border border-border bg-card p-4 shadow-2xl"
            style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-muted" />
            <h2 className="mb-3 font-heading text-base font-bold text-foreground">
              Pengaturan
            </h2>
            <div className="space-y-2.5">
              <label className="block">
                <span className="mb-1 block text-xs text-muted-foreground">Klinik</span>
                <input
                  value={clinicName}
                  onChange={(e) => setClinicName(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs text-muted-foreground">Dokter</span>
                <input
                  value={doctorName}
                  onChange={(e) => setDoctorName(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                />
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label className="block">
                  <span className="mb-1 block text-xs text-muted-foreground">Jeda (minggu)</span>
                  <input
                    type="number"
                    min={1}
                    max={8}
                    value={visitGapWeeks}
                    onChange={(e) => setVisitGapWeeks(e.target.value)}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs text-muted-foreground">FT terpakai</span>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">
                      Rp
                    </span>
                    <input
                      inputMode="numeric"
                      value={fullertonDisplay}
                      onChange={(e) => {
                        const n = parseIdrInput(e.target.value)
                        setFullertonDisplay(n > 0 ? formatIdrInput(n) : '')
                      }}
                      className="w-full rounded-lg border border-input bg-background py-2 pl-7 pr-2 text-sm tabular-nums"
                    />
                  </div>
                </label>
              </div>

              <div>
                <p className="mb-2 text-xs font-medium text-foreground">Harga vaksin</p>
                <div className="max-h-48 space-y-2 overflow-y-auto rounded-xl border border-border p-2">
                  {VACCINE_CATALOG.map((item) => (
                    <div key={item.id} className="flex items-center gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[11px] font-medium text-foreground">
                          {item.brand ? `${item.name}` : item.name}
                        </p>
                        <p className="text-[9px] tabular-nums text-muted-foreground">
                          Rek: {getCatalogRecommendedLabel(item)}
                        </p>
                      </div>
                      <div className="relative w-28 shrink-0">
                        <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[9px] text-muted-foreground">
                          Rp
                        </span>
                        <input
                          inputMode="numeric"
                          value={priceDisplays[item.id] ?? ''}
                          onChange={(e) => handlePriceChange(item.id, e.target.value)}
                          className="w-full rounded-md border border-input bg-background py-1.5 pl-6 pr-1 text-[11px] tabular-nums"
                        />
                      </div>
                    </div>
                  ))}
                </div>
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
                    const catalog_prices: Record<string, number> = {}
                    for (const item of VACCINE_CATALOG) {
                      const n = parseIdrInput(priceDisplays[item.id] ?? '')
                      catalog_prices[item.id] =
                        n > 0 ? n : catalogMidPrice(item)
                    }
                    await onSave({
                      clinic_name: clinicName.trim(),
                      doctor_name: doctorName.trim(),
                      rotavirus_type: rotavirusType.trim(),
                      visit_gap_weeks: Number(visitGapWeeks) || 3,
                      fullerton_used_before_tracking_idr: parseIdrInput(fullertonDisplay),
                      catalog_prices,
                    })
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
