'use client'

import { motion } from 'framer-motion'
import type { TodaySummary } from '@/lib/api-client'

const VACCINE_STATUS: Record<string, { label: string; className: string }> = {
  overdue: { label: 'Terlambat', className: 'text-red-600 dark:text-red-400' },
  due: { label: 'Saatnya', className: 'text-amber-600 dark:text-amber-400' },
  upcoming: { label: 'Mendatang', className: 'text-primary' },
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
    <motion.button
      type="button"
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onClick}
      className="mb-4 flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-3 text-left shadow-sm transition-colors hover:bg-secondary/30 active:scale-[0.99]"
      aria-label="Lihat profil bayi"
    >
      {summary.baby.photo_url ? (
        <img
          src={summary.baby.photo_url}
          alt={summary.baby.name}
          className="h-12 w-12 rounded-full object-cover ring-2 ring-primary/30"
        />
      ) : (
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-xl">
          👶
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="font-heading truncate text-base font-bold text-foreground">
          {summary.baby.name}
        </p>
        <p className="text-xs text-muted-foreground">{summary.baby.age_label}</p>
        {(summary.baby.horoscope || summary.baby.shio) && (
          <p className="truncate text-[10px] text-muted-foreground">
            {summary.baby.horoscope_emoji && summary.baby.horoscope
              ? `${summary.baby.horoscope_emoji} ${summary.baby.horoscope}`
              : null}
            {summary.baby.horoscope && summary.baby.shio ? ' · ' : null}
            {summary.baby.shio ?? null}
          </p>
        )}
      </div>
      {summary.nextVaccine ? (
        <div
          className={`shrink-0 rounded-xl px-2.5 py-1.5 text-center ${
            summary.nextVaccine.status === 'overdue'
              ? 'bg-red-100 dark:bg-red-950/30'
              : 'bg-secondary'
          }`}
        >
          <p className="text-[10px] text-muted-foreground">💉</p>
          <p className="max-w-[72px] truncate text-[10px] font-semibold text-foreground">
            {summary.nextVaccine.name}
          </p>
          {vaccineStatus && (
            <p className={`text-[10px] font-semibold ${vaccineStatus.className}`}>
              {vaccineStatus.label}
            </p>
          )}
        </div>
      ) : (
        <span className="shrink-0 text-lg text-muted-foreground">›</span>
      )}
    </motion.button>
  )
}
