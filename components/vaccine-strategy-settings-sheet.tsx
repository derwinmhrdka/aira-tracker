'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import type { VaccineStrategySettings } from '@/lib/api-client'

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
  const [fullertonUsed, setFullertonUsed] = useState(
    String(strategy.fullertonUsedBeforeTrackingIdr ?? 0)
  )
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setClinicName(strategy.clinicName ?? '')
    setDoctorName(strategy.doctorName ?? '')
    setRotavirusType(strategy.rotavirusType ?? '')
    setVisitGapWeeks(String(strategy.visitGapWeeks ?? 3))
    setFullertonUsed(String(strategy.fullertonUsedBeforeTrackingIdr ?? 0))
  }, [open, strategy])

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
            className="fixed inset-x-0 bottom-0 z-[71] max-h-[85vh] overflow-y-auto rounded-t-3xl border border-border bg-card p-5 shadow-2xl"
            style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))' }}
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-muted" />
            <h2 className="mb-4 font-heading text-lg font-bold text-foreground">
              Pengaturan strategi
            </h2>
            <div className="space-y-3">
              <label className="block">
                <span className="mb-1 block text-xs text-muted-foreground">Klinik / RS</span>
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
              <label className="block">
                <span className="mb-1 block text-xs text-muted-foreground">Rotavirus</span>
                <input
                  value={rotavirusType}
                  onChange={(e) => setRotavirusType(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs text-muted-foreground">
                  Jeda kunjungan (minggu)
                </span>
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
                <span className="mb-1 block text-xs text-muted-foreground">
                  Fullerton terpakai sebelum app (Rp)
                </span>
                <input
                  type="number"
                  min={0}
                  step={1000}
                  value={fullertonUsed}
                  onChange={(e) => setFullertonUsed(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                />
              </label>
            </div>
            <div className="mt-4 flex gap-2">
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
                    await onSave({
                      clinic_name: clinicName.trim(),
                      doctor_name: doctorName.trim(),
                      rotavirus_type: rotavirusType.trim(),
                      visit_gap_weeks: Number(visitGapWeeks) || 3,
                      fullerton_used_before_tracking_idr:
                        Math.max(0, Number(fullertonUsed) || 0),
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
