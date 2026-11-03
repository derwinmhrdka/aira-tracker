'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowDown, ArrowUp, Check, ChevronDown, Minus, Ruler, Scale, ScanFace, type LucideIcon } from 'lucide-react'
import { api, getLoggedBy, type BabyProfile, type GrowthLog, type TodaySummary } from '@/lib/api-client'
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
  GROWTH_TREND_LABEL,
  growthMetricShortLabel,
  growthMetricUnit,
  type GrowthTrend,
} from '@/lib/growth-mini'
import { GrowthCurve, type GrowthCurveMode } from './growth-curve'
import { GrowthStage, type GrowthStageHandle } from './growth-stage'
import { buildGrowthMetrics, type GrowthMetricCell } from '@/lib/growth-metrics'
import { GrowthInfoSheet, type GrowthInfoItem } from './growth-info-sheet'
import { BabyLeapCard } from './baby-leap-card'
import { NextEventCard } from './next-event-card'
import { VaccineInfoSheet } from './vaccine-info-sheet'
import { ageMonthsAndDays } from '@/lib/baby-utils'
import '@/app/kms-baby.css'

type HomeGrowthPanelProps = {
  birthDate?: string | null
  dueDate?: string | null
  showLeap?: boolean
  showEvent?: boolean
  showIdentity?: boolean
  baby?: TodaySummary['baby']
  nextVaccine?: TodaySummary['nextVaccine']
}

const GLASS_CARD =
  'pointer-events-auto w-full rounded-2xl border border-white/40 bg-white/30 shadow-sm backdrop-blur-sm'

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

const CURVE_OPTIONS: Array<{ id: GrowthCurveMode; label: string; aria: string }> = [
  { id: 'all', label: 'Semua', aria: 'Semua kurva' },
  { id: 'weight', label: 'Berat', aria: 'Kurva berat' },
  { id: 'height', label: 'Panjang', aria: 'Kurva panjang' },
  { id: 'head', label: 'Lingkar kepala', aria: 'Kurva lingkar kepala' },
]

const TREND_TEXT: Record<GrowthTrend, string> = {
  normal: 'text-emerald-700',
  under: 'text-amber-700',
  over: 'text-orange-700',
}

const TREND_DOT: Record<GrowthTrend, string> = {
  normal: 'bg-emerald-600',
  under: 'bg-amber-600',
  over: 'bg-orange-600',
}

const TREND_MARK: Record<GrowthTrend, LucideIcon> = {
  normal: Minus,
  under: ArrowDown,
  over: ArrowUp,
}

const METER_TRACK =
  'linear-gradient(to right, #ef4444 0%, #f59e0b 22%, #10b981 50%, #f59e0b 78%, #ef4444 100%)'

const METRIC_ICON: Record<GrowthMetric, LucideIcon> = {
  weight: Scale,
  height: Ruler,
  head: ScanFace,
}

function curveHasData(mode: GrowthCurveMode, saved: SavedGrowth) {
  if (mode === 'all' || mode === 'weight') return saved.weight > 0
  const current = mode === 'height' ? saved.height : saved.head
  if (current != null && current > 0) return true
  return saved.history.some((point) => {
    const value = mode === 'height' ? point.height : point.head
    return value != null && value > 0
  })
}

function curveEmptyCopy(mode: GrowthCurveMode) {
  if (mode === 'height') return 'Belum ada panjang tersimpan.'
  if (mode === 'head') return 'Belum ada lingkar kepala tersimpan.'
  return 'Belum ada berat tersimpan.'
}

function CurvePicker({
  value,
  onChange,
}: {
  value: GrowthCurveMode
  onChange: (mode: GrowthCurveMode) => void
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const current = CURVE_OPTIONS.find((option) => option.id === value) ?? CURVE_OPTIONS[0]

  useEffect(() => {
    if (!open) return
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={current.aria}
        onClick={() => setOpen((currentOpen) => !currentOpen)}
        className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background py-1 pr-2 pl-3 text-xs font-semibold text-foreground shadow-sm"
      >
        {current.label}
        <ChevronDown
          className={`size-3.5 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`}
          aria-hidden
        />
      </button>
      {open ? (
        <ul
          role="listbox"
          aria-label="Pilih kurva"
          className="absolute top-[calc(100%+0.4rem)] right-0 z-30 w-44 overflow-hidden rounded-2xl border border-border bg-popover p-1 shadow-lg"
        >
          {CURVE_OPTIONS.map((option) => {
            const selected = option.id === value
            return (
              <li key={option.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm ${
                    selected ? 'bg-primary/10 font-semibold text-primary' : 'text-foreground hover:bg-muted'
                  }`}
                  onClick={() => {
                    onChange(option.id)
                    setOpen(false)
                  }}
                >
                  {option.label}
                  {selected ? <Check className="size-3.5" aria-hidden /> : <span className="size-3.5" />}
                </button>
              </li>
            )
          })}
        </ul>
      ) : null}
    </div>
  )
}

function babyGreeting() {
  const who = getLoggedBy()
  if (who === 'IBU') return 'Hihi, hello Ibun! 💕'
  if (who === 'AYAH') return 'Hihi, hi papa! 💙'
  return 'Hihi!'
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

function GrowthReadout({
  metric,
  cell,
  birthDate,
  gender,
  open,
  onToggle,
  onDetail,
}: {
  metric: GrowthMetric
  cell: GrowthMetricCell | null
  birthDate: string | null
  gender: Gender
  open: boolean
  onToggle: () => void
  onDetail: () => void
}) {
  const fullLabel = growthMetricShortLabel(metric)
  const MetricIcon = METRIC_ICON[metric]
  const trend =
    cell && birthDate
      ? getGrowthTrend(cell.value, birthDate, cell.measureDate, metric, gender)
      : null
  const TrendIcon = trend ? TREND_MARK[trend] : null
  const number = cell ? formatGrowthValue(cell.value, metric) : '—'
  const unit = growthMetricUnit(metric)
  const status = trend ? GROWTH_TREND_LABEL[trend] : 'Belum ada'
  const meter =
    cell && birthDate
      ? getGrowthGaugePercent(cell.value, birthDate, cell.measureDate, metric, gender)
      : null

  return (
    <div className="relative min-w-0">
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation()
          onToggle()
        }}
        className="flex w-full flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-slate-900"
        aria-expanded={open}
        aria-label={cell ? `${fullLabel} ${number} ${unit}, ${status}` : `${fullLabel}, belum ada`}
      >
        <span className="text-center text-[9px] leading-none font-semibold tracking-wide whitespace-nowrap text-slate-600">
          {fullLabel}
        </span>
        <span className="flex items-center justify-center gap-1">
          <span className="grid size-5 shrink-0 place-items-center rounded-full border border-slate-400/70 bg-white/40">
            <MetricIcon className="size-3 text-slate-700" strokeWidth={2.25} aria-hidden />
          </span>
          <span className="font-heading text-[13px] leading-none font-bold tabular-nums">
            {number}
            {cell ? <span className="ml-0.5 text-[9px] font-medium text-slate-600">{unit}</span> : null}
          </span>
          {TrendIcon ? (
            <TrendIcon
              className={`size-3.5 shrink-0 ${trend ? TREND_TEXT[trend] : 'text-slate-400'}`}
              strokeWidth={2.5}
              aria-hidden
            />
          ) : (
            <Minus className="size-3.5 shrink-0 text-slate-400" strokeWidth={2.5} aria-hidden />
          )}
        </span>
      </button>
      {open ? (
        <div
          className="absolute top-[calc(100%+0.35rem)] left-1/2 z-30 w-36 -translate-x-1/2 rounded-xl border border-white/70 bg-white/90 p-2.5 text-center shadow-md backdrop-blur-md"
          onClick={(event) => event.stopPropagation()}
        >
          <p className={`text-[11px] leading-none font-semibold ${trend ? TREND_TEXT[trend] : 'text-slate-400'}`}>
            {status}
          </p>
          <span
            className="relative mt-2 block h-1.5 w-full overflow-visible rounded-full bg-slate-200"
            style={meter != null ? { background: METER_TRACK } : undefined}
            aria-hidden
          >
            <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-white/80" />
            {meter != null && trend ? (
              <span
                className={`absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white shadow-sm ${TREND_DOT[trend]}`}
                style={{ left: `${meter}%` }}
              />
            ) : null}
          </span>
          {cell ? (
            <button
              type="button"
              className="mt-2 text-[10px] font-semibold text-slate-600 underline-offset-2 hover:underline"
              onClick={(event) => {
                event.stopPropagation()
                onDetail()
              }}
            >
              Detail
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

function AgeReadout({ birthDate }: { birthDate?: string | null }) {
  if (!birthDate) {
    return <span className="shrink-0 text-sm font-semibold text-slate-500">—</span>
  }
  const { months, days } = ageMonthsAndDays(birthDate)
  return (
    <span className="inline-grid h-8 shrink-0 grid-cols-[auto_auto] grid-rows-2 items-stretch gap-x-0.5 leading-none">
      <span className="row-span-2 self-center font-heading text-[2rem] font-bold tabular-nums leading-none text-slate-900">
        {months}
      </span>
      <span className="self-start text-[11px] font-semibold leading-none text-slate-600">m</span>
      <span className="self-end text-[11px] font-semibold tabular-nums leading-none text-slate-600">
        {days}
        <span className="text-[8px] font-medium">d</span>
      </span>
    </span>
  )
}

function VaccineBadge({ brief }: { brief: NonNullable<TodaySummary['nextVaccine']> }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation()
          setOpen(true)
        }}
        className="inline-flex items-center gap-1.5 rounded-full border border-white/40 bg-white/30 px-2.5 py-1 text-[11px] font-semibold text-slate-900 shadow-sm backdrop-blur-sm"
        aria-expanded={open}
      >
        <span aria-hidden>💉</span>
        <span className="max-w-28 truncate">{brief.name}</span>
      </button>
      <VaccineInfoSheet open={open} brief={brief} onClose={() => setOpen(false)} />
    </>
  )
}

export function HomeGrowthPanel({
  birthDate,
  dueDate,
  showLeap = true,
  showEvent = true,
  showIdentity = true,
  baby = null,
  nextVaccine = null,
}: HomeGrowthPanelProps) {
  const [profile, setProfile] = useState<BabyProfile | null>(null)
  const [logs, setLogs] = useState<GrowthLog[]>([])
  const [ready, setReady] = useState(false)
  const [infoOpen, setInfoOpen] = useState(false)
  const [tipMetric, setTipMetric] = useState<GrowthMetric | null>(null)
  const [curveMode, setCurveMode] = useState<GrowthCurveMode>('all')
  const [greet, setGreet] = useState<string | null>(null)
  const [showMetrics, setShowMetrics] = useState(!showIdentity)
  const stageRef = useRef<GrowthStageHandle>(null)
  const metricsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!showMetrics || !showIdentity) return
    const back = () => {
      setTipMetric(null)
      setShowMetrics(false)
    }
    const timer = window.setTimeout(back, 5000)
    const onPointerDown = (event: PointerEvent) => {
      const card = metricsRef.current
      if (card && event.target instanceof Node && card.contains(event.target)) return
      back()
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => {
      window.clearTimeout(timer)
      document.removeEventListener('pointerdown', onPointerDown)
    }
  }, [showMetrics, showIdentity])

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
          setTipMetric(null)
          stageRef.current?.react()
          setGreet(babyGreeting())
          window.setTimeout(() => setGreet(null), 2600)
        }}
      >
        <GrowthStage ref={stageRef} status={reading?.status ?? 'normal'} />
        <div className="kms-hud">
          <div className="overflow-hidden">
          <AnimatePresence mode="wait" initial={false}>
            {showMetrics || !showIdentity ? (
              <motion.div
                key="metrics"
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                ref={metricsRef}
                className={`${GLASS_CARD} grid grid-cols-3 divide-x divide-white/50 p-1`}
                onClick={(event) => event.stopPropagation()}
              >
                {METRICS.map((metric) => (
                  <GrowthReadout
                    key={metric}
                    metric={metric}
                    cell={metricByKey.get(metric) ?? null}
                    birthDate={resolvedBirth}
                    gender={gender}
                    open={tipMetric === metric}
                    onToggle={() => setTipMetric((current) => (current === metric ? null : metric))}
                    onDetail={() => {
                      setTipMetric(null)
                      setInfoOpen(true)
                    }}
                  />
                ))}
              </motion.div>
            ) : (
              <motion.div
                key="identity"
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                className={`${GLASS_CARD} flex items-center gap-2 px-2.5 py-1.5`}
              >
                <button
                  type="button"
                  className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
                  onClick={(event) => {
                    event.stopPropagation()
                    setShowMetrics(true)
                  }}
                  aria-label="Lihat berat, panjang, dan lingkar kepala"
                >
                  {baby?.photo_url ? (
                    <img
                      src={baby.photo_url}
                      alt=""
                      className="size-10 shrink-0 rounded-full object-cover ring-2 ring-white/70"
                    />
                  ) : (
                    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-white/50 text-lg">
                      👶
                    </span>
                  )}
                  <span className="min-w-0 flex-1 truncate font-heading text-sm font-bold text-slate-900">
                    {baby?.name ?? '—'}
                  </span>
                  <AgeReadout birthDate={baby?.birth_date} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
          </div>

          {greet ? <span className="kms-bubble max-w-[92%] text-center text-sm whitespace-nowrap">{greet}</span> : null}

          <div
            className="pointer-events-auto flex items-end justify-between gap-2"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex flex-wrap items-center gap-1.5">
              {showLeap ? <BabyLeapCard birthDate={resolvedBirth} dueDate={dueDate} /> : null}
              {nextVaccine ? <VaccineBadge brief={nextVaccine} /> : null}
            </div>
            {showEvent ? <NextEventCard /> : null}
          </div>
        </div>
      </div>

      <div className="mt-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="mb-2 flex items-center justify-between gap-3">
          <h2 className="font-heading text-lg font-semibold text-foreground">Kurva</h2>
          <CurvePicker value={curveMode} onChange={setCurveMode} />
        </div>
        {saved && reading ? (
          curveHasData(curveMode, saved) ? (
            <>
              <p className="mb-2 text-xs font-medium text-muted-foreground">{formatMeasureDate(saved.measureDate)}</p>
              <GrowthCurve
                key={curveMode}
                mode={curveMode}
                month={saved.month}
                weight={saved.weight}
                height={saved.height}
                head={saved.head}
                gender={saved.gender}
                history={saved.history}
              />
            </>
          ) : (
            <p className="text-sm text-muted-foreground">{curveEmptyCopy(curveMode)}</p>
          )
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
