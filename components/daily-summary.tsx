'use client'

import { motion } from 'framer-motion'
import { useMemo } from 'react'
import type { TodaySummary } from '@/lib/api-client'
import { timeAgoId } from '@/lib/baby-utils'

interface DailySummaryProps {
  summary: TodaySummary | null
  loading?: boolean
  error?: boolean
  onRetry?: () => void
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
      <div className="grid grid-cols-2 gap-2 rounded-2xl border border-border bg-card p-3 shadow-sm">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="animate-pulse rounded-xl bg-secondary p-4" />
        ))}
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

  const items = [
    { emoji: '💩', count: data.counts.pup, last: data.lastTimes.pup, label: 'Pup' },
    { emoji: '💧', count: data.counts.pee, last: data.lastTimes.pee, label: 'Pee' },
    { emoji: '🍼', count: data.counts.feed, last: data.lastTimes.feed, label: 'Susu' },
    { emoji: '😴', count: data.counts.sleep, last: data.lastTimes.sleep, label: 'Tidur' },
  ]

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="grid grid-cols-2 gap-2 rounded-2xl border border-border bg-card p-3 shadow-sm"
    >
      {items.map((item) => (
        <motion.div
          key={item.label}
          variants={itemVariants}
          className="rounded-xl bg-secondary/50 p-3 text-center"
        >
          <div className="text-xl">{item.emoji}</div>
          <div className="font-heading text-2xl font-bold text-foreground">
            {item.count}
          </div>
          <div className="text-[10px] font-medium text-muted-foreground">
            {item.label}
          </div>
          <div className="mt-0.5 text-[10px] text-primary">
            {timeAgoId(item.last)}
          </div>
        </motion.div>
      ))}
    </motion.div>
  )
}
