'use client'

import type { TodaySummary } from '@/lib/api-client'
import { formatDurationShort } from '@/lib/baby-utils'

interface InsightsCardProps {
  summary: TodaySummary | null
}

export function InsightsCard({ summary }: InsightsCardProps) {
  if (!summary) return null

  const insights: { icon: string; text: string }[] = []

  if ((summary.totalFeedingMinutes ?? 0) > 0) {
    insights.push({
      icon: '🍼',
      text: `Menyusui hari ini ${formatDurationShort(summary.totalFeedingMinutes ?? 0)}`,
    })
  }
  if ((summary.totalSleepMinutes ?? 0) > 0) {
    insights.push({
      icon: '😴',
      text: `Tidur hari ini ${formatDurationShort(summary.totalSleepMinutes ?? 0)}`,
    })
  }

  if (insights.length === 0) return null

  return (
    <div className="mb-4 space-y-1.5 rounded-2xl border border-border bg-card/60 p-3">
      {insights.map((item) => (
        <div key={item.text} className="flex items-center gap-2 text-sm text-foreground">
          <span>{item.icon}</span>
          <span>{item.text}</span>
        </div>
      ))}
    </div>
  )
}
