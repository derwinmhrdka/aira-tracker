'use client'

import { motion } from 'framer-motion'
import { useMemo } from 'react'
import type { TodaySummary } from '@/lib/api-client'
import { timeAgoId } from '@/lib/baby-utils'

interface DailySummaryProps {
  summary: TodaySummary | null
  loading?: boolean
}

export function DailySummary({ summary, loading }: DailySummaryProps) {
  const data = useMemo(() => {
    if (!summary) {
      return {
        counts: { pup: 0, pee: 0, feed: 0, sleep: 0 },
        lastTimes: { pup: null, pee: null, feed: null, sleep: null },
      }
    }
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

  const items = [
    { emoji: '💩', count: data.counts.pup, last: data.lastTimes.pup, label: 'Pup' },
    { emoji: '💧', count: data.counts.pee, last: data.lastTimes.pee, label: 'Pipis' },
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
