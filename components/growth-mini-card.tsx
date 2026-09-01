'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowDown, ArrowUp, Check, Scale } from 'lucide-react'
import { api, type BabyProfile } from '@/lib/api-client'
import {
  formatGrowthIdealDelta,
  formatGrowthValue,
  getGrowthGaugePercent,
  getGrowthTrend,
  growthMetricShortLabel,
  growthMetricUnit,
  type GrowthTrend,
} from '@/lib/growth-mini'
import { pageToPath } from '@/lib/navigation'
import type { Gender, GrowthMetric } from '@/lib/who-growth'
import { useAppDataSync } from '@/lib/use-app-data-sync'
import { LIVE_SYNC_MS } from '@/lib/use-live-sync'

type MetricCell = {
  metric: GrowthMetric
  value: number
  measureDate: string
}

const TREND_STYLE: Record<
  GrowthTrend,
  { ring: string; dot: string; delta: string; gauge: string }
> = {
  normal: {
    ring: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
    dot: 'bg-emerald-500',
    delta: 'text-emerald-600 dark:text-emerald-400',
    gauge: 'bg-emerald-500',
  },
  under: {
    ring: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
    dot: 'bg-amber-500',
    delta: 'text-amber-600 dark:text-amber-400',
    gauge: 'bg-amber-500',
  },
  over: {
    ring: 'bg-orange-500/15 text-orange-600 dark:text-orange-400',
    dot: 'bg-orange-500',
    delta: 'text-orange-600 dark:text-orange-400',
    gauge: 'bg-orange-500',
  },
}

function TrendIcon({ trend }: { trend: GrowthTrend }) {
  const className = 'h-3.5 w-3.5'
  if (trend === 'normal') return <Check className={className} strokeWidth={3} />
  if (trend === 'under') return <ArrowDown className={className} strokeWidth={2.5} />
  return <ArrowUp className={className} strokeWidth={2.5} />
}

function GrowthMetricTile({
  metric,
  value,
  birthDate,
  measureDate,
  gender,
}: MetricCell & {
  birthDate: string
  measureDate: string
  gender: Gender
}) {
  const trend = getGrowthTrend(value, birthDate, measureDate, metric, gender)
  const idealDelta = formatGrowthIdealDelta(value, birthDate, measureDate, metric, gender)
  const gaugePct = getGrowthGaugePercent(value, birthDate, measureDate, metric, gender)
  const style = TREND_STYLE[trend]

  return (
    <div className="min-w-0 flex-1 rounded-xl border border-border/70 bg-background/60 px-2 py-2">
      <div className="mb-1.5 flex items-center justify-between gap-1">
        <span className="text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
          {growthMetricShortLabel(metric)}
        </span>
        <span
          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${style.ring}`}
          title={trend === 'normal' ? 'Normal' : trend === 'under' ? 'Kurang' : 'Lebih'}
          aria-hidden
        >
          <TrendIcon trend={trend} />
        </span>
      </div>

      <p className="text-sm font-bold tabular-nums leading-none text-foreground">
        {formatGrowthValue(value, metric)}
        <span className="ml-0.5 text-[9px] font-medium text-muted-foreground">
          {growthMetricUnit(metric)}
        </span>
      </p>

      {gaugePct != null ? (
        <div className="relative mt-2 h-1 overflow-hidden rounded-full bg-secondary">
          <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-border" />
          <div
            className={`absolute top-0 h-full w-1.5 -translate-x-1/2 rounded-full ${style.gauge}`}
            style={{ left: `${gaugePct}%` }}
          />
        </div>
      ) : null}

      {idealDelta != null ? (
        <p className={`mt-1 text-[10px] font-semibold tabular-nums ${style.delta}`}>
          {idealDelta === '0' ? '·' : idealDelta}
        </p>
      ) : null}
    </div>
  )
}

type GrowthMiniCardProps = {
  birthDate?: string | null
}

export function GrowthMiniCard({ birthDate }: GrowthMiniCardProps) {
  const router = useRouter()
  const [profile, setProfile] = useState<BabyProfile | null>(null)
  const [headData, setHeadData] = useState<{ value: number; date: string } | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!birthDate) {
      setLoading(false)
      return
    }
    try {
      const [p, growth] = await Promise.all([
        api.getBabyProfile().catch(() => null),
        api.getGrowth().catch(() => [] as Awaited<ReturnType<typeof api.getGrowth>>),
      ])
      setProfile(p)
      const latestWithHead = [...growth]
        .filter((g) => g.head_circumference_cm != null && g.head_circumference_cm > 0)
        .sort((a, b) => b.date.localeCompare(a.date))[0]
      setHeadData(
        latestWithHead?.head_circumference_cm
          ? { value: latestWithHead.head_circumference_cm, date: latestWithHead.date }
          : null
      )
    } finally {
      setLoading(false)
    }
  }, [birthDate])

  useEffect(() => {
    load()
  }, [load])

  useAppDataSync(() => load(), { intervalMs: LIVE_SYNC_MS })

  const metrics = useMemo(() => {
    if (!profile?.birth_date) return []
    const cells: MetricCell[] = []
    if (profile.latest_weight_kg != null && profile.latest_growth_date) {
      cells.push({
        metric: 'weight',
        value: profile.latest_weight_kg,
        measureDate: profile.latest_growth_date,
      })
    }
    if (profile.latest_height_cm != null && profile.latest_growth_date) {
      cells.push({
        metric: 'height',
        value: profile.latest_height_cm,
        measureDate: profile.latest_growth_date,
      })
    }
    if (headData) {
      cells.push({
        metric: 'head',
        value: headData.value,
        measureDate: headData.date,
      })
    }
    return cells
  }, [profile, headData])

  if (!birthDate || loading) return null
  if (metrics.length === 0) return null

  const gender: Gender = profile?.gender === 'FEMALE' ? 'FEMALE' : 'MALE'
  const birth = profile!.birth_date

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-4 rounded-2xl border border-border bg-card p-2.5 shadow-sm"
    >
      <div className="mb-2 flex items-center gap-1.5 px-0.5">
        <Scale className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Pertumbuhan
        </span>
      </div>
      <button
        type="button"
        onClick={() => router.push(pageToPath('stats'), { scroll: false })}
        className="block w-full text-left transition-opacity hover:opacity-90"
      >
        <div className="flex gap-2">
          {metrics.map((cell) => (
            <GrowthMetricTile
              key={cell.metric}
              {...cell}
              birthDate={birth}
              gender={gender}
            />
          ))}
        </div>
      </button>
    </motion.div>
  )
}
