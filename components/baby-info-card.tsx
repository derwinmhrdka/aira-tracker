'use client'

import { motion } from 'framer-motion'
import type { TodaySummary } from '@/lib/api-client'
import { MoodWidget } from './mood-widget'

const VACCINE_STATUS: Record<string, { label: string; className: string }> = {
  overdue: { label: 'Overdue', className: 'text-red-600 dark:text-red-400' },
  due: { label: 'Due', className: 'text-amber-600 dark:text-amber-400' },
  upcoming: { label: 'Upcoming', className: 'text-primary' },
}

interface BabyInfoCardProps {
  summary: TodaySummary | null
  onClick?: () => void
}

export function BabyInfoCard({ summary, onClick }: BabyInfoCardProps) {
  if (!summary?.baby) return null

  const vaccineStatus = summary.nextVaccine?.status
    ? VACCINE_STATUS[summary.nextVaccine.status]
    : null

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-4 flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-sm"
    >
      <button
        type="button"
        onClick={onClick}
        className="flex min-w-0 flex-1 items-center gap-3 text-left transition-colors hover:opacity-90 active:scale-[0.99]"
        aria-label="Lihat profil bayi"
      >
        {summary.baby.photo_url ? (
          <img
            src={summary.baby.photo_url}
            alt={summary.baby.name}
            className="h-12 w-12 shrink-0 rounded-full object-cover ring-2 ring-primary/30"
          />
        ) : (
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-secondary text-xl">
            👶
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="font-heading truncate text-base font-bold text-foreground">
            {summary.baby.name}
          </p>
          <p className="text-xs text-muted-foreground">{summary.baby.age_label}</p>
          {summary.nextVaccine && (
            <p
              className={`mt-0.5 truncate text-[10px] font-medium ${
                vaccineStatus?.className ?? 'text-muted-foreground'
              }`}
            >
              💉 {summary.nextVaccine.name}
              {vaccineStatus ? ` · ${vaccineStatus.label}` : ''}
            </p>
          )}
        </div>
      </button>

      <MoodWidget />
    </motion.div>
  )
}
