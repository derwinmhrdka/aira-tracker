'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { getLeapStatus } from '@/lib/baby-leaps'

interface BabyLeapCardProps {
  birthDate?: string | null
}

export function BabyLeapCard({ birthDate }: BabyLeapCardProps) {
  const status = useMemo(() => getLeapStatus(birthDate), [birthDate])

  if (!status || status.phase === 'done') return null

  const leap = status.leap
  const isActive = status.phase === 'active'

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className={`mb-4 rounded-2xl border px-3 py-2.5 shadow-sm ${
        isActive
          ? 'border-violet-200/80 bg-violet-50/80 dark:border-violet-800/50 dark:bg-violet-950/30'
          : 'border-border bg-card'
      }`}
    >
      <div className="flex items-center gap-2.5">
        <span className="text-2xl leading-none">{leap.emoji}</span>
        <div className="min-w-0 flex-1">
          <p className="font-heading text-sm font-semibold text-foreground">
            Leap {leap.number} · {leap.title}
          </p>
          <p className="truncate text-[11px] text-muted-foreground">
            {isActive
              ? `Sedang berlangsung · sisa ~${status.daysLeftInLeap} hari`
              : status.daysUntilStart === 0
                ? 'Mulai sekitar hari ini'
                : `Mulai ~${status.daysUntilStart} hari lagi`}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
            isActive
              ? 'bg-violet-200/80 text-violet-800 dark:bg-violet-900/60 dark:text-violet-200'
              : 'bg-secondary text-muted-foreground'
          }`}
        >
          {isActive ? 'Aktif' : 'Sebentar'}
        </span>
      </div>
    </motion.div>
  )
}
