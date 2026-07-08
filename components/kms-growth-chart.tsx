'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import {
  buildDenseChartData,
  ageInMonths,
  type GrowthMetric,
  type Gender,
} from '@/lib/who-growth'
import {
  getKmsZone,
  KMS_ZONE_HINT,
  KMS_ZONE_LABEL,
  KMS_ZONE_STYLE,
  type KmsZone,
} from '@/lib/kms-status'
import type { GrowthLog } from '@/lib/api-client'

const MAX_MONTH = 24
const MIN_SPAN = 3
const BABY_DOT_COLOR = '#3b82f6'

interface KmsGrowthChartProps {
  growthLogs: GrowthLog[]
  birthDate: string
  gender?: Gender
  metric?: GrowthMetric
}

type MonthRange = { start: number; end: number }

type PinchState = {
  distance: number
  centerRatio: number
  range: MonthRange
}

function ChartLegendItem({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      {children}
      <span>{label}</span>
    </span>
  )
}

function touchDistance(touches: TouchList): number {
  const dx = touches[0].clientX - touches[1].clientX
  const dy = touches[0].clientY - touches[1].clientY
  return Math.hypot(dx, dy)
}

function touchCenterRatio(touches: TouchList, rect: DOMRect): number {
  const cx = (touches[0].clientX + touches[1].clientX) / 2
  return Math.min(1, Math.max(0, (cx - rect.left) / rect.width))
}

function clampRange(start: number, end: number): MonthRange {
  let span = Math.max(MIN_SPAN, Math.min(MAX_MONTH, end - start))
  let nextStart = Math.max(0, start)
  let nextEnd = Math.min(MAX_MONTH, nextStart + span)
  if (nextEnd - nextStart < span) {
    nextStart = Math.max(0, nextEnd - span)
  }
  span = nextEnd - nextStart
  return { start: nextStart, end: nextEnd }
}

function rangeFromZoom(
  base: MonthRange,
  scale: number,
  centerRatio: number
): MonthRange {
  const span = base.end - base.start
  const newSpan = Math.max(MIN_SPAN, Math.min(MAX_MONTH, span / scale))
  const center = base.start + span * centerRatio
  return clampRange(center - newSpan * centerRatio, center + newSpan * (1 - centerRatio))
}

function tickInterval(span: number): number {
  if (span <= 6) return 1
  if (span <= 14) return 2
  return 5
}

function buildXTicks(start: number, end: number): number[] {
  const interval = tickInterval(end - start)
  const ticks: number[] = []
  for (let month = start; month <= end; month++) {
    if (month % interval === 0 || month === end) {
      ticks.push(month)
    }
  }
  if (!ticks.includes(start)) ticks.unshift(start)
  return ticks
}

export function KmsGrowthChart({
  growthLogs,
  birthDate,
  gender = 'MALE',
  metric = 'weight',
}: KmsGrowthChartProps) {
  const chartRef = useRef<HTMLDivElement>(null)
  const pinchRef = useRef<PinchState | null>(null)

  const [viewRange, setViewRange] = useState<MonthRange>({ start: 0, end: MAX_MONTH })

  const fullData = useMemo(
    () =>
      buildDenseChartData(
        growthLogs.map((g) => ({
          date: g.date,
          value: metric === 'weight' ? g.weight_kg : g.height_cm,
        })),
        birthDate,
        metric,
        gender,
        MAX_MONTH
      ),
    [growthLogs, birthDate, metric, gender]
  )

  const visibleData = useMemo(
    () => fullData.filter((d) => d.month >= viewRange.start && d.month <= viewRange.end),
    [fullData, viewRange]
  )

  const xTicks = useMemo(
    () => buildXTicks(viewRange.start, viewRange.end),
    [viewRange]
  )

  const logByMonth = useMemo(() => {
    const map = new Map<number, { date: string; value: number }>()
    for (const g of growthLogs) {
      const month = Math.round(ageInMonths(birthDate, g.date))
      const existing = map.get(month)
      if (!existing || g.date > existing.date) {
        map.set(month, {
          date: g.date,
          value: metric === 'weight' ? g.weight_kg : g.height_cm,
        })
      }
    }
    return map
  }, [growthLogs, birthDate, metric])

  const latestBabyMonth = useMemo(() => {
    if (growthLogs.length === 0) return null
    const latest = growthLogs.reduce((a, b) =>
      new Date(a.date) > new Date(b.date) ? a : b
    )
    return Math.round(ageInMonths(birthDate, latest.date))
  }, [growthLogs, birthDate])

  const zoneForMonth = useCallback(
    (month: number, value: number): KmsZone => {
      const log = logByMonth.get(month)
      if (!log) return 'unknown'
      return getKmsZone(value, birthDate, log.date, metric, gender)
    },
    [logByMonth, birthDate, metric, gender]
  )

  const applyZoom = useCallback((scale: number, centerRatio: number) => {
    setViewRange((current) => rangeFromZoom(current, scale, centerRatio))
  }, [])

  const resetZoom = useCallback(() => {
    setViewRange({ start: 0, end: MAX_MONTH })
  }, [])

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length !== 2 || !chartRef.current) return
    const rect = chartRef.current.getBoundingClientRect()
    pinchRef.current = {
      distance: touchDistance(e.touches),
      centerRatio: touchCenterRatio(e.touches, rect),
      range: viewRange,
    }
  }, [viewRange])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length !== 2 || !pinchRef.current) return
    e.preventDefault()
    const dist = touchDistance(e.touches)
    const scale = dist / pinchRef.current.distance
    setViewRange(
      rangeFromZoom(pinchRef.current.range, scale, pinchRef.current.centerRatio)
    )
  }, [])

  const handleTouchEnd = useCallback(() => {
    pinchRef.current = null
  }, [])

  useEffect(() => {
    const el = chartRef.current
    if (!el) return

    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const rect = el.getBoundingClientRect()
      const centerRatio = Math.min(
        1,
        Math.max(0, (e.clientX - rect.left) / rect.width)
      )
      const scale = e.deltaY < 0 ? 1.12 : 0.89
      applyZoom(scale, centerRatio)
    }

    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [applyZoom])

  const unit = metric === 'weight' ? 'kg' : 'cm'
  const label = metric === 'weight' ? 'berat badan' : 'panjang badan'
  const span = viewRange.end - viewRange.start
  const zoomLabel =
    tickInterval(span) === 1
      ? 'per 1 bln'
      : tickInterval(span) === 2
        ? 'per 2 bln'
        : 'per 5 bln'

  const renderTooltip = (props: {
    active?: boolean
    payload?: { dataKey?: string; value?: number; payload?: { month?: number } }[]
    label?: string | number
  }) => {
    const { active, payload, label: month } = props
    if (!active || !payload?.length || month == null) return null
    const baby = payload.find((p) => p.dataKey === 'baby')
    if (baby?.value == null) return null

    const monthNum = Number(month)
    const log = logByMonth.get(monthNum)
    const zone = zoneForMonth(monthNum, baby.value)
    const hint = KMS_ZONE_HINT[zone]

    return (
      <div className="max-w-[200px] rounded-xl border border-border bg-card px-3 py-2 text-xs shadow-md">
        <p className="font-semibold text-foreground">Bulan {month}</p>
        {log && (
          <p className="mt-0.5 text-[10px] text-muted-foreground">
            {new Date(log.date).toLocaleDateString('id-ID', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </p>
        )}
        <p className="mt-1 text-muted-foreground">
          Data bayi:{' '}
          <span className="font-medium text-foreground">
            {baby.value} {unit}
          </span>
        </p>
        <p className="mt-1.5">
          <span
            className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${KMS_ZONE_STYLE[zone]}`}
          >
            KMS: {KMS_ZONE_LABEL[zone]}
          </span>
        </p>
        {hint && (
          <p className="mt-1.5 text-[10px] leading-snug text-muted-foreground">
            {hint}
          </p>
        )}
      </div>
    )
  }

  const renderBabyDot = (props: {
    cx?: number
    cy?: number
    payload?: { month?: number; baby?: number | null }
  }) => {
    const { cx, cy, payload } = props
    if (
      cx == null ||
      cy == null ||
      payload?.baby == null ||
      payload.month == null ||
      payload.month !== latestBabyMonth
    ) {
      return null
    }
    return (
      <circle
        cx={cx}
        cy={cy}
        r={5}
        fill={BABY_DOT_COLOR}
        stroke="#fff"
        strokeWidth={2}
      />
    )
  }

  if (growthLogs.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        Belum ada data — tambah {label} untuk melihat grafik KMS
      </div>
    )
  }

  return (
    <div>
      <div
        ref={chartRef}
        className="relative h-[240px] w-full touch-none select-none"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        onDoubleClick={resetZoom}
      >
        <span className="absolute left-0 top-0 z-10 text-[10px] font-medium text-muted-foreground">
          {unit}
        </span>
        <span className="absolute bottom-0 right-0 z-10 text-[10px] text-muted-foreground">
          Bulan
        </span>
        <span className="absolute right-0 top-0 z-10 rounded-full bg-secondary/80 px-2 py-0.5 text-[9px] text-muted-foreground">
          {viewRange.start}–{viewRange.end} · {zoomLabel}
        </span>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={visibleData}
            margin={{ top: 16, right: 8, left: 0, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.4} />
            <XAxis
              dataKey="month"
              type="number"
              domain={[viewRange.start, viewRange.end]}
              ticks={xTicks}
              allowDecimals={false}
              tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
              tickMargin={6}
              axisLine={{ stroke: 'var(--border)' }}
              tickLine={false}
            />
            <YAxis
              width={32}
              tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
              axisLine={false}
              tickLine={false}
              domain={['auto', 'auto']}
            />
            <Tooltip content={renderTooltip} />

            <Area
              type="monotone"
              dataKey="zoneBahayaLow"
              stroke="none"
              fill="#fca5a5"
              fillOpacity={0.35}
              legendType="none"
              tooltipType="none"
            />
            <Area
              type="monotone"
              dataKey="zoneWaspadaLow"
              stroke="none"
              fill="#fef08a"
              fillOpacity={0.45}
              legendType="none"
              tooltipType="none"
            />
            <Area
              type="monotone"
              dataKey="zoneNormal"
              stroke="none"
              fill="#86efac"
              fillOpacity={0.4}
              legendType="none"
              tooltipType="none"
            />
            <Area
              type="monotone"
              dataKey="zoneWaspadaHigh"
              stroke="none"
              fill="#fef08a"
              fillOpacity={0.45}
              legendType="none"
              tooltipType="none"
            />
            <Area
              type="monotone"
              dataKey="zoneBahayaHigh"
              stroke="none"
              fill="#fca5a5"
              fillOpacity={0.35}
              legendType="none"
              tooltipType="none"
            />
            <Line
              type="monotone"
              dataKey="median"
              stroke="#22c55e"
              strokeWidth={1.5}
              dot={false}
              legendType="none"
              tooltipType="none"
            />
            <Line
              type="monotone"
              dataKey="baby"
              stroke={BABY_DOT_COLOR}
              strokeWidth={2.5}
              dot={renderBabyDot}
              activeDot={{
                r: 6,
                fill: BABY_DOT_COLOR,
                stroke: '#fff',
                strokeWidth: 2,
              }}
              connectNulls
              name="Bayi"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-3 space-y-2 rounded-xl bg-secondary/40 px-3 py-2.5">
        <div className="flex flex-wrap justify-center gap-x-5 gap-y-1 text-[10px] text-muted-foreground">
          <ChartLegendItem label="Data bayi">
            <span className="inline-block h-2 w-2 rounded-full bg-blue-500" />
          </ChartLegendItem>
          <ChartLegendItem label="Normal">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-green-300/70" />
          </ChartLegendItem>
          <ChartLegendItem label="Waspada">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-yellow-300/70" />
          </ChartLegendItem>
          <ChartLegendItem label="Bahaya">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-red-300/70" />
          </ChartLegendItem>
          <ChartLegendItem label="Median WHO">
            <span className="inline-block h-0.5 w-4 rounded bg-green-500" />
          </ChartLegendItem>
        </div>
        <p className="text-center text-[9px] text-muted-foreground">
          Cubit untuk zoom · ketuk garis untuk status KMS · ketuk 2x untuk reset
        </p>
      </div>
    </div>
  )
}
