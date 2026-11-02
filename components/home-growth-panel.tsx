'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { api, type BabyProfile, type GrowthLog } from '@/lib/api-client'
import { ageInMonths, type Gender, type GrowthMetric } from '@/lib/who-growth'
import { useAppDataSync } from '@/lib/use-app-data-sync'
import {
  KMS_CHART_MAX_MONTH,
  formatMeasureDate,
  kmsBabyStatusFromZ,
  metricZScore,
  type KmsBabyStatus,
} from '@/lib/kms-baby'
import {
  formatGrowthValue,
  getGrowthGaugePercent,
  getGrowthTrend,
  growthMetricShortLabel,
  growthMetricUnit,
  type GrowthTrend,
} from '@/lib/growth-mini'
import { GrowthCurve } from './growth-curve'
import { GrowthStage, type GrowthStageHandle } from './growth-stage'
import { buildGrowthMetrics, type GrowthMetricCell } from '@/lib/growth-metrics'
import { GrowthInfoSheet, type GrowthInfoItem } from './growth-info-sheet'
import { BabyLeapCard } from './baby-leap-card'
import { NextEventCard } from './next-event-card'
import '@/app/kms-baby.css'

type HomeGrowthPanelProps = {
  birthDate?: string | null
  dueDate?: string | null
  showLeap?: boolean
  showEvent?: boolean
}

type SavedGrowth = {
  gender: Gender
  birthDate: string
  measureDate: string
  month: number
  weight: number
  height: number | null
  head: number | null
  history: Array<{ month: number; weight: number; height: number | null; head: number | null }>
}

const METRICS: GrowthMetric[] = ['weight', 'height', 'head']

const TREND_STROKE: Record<GrowthTrend, string> = {
  normal: '#059669',
  under: '#d97706',
  over: '#ea580c',
}

function latestLog(logs: GrowthLog[]) {
  return [...logs].sort((a, b) => b.date.localeCompare(a.date))[0] ?? null
}

function savedFromSources(profile: BabyProfile, logs: GrowthLog[]): SavedGrowth | null {
  if (!profile.birth_date) return null
  const log = latestLog(logs)
  const weight = log?.weight_kg ?? profile.latest_weight_kg
  const measureDate = log?.date ?? profile.latest_growth_date
  if (weight == null || weight <= 0 || !measureDate) return null

  const heightFromLog = log?.height_cm != null && log.height_cm > 0
  const headFromLog = log?.head_circumference_cm != null && log.head_circumference_cm > 0
  const heightRaw = heightFromLog ? log.height_cm : profile.latest_height_cm
  const headRaw = headFromLog ? log.head_circumference_cm : profile.latest_head_circumference_cm
  const gender: Gender = profile.gender === 'FEMALE' ? 'FEMALE' : 'MALE'

  const history = logs
    .filter((item) => item.weight_kg > 0)
    .map((item) => ({
      month: ageInMonths(profile.birth_date, item.date),
      weight: item.weight_kg,
      height: item.height_cm > 0 ? item.height_cm : null,
      head: item.head_circumference_cm != null && item.head_circumference_cm > 0 ? item.head_circumference_cm : null,
    }))
    .filter((item) => item.month <= KMS_CHART_MAX_MONTH)

  return {
    gender,
    birthDate: profile.birth_date,
    measureDate,
    month: ageInMonths(profile.birth_date, measureDate),
    weight,
    height: heightRaw != null && heightRaw > 0 ? heightRaw : null,
    head: headRaw != null && headRaw > 0 ? headRaw : null,
    history,
  }
}

function GrowthDonut({
  metric,
  cell,
  birthDate,
  gender,
  onOpen,
}: {
  metric: GrowthMetric
  cell: GrowthMetricCell | null
  birthDate: string | null
  gender: Gender
  onOpen: () => void
}) {
  const label = growthMetricShortLabel(metric)
  const trend =
    cell && birthDate
      ? getGrowthTrend(cell.value, birthDate, cell.measureDate, metric, gender)
      : null
  const pct =
    cell && birthDate
      ? getGrowthGaugePercent(cell.value, birthDate, cell.measureDate, metric, gender)
      : null
  const radius = 16
  const circumference = 2 * Math.PI * radius
  const filled = pct == null ? 0 : (pct / 100) * circumference
  const number = cell ? formatGrowthValue(cell.value, metric) : '—'
  const unit = growthMetricUnit(metric)

  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation()
        if (cell) onOpen()
      }}
      className="flex min-w-0 flex-1 flex-col items-center gap-1 text-slate-900"
      aria-label={cell ? `${label} ${number} ${unit}` : label}
    >
      <span className="max-w-16 text-center text-[10px] font-semibold leading-tight tracking-wide uppercase">
        {cell ? label : 'Lingkar kepala'}
      </span>
      <span className="relative grid size-[4.4rem] place-items-center">
        <svg viewBox="0 0 40 40" className="size-[4.4rem] -rotate-90" aria-hidden>
          <circle cx="20" cy="20" r={radius} fill="none" stroke="rgb(226 232 240)" strokeWidth="3.5" />
          {filled > 0 ? (
            <circle
              cx="20"
              cy="20"
              r={radius}
              fill="none"
              stroke={trend ? TREND_STROKE[trend] : '#059669'}
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeDasharray={`${filled} ${circumference - filled}`}
            />
          ) : null}
        </svg>
        <span className="absolute text-center leading-none">
          <span className="block font-heading text-sm font-bold tabular-nums">{number}</span>
          {cell && unit ? <span className="mt-0.5 block text-[9px] font-medium text-slate-500">{unit}</span> : null}
        </span>
      </span>
    </button>
  )
}

export function HomeGrowthPanel({
  birthDate,
  dueDate,
  showLeap = true,
  showEvent = true,
}: HomeGrowthPanelProps) {
  const [profile, setProfile] = useState<BabyProfile | null>(null)
  const [logs, setLogs] = useState<GrowthLog[]>([])
  const [ready, setReady] = useState(false)
  const [infoOpen, setInfoOpen] = useState(false)
  const [greet, setGreet] = useState(false)
  const stageRef = useRef<GrowthStageHandle>(null)

  const load = useCallback(async () => {
    try {
      const [baby, growth] = await Promise.all([
        api.getBabyProfile().catch(() => null),
        api.getGrowth().catch(() => [] as GrowthLog[]),
      ])
      setProfile(baby)
      setLogs(growth)
    } finally {
      setReady(true)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useAppDataSync(load, { poll: false })

  const saved = useMemo(() => (profile ? savedFromSources(profile, logs) : null), [profile, logs])
  const metrics = useMemo(() => buildGrowthMetrics(logs, profile), [logs, profile])
  const metricByKey = useMemo(() => {
    const map = new Map<GrowthMetric, GrowthMetricCell>()
    for (const cell of metrics) map.set(cell.metric, cell)
    return map
  }, [metrics])

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

  const reading = useMemo(() => {
    if (!saved) return null
    const weightZ = metricZScore(saved.weight, saved.birthDate, saved.measureDate, 'weight', saved.gender)
    const status: KmsBabyStatus = weightZ == null ? 'normal' : kmsBabyStatusFromZ(weightZ)
    return { weightZ, status }
  }, [saved])

  const resolvedBirth = saved?.birthDate ?? profile?.birth_date ?? birthDate ?? null
  const gender: Gender = saved?.gender ?? (profile?.gender === 'FEMALE' ? 'FEMALE' : 'MALE')

  return (
    <section className="mb-4">
      <div
        className="kms-hero"
        onClick={() => {
          stageRef.current?.react()
          setGreet(true)
          window.setTimeout(() => setGreet(false), 2600)
        }}
      >
        <GrowthStage ref={stageRef} status={reading?.status ?? 'normal'} />
        <div className="kms-hud">
          <div
            className="pointer-events-auto mx-auto w-full max-w-md rounded-2xl border border-white/70 bg-white/80 px-2 py-2 shadow-sm backdrop-blur-md"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-1">
              {METRICS.map((metric) => (
                <GrowthDonut
                  key={metric}
                  metric={metric}
                  cell={metricByKey.get(metric) ?? null}
                  birthDate={resolvedBirth}
                  gender={gender}
                  onOpen={() => setInfoOpen(true)}
                />
              ))}
            </div>
          </div>

          {greet ? <span className="kms-bubble">Hihi!</span> : null}

          <div
            className="pointer-events-auto flex items-end justify-between gap-2"
            onClick={(event) => event.stopPropagation()}
          >
            {showLeap ? <BabyLeapCard birthDate={resolvedBirth} dueDate={dueDate} /> : <span />}
            {showEvent ? <NextEventCard /> : null}
          </div>
        </div>
      </div>

      <div className="mt-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="mb-2 flex items-baseline justify-between gap-3">
          <h2 className="font-heading text-lg font-semibold text-foreground">Kurva berat</h2>
          <p className="text-sm font-semibold text-muted-foreground">
            {reading?.weightZ == null ? '—' : `Z ${reading.weightZ.toFixed(1)}`}
          </p>
        </div>
        {saved && reading ? (
          <>
            <p className="mb-2 text-xs font-medium text-muted-foreground">{formatMeasureDate(saved.measureDate)}</p>
            <GrowthCurve
              month={saved.month}
              weight={saved.weight}
              height={saved.height}
              head={saved.head}
              gender={saved.gender}
              history={saved.history}
            />
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            {ready ? 'Belum ada berat tersimpan.' : 'Memuat kurva...'}
          </p>
        )}
      </div>

      {resolvedBirth ? (
        <GrowthInfoSheet
          open={infoOpen}
          items={infoItems}
          birthDate={resolvedBirth}
          gender={gender}
          onClose={() => setInfoOpen(false)}
        />
      ) : null}
    </section>
  )
}
