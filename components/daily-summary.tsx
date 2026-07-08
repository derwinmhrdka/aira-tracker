'use client'

import { motion } from 'framer-motion'
import { useMemo } from 'react'
import type { TodaySummary } from '@/lib/api-client'
import { formatDurationLabel, timeAgoId } from '@/lib/baby-utils'

interface DailySummaryProps {
  summary: TodaySummary | null
  loading?: boolean
  error?: boolean
  onRetry?: () => void
}

type SummaryItem = {
  emoji: string
  count: number
  last: string | null
  label: string
  durationMinutes?: number | null
  durationAction?: string
}

function SummaryCard({
  item,
  wide = false,
  variants,
}: {
  item: SummaryItem
  wide?: boolean
  variants: {
    hidden: { opacity: number; y: number }
    visible: {
      opacity: number
      y: number
      transition: { type: 'spring'; stiffness: number; damping: number }
    }
  }
}) {
  return (
    <motion.div
      variants={variants}
      className={`rounded-xl bg-secondary/50 text-center ${
        wide ? 'px-4 py-3.5' : 'p-3'
      }`}
    >
      <div className={wide ? 'text-2xl' : 'text-xl'}>{item.emoji}</div>
      <div className={`font-heading font-bold text-foreground ${wide ? 'text-3xl' : 'text-2xl'}`}>
        {item.count}
      </div>
      <div className={`font-medium text-muted-foreground ${wide ? 'text-xs' : 'text-[10px]'}`}>
        {item.label}
      </div>
      <div className={`text-primary ${wide ? 'text-xs' : 'text-[10px]'} mt-0.5`}>
        {timeAgoId(item.last)}
      </div>
      {wide && item.durationMinutes != null && item.durationAction && (
        <div className="mt-1 text-[10px] text-muted-foreground">
          Lama {item.durationAction} {formatDurationLabel(item.durationMinutes)}
        </div>
      )}
    </motion.div>
  )
}

export function DailySummary({ summary, loading, error, onRetry }: DailySummaryProps) {
  const data = useMemo(() => {
    if (!summary?.counts) return null
    return summary
  }, [summary])

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.08 },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: 'spring' as const, stiffness: 300, damping: 30 },
    },
  }

  if (loading) {
    return (
      <div className="space-y-2 rounded-2xl border border-border bg-card p-3 shadow-sm">
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse rounded-xl bg-secondary p-4" />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[4, 5].map((i) => (
            <div key={i} className="animate-pulse rounded-xl bg-secondary p-5" />
          ))}
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="rounded-2xl border border-border bg-card p-4 text-center shadow-sm">
        <p className="text-sm text-muted-foreground">Gagal memuat ringkasan hari ini</p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-2 text-sm font-medium text-primary"
          >
            Coba lagi
          </button>
        )}
      </div>
    )
  }

  const topRow: SummaryItem[] = [
    { emoji: '💩', count: data.counts.pup, last: data.lastTimes.pup, label: 'Pup' },
    { emoji: '💧', count: data.counts.pee, last: data.lastTimes.pee, label: 'Pee' },
    {
      emoji: '🔄',
      count: data.counts.change ?? 0,
      last: data.lastTimes.change ?? null,
      label: 'Popok',
    },
  ]

  const bottomRow: SummaryItem[] = [
    {
      emoji: '🍼',
      count: data.counts.feed,
      last: data.lastTimes.feed,
      label: 'Susu',
      durationMinutes: data.lastDurations?.feed ?? null,
      durationAction: 'menyusui',
    },
    {
      emoji: '😴',
      count: data.counts.sleep,
      last: data.lastTimes.sleep,
      label: 'Tidur',
      durationMinutes: data.lastDurations?.sleep ?? null,
      durationAction: 'tidur',
    },
  ]

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-2 rounded-2xl border border-border bg-card p-3 shadow-sm"
    >
      <div className="grid grid-cols-3 gap-2">
        {topRow.map((item) => (
          <SummaryCard key={item.label} item={item} variants={itemVariants} />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {bottomRow.map((item) => (
          <SummaryCard key={item.label} item={item} wide variants={itemVariants} />
        ))}
      </div>
    </motion.div>
  )
}
