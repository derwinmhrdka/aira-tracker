'use client'

import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, Check, Scale } from 'lucide-react'
import { api, type BabyProfile, type GrowthLog } from '@/lib/api-client'
import {
  formatGrowthIdealDelta,
  formatGrowthValue,
  formatGrowthVelocityStatusLabel,
  getGrowthGaugePercent,
  getGrowthTrend,
  getGrowthVelocityTrend,
  getMetricPreviousMeasurement,
  getMetricHistoryFromLogs,
  growthMetricShortLabel,
  growthMetricUnit,
  type GrowthMetricPoint,
  type GrowthTrend,
} from '@/lib/growth-mini'
import type { Gender, GrowthMetric } from '@/lib/who-growth'
import { useAppDataSync } from '@/lib/use-app-data-sync'
import { GrowthInfoSheet, type GrowthInfoItem } from './growth-info-sheet'

type MetricCell = {
  metric: GrowthMetric
  value: number
  measureDate: string
  previous?: GrowthMetricPoint
}

const GAUGE_GRADIENT =
  'linear-gradient(to right, #ef4444 0%, #fb923c 20%, #22c55e 50%, #fb923c 80%, #ef4444 100%)'

const TREND_STYLE: Record<
  GrowthTrend,
  { ring: string; dot: string; delta: string }
> = {
  normal: {
    ring: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
    dot: 'bg-emerald-500',
    delta: 'text-emerald-600 dark:text-emerald-400',
  },
  under: {
    ring: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
    dot: 'bg-amber-500',
    delta: 'text-amber-600 dark:text-amber-400',
  },
  over: {
    ring: 'bg-orange-500/15 text-orange-600 dark:text-orange-400',
    dot: 'bg-orange-500',
    delta: 'text-orange-600 dark:text-orange-400',
  },
}

function TrendIcon({ trend }: { trend: GrowthTrend }) {
  const className = 'h-3.5 w-3.5'
  if (trend === 'normal') return <Check className={className} strokeWidth={3} />
  if (trend === 'under') return <ArrowDown className={className} strokeWidth={2.5} />
  return <ArrowUp className={className} strokeWidth={2.5} />
}

const GrowthMetricTile = memo(function GrowthMetricTile({
  metric,
  value,
  birthDate,
  measureDate,
  gender,
  previous,
}: MetricCell & {
  birthDate: string
  measureDate: string
  gender: Gender
}) {
  const trend = getGrowthTrend(value, birthDate, measureDate, metric, gender)
  const idealDelta = formatGrowthIdealDelta(value, birthDate, measureDate, metric, gender)
  const gaugePct = getGrowthGaugePercent(value, birthDate, measureDate, metric, gender)
  const velocity = previous
    ? getGrowthVelocityTrend({ value, date: measureDate }, previous, birthDate, metric, gender)
    : null
  const style = TREND_STYLE[trend]
  const velocityStyle = velocity ? TREND_STYLE[velocity.trend] : null
  const showIdealDelta = trend !== 'normal' && idealDelta != null

  return (
    <div className="min-w-0 flex-1 rounded-xl border border-border/70 bg-background/60 px-2 py-2">
      <div className="mb-1.5 flex items-center justify-between gap-1">
        <span className="text-[9px] font-medium uppercase leading-tight tracking-wide text-muted-foreground">
          {growthMetricShortLabel(metric)}
        </span>
        <div className="flex shrink-0 items-center gap-0.5">
          {showIdealDelta ? (
            <span className={`text-[9px] font-bold tabular-nums leading-none ${style.delta}`}>
              {idealDelta}
            </span>
          ) : null}
          <span
            className={`flex h-5 w-5 items-center justify-center rounded-full ${style.ring}`}
            aria-label={`Posisi ${trend === 'normal' ? 'normal' : trend === 'under' ? 'kurang' : 'lebih'}`}
          >
            <TrendIcon trend={trend} />
          </span>
        </div>
      </div>

      <p className="text-sm font-bold tabular-nums leading-none text-foreground">
        {formatGrowthValue(value, metric)}
        <span className="ml-0.5 text-[9px] font-medium text-muted-foreground">
          {growthMetricUnit(metric)}
        </span>
      </p>

      {gaugePct != null ? (
        <div
          className="relative mt-2 h-1.5 overflow-hidden rounded-full"
          style={{ background: GAUGE_GRADIENT }}
        >
          <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-white/50" />
          <div
            className={`absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background shadow-sm ${style.dot}`}
            style={{ left: `${gaugePct}%` }}
          />
        </div>
      ) : null}

      {velocity && velocityStyle ? (
        <p
          className={`mt-1.5 text-center text-[9px] font-semibold leading-tight ${velocityStyle.delta}`}
        >
          {formatGrowthVelocityStatusLabel(velocity)}
        </p>
      ) : null}
    </div>
  )
})

type GrowthMiniCardProps = {
  birthDate?: string | null
}

function buildMetricsFromLogs(logs: GrowthLog[]): MetricCell[] {
  const metrics: GrowthMetric[] = ['weight', 'height', 'head']
  const cells: MetricCell[] = []

  for (const metric of metrics) {
    const history = getMetricHistoryFromLogs(logs, metric)
    if (history.length === 0) continue
    const current = history[0]
    cells.push({
      metric,
      value: current.value,
      measureDate: current.date,
      previous: getMetricPreviousMeasurement(history) ?? undefined,
    })
  }

  return cells
}

function buildMetricsFromProfile(profile: BabyProfile): MetricCell[] {
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
  if (
    profile.latest_head_circumference_cm != null &&
    profile.latest_head_circumference_cm > 0 &&
    profile.latest_head_date
  ) {
    cells.push({
      metric: 'head',
      value: profile.latest_head_circumference_cm,
      measureDate: profile.latest_head_date,
    })
  }
  return cells
}

export function GrowthMiniCard({ birthDate }: GrowthMiniCardProps) {
  const [profile, setProfile] = useState<BabyProfile | null>(null)
  const [logs, setLogs] = useState<GrowthLog[]>([])
  const [ready, setReady] = useState(false)
  const [infoOpen, setInfoOpen] = useState(false)

  const load = useCallback(async () => {
    if (!birthDate) {
      setReady(true)
      return
    }
    try {
      const [p, growthLogs] = await Promise.all([
        api.getBabyProfile().catch(() => null),
        api.getGrowth().catch(() => [] as GrowthLog[]),
      ])
      setProfile(p)
      setLogs(growthLogs)
    } finally {
      setReady(true)
    }
  }, [birthDate])

  useEffect(() => {
    load()
  }, [load])

  useAppDataSync(load, { poll: false })

  const metrics = useMemo(() => {
    if (logs.length > 0) return buildMetricsFromLogs(logs)
    if (profile) return buildMetricsFromProfile(profile)
    return []
  }, [logs, profile])

  const infoItems = useMemo<GrowthInfoItem[]>(
    () =>
      metrics.map((cell) => ({
        metric: cell.metric,
        value: cell.value,
        measureDate: cell.measureDate,
        previous: cell.previous,
      })),
    [metrics]
  )

  if (!birthDate || !ready) return null
  if (!profile?.birth_date || metrics.length === 0) return null

  const gender: Gender = profile.gender === 'FEMALE' ? 'FEMALE' : 'MALE'

  return (
    <>
      <div className="mb-4 rounded-2xl border border-border bg-card p-2.5 shadow-sm">
        <div className="mb-2 flex items-center gap-1.5 px-0.5">
          <Scale className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
          <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Pertumbuhan
          </span>
        </div>
        <button
          type="button"
          onClick={() => setInfoOpen(true)}
          className="block w-full text-left active:opacity-90"
        >
          <div className="flex gap-2">
            {metrics.map((cell) => (
              <GrowthMetricTile
                key={cell.metric}
                {...cell}
                birthDate={profile.birth_date}
                gender={gender}
              />
            ))}
          </div>
        </button>
      </div>

      <GrowthInfoSheet
        open={infoOpen}
        items={infoItems}
        birthDate={profile.birth_date}
        gender={gender}
        onClose={() => setInfoOpen(false)}
      />
    </>
  )
}
