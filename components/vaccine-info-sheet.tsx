'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import type { TodaySummary } from '@/lib/api-client'
import { STATUS_LABEL } from '@/lib/immunization-utils'

type VaccineBrief = NonNullable<TodaySummary['nextVaccine']>

interface VaccineInfoSheetProps {
  open: boolean
  brief: VaccineBrief | null | undefined
  onClose: () => void
}

const STATUS_TONE: Record<string, string> = {
  overdue: 'text-red-600 dark:text-red-400',
  due: 'text-amber-600 dark:text-amber-400',
  upcoming: 'text-primary',
}

export function VaccineInfoSheet({ open, brief, onClose }: VaccineInfoSheetProps) {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  const vaccines = brief?.vaccines ?? []
  const status = brief?.status

  return createPortal(
    <AnimatePresence>
      {open && brief && (
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
            style={{
              paddingBottom: 'calc(2rem + env(safe-area-inset-bottom, 0px))',
            }}
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-muted" />

            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-heading text-lg font-bold text-foreground">
                  💉 Imunisasi
                </h2>
                {status && (
                  <p
                    className={`mt-0.5 text-sm font-semibold ${STATUS_TONE[status] ?? ''}`}
                  >
                    {STATUS_LABEL[status]}
                  </p>
                )}
              </div>
              {brief.schedule_label && (
                <span className="shrink-0 rounded-full bg-secondary px-3 py-1 text-[11px] font-semibold text-foreground">
                  {brief.schedule_label}
                </span>
              )}
            </div>

            <p className="mt-3 text-xs text-muted-foreground">
              Jadwal rekomendasi IDAI untuk usia ini:
            </p>

            <ul className="mt-2 space-y-2">
              {vaccines.map((v) => (
                <li
                  key={`${v.name}-${v.dose_label ?? ''}`}
                  className="rounded-xl bg-secondary/70 px-3 py-2.5"
                >
                  <p className="text-sm font-semibold text-foreground">{v.name}</p>
                  {v.dose_label && (
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {v.dose_label}
                    </p>
                  )}
                </li>
              ))}
            </ul>

            {status === 'upcoming' && brief.schedule_label && (
              <p className="mt-3 text-[11px] text-muted-foreground">
                Target usia: {brief.schedule_label}
              </p>
            )}

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-xl bg-secondary py-3 text-sm font-semibold text-foreground"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={() => {
                  onClose()
                  router.push('/?p=immunizations')
                }}
                className="flex-1 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground"
              >
                Lihat jadwal
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  )
}
