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
const MIN_MONTH_SPAN = 0
const MIN_Y_SPAN = { weight: 0.5, height: 5 } as const
const BABY_DOT_COLOR = '#3b82f6'

function formatDecimal(value: number): string {
  return Number(value).toFixed(2)
}

interface KmsGrowthChartProps {
  growthLogs: GrowthLog[]
  birthDate: string
  gender?: Gender
  metric?: GrowthMetric
}

type MonthRange = { start: number; end: number }
type YDomain = { min: number; max: number }

type PinchState = {
  distance: number
  centerRatio: number
  range: MonthRange
}

type PanState = {
  startX: number
  startY: number
  xRange: MonthRange
  yDomain: YDomain
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
  let nextStart = Math.round(Math.max(0, Math.min(MAX_MONTH, start)))
  let nextEnd = Math.round(Math.max(0, Math.min(MAX_MONTH, end)))

  if (nextEnd < nextStart) {
    ;[nextStart, nextEnd] = [nextEnd, nextStart]
  }

  const span = nextEnd - nextStart
  if (span < MIN_MONTH_SPAN) {
    const center = (nextStart + nextEnd) / 2
    nextStart = Math.max(0, Math.round(center - MIN_MONTH_SPAN / 2))
    nextEnd = Math.min(MAX_MONTH, nextStart + MIN_MONTH_SPAN)
    if (nextEnd - nextStart < MIN_MONTH_SPAN) {
      nextStart = Math.max(0, nextEnd - MIN_MONTH_SPAN)
    }
  }

  return { start: nextStart, end: nextEnd }
}

function rangeFromZoom(
  base: MonthRange,
  scale: number,
  centerRatio: number
): MonthRange {
  const span = base.end - base.start

  if (scale > 1 && span <= MIN_MONTH_SPAN) {
    return base
  }

  const newSpan =
    scale > 1
      ? Math.max(MIN_MONTH_SPAN, Math.floor(span / scale))
      : Math.min(MAX_MONTH, Math.ceil(span / scale))

  if (scale > 1 && newSpan >= span) {
    return base
  }

  const center = base.start + span * centerRatio
  const nextStart = Math.round(center - newSpan * centerRatio)
  return clampRange(nextStart, nextStart + newSpan)
}

function tickInterval(span: number): number {
  if (span <= 0) return 1
  if (span <= 4) return 1
  if (span <= 10) return 2
  return 5
}

function buildXTicks(start: number, end: number): number[] {
  if (start > end) return [start]

  const span = end - start
  if (span <= 0) return [start]

  const interval = tickInterval(span)
  const ticks = new Set<number>([start, end])

  const alignedStart = Math.ceil(start / interval) * interval
  for (let month = alignedStart; month <= end; month += interval) {
    ticks.add(month)
  }

  return Array.from(ticks).sort((a, b) => a - b)
}

function hasVisibleMonths(range: MonthRange): boolean {
  return buildXTicks(range.start, range.end).length > 0
}

function shiftXRange(range: MonthRange, deltaMonths: number): MonthRange {
  const span = range.end - range.start
  let start = range.start + deltaMonths
  let end = range.end + deltaMonths

  if (start < 0) {
    start = 0
    end = span
  }
  if (end > MAX_MONTH) {
    end = MAX_MONTH
    start = MAX_MONTH - span
  }

  return { start, end }
}

type ChartRow = ReturnType<typeof buildDenseChartData>[number]

function computeAutoYDomain(data: ChartRow[], metric: GrowthMetric): YDomain {
  let min = Infinity
  let max = -Infinity

  for (const row of data) {
    const values = [
      row.minus3,
      row.plus3,
      row.median,
      row.zoneBahayaLow[0],
      row.zoneBahayaHigh[1],
      row.baby,
    ].filter((v): v is number => v != null)

    for (const v of values) {
      min = Math.min(min, v)
      max = Math.max(max, v)
    }
  }

  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    return metric === 'weight' ? { min: 0, max: 5 } : { min: 40, max: 90 }
  }

  const pad = Math.max((max - min) * 0.08, metric === 'weight' ? 0.2 : 2)
  return clampYDomain(
    { min: min - pad, max: max + pad },
    computeYBounds(data, metric),
    MIN_Y_SPAN[metric]
  )
}

function computeYBounds(data: ChartRow[], metric: GrowthMetric): YDomain {
  let refMin = Infinity
  let refMax = -Infinity

  for (const row of data) {
    refMin = Math.min(refMin, row.zoneBahayaLow[0])
    refMax = Math.max(refMax, row.zoneBahayaHigh[1])
    if (row.baby != null) {
      refMin = Math.min(refMin, row.baby)
      refMax = Math.max(refMax, row.baby)
    }
  }

  if (!Number.isFinite(refMin) || !Number.isFinite(refMax)) {
    return metric === 'weight'
      ? { min: 0, max: 20 }
      : { min: 35, max: 100 }
  }

  const pad = Math.max((refMax - refMin) * 0.2, metric === 'weight' ? 0.5 : 5)
  const absMin = metric === 'weight' ? 0 : 30
  const absMax = metric === 'weight' ? 25 : 110

  return {
    min: Math.max(absMin, refMin - pad),
    max: Math.min(absMax, refMax + pad * 1.5),
  }
}

function clampYDomain(
  domain: YDomain,
  bounds: YDomain,
  minSpan: number
): YDomain {
  let { min, max } = domain
  const span = Math.max(max - min, minSpan)

  if (min < bounds.min) {
    const shift = bounds.min - min
    min = bounds.min
    max += shift
  }
  if (max > bounds.max) {
    const shift = max - bounds.max
    max = bounds.max
    min -= shift
  }
  if (min < bounds.min) {
    min = bounds.min
    max = Math.min(bounds.max, min + span)
  }
  if (max - min < minSpan) {
    const center = (min + max) / 2
    min = Math.max(bounds.min, center - minSpan / 2)
    max = Math.min(bounds.max, min + minSpan)
    if (max - min < minSpan) {
      min = Math.max(bounds.min, max - minSpan)
    }
  }

  return { min, max }
}

function formatRangeLabel(range: MonthRange): string {
  const start = Math.round(range.start * 10) / 10
  const end = Math.round(range.end * 10) / 10
  return start === end ? `Bulan ${start}` : `${start}–${end}`
}

export function KmsGrowthChart({
  growthLogs,
  birthDate,
  gender = 'MALE',
  metric = 'weight',
}: KmsGrowthChartProps) {
  const chartRef = useRef<HTMLDivElement>(null)
  const pinchRef = useRef<PinchState | null>(null)
  const panRef = useRef<PanState | null>(null)
  const mousePanRef = useRef(false)

  const [viewRange, setViewRange] = useState<MonthRange>({ start: 0, end: MAX_MONTH })
  const [yDomain, setYDomain] = useState<YDomain | null>(null)

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
    () =>
      fullData.filter(
        (d) =>
          d.month >= Math.floor(viewRange.start) &&
          d.month <= Math.ceil(viewRange.end)
      ),
    [fullData, viewRange]
  )

  const yBounds = useMemo(
    () => computeYBounds(fullData, metric),
    [fullData, metric]
  )

  const resolvedYDomain = useMemo(() => {
    const domain = yDomain ?? computeAutoYDomain(visibleData, metric)
    return clampYDomain(domain, yBounds, MIN_Y_SPAN[metric])
  }, [yDomain, visibleData, metric, yBounds])

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
    setYDomain(null)
    setViewRange((current) => {
      const next = rangeFromZoom(current, scale, centerRatio)
      return hasVisibleMonths(next) ? next : current
    })
  }, [])

  const resetZoom = useCallback(() => {
    setViewRange({ start: 0, end: MAX_MONTH })
    setYDomain(null)
  }, [])

  const applyPan = useCallback(
    (dx: number, dy: number, rect: DOMRect, base: PanState) => {
      const span = base.xRange.end - base.xRange.start
      const monthShift = -(dx / rect.width) * Math.max(span, 1)
      const nextX = shiftXRange(base.xRange, monthShift)

      const ySpan = base.yDomain.max - base.yDomain.min
      const valueShift = -(dy / rect.height) * ySpan
      const nextY = clampYDomain(
        { min: base.yDomain.min + valueShift, max: base.yDomain.max + valueShift },
        yBounds,
        MIN_Y_SPAN[metric]
      )

      if (hasVisibleMonths(nextX)) {
        setViewRange(nextX)
        setYDomain(nextY)
      }
    },
    [yBounds, metric]
  )

  const startPan = useCallback(
    (clientX: number, clientY: number) => {
      if (!chartRef.current) return
      panRef.current = {
        startX: clientX,
        startY: clientY,
        xRange: viewRange,
        yDomain: resolvedYDomain,
      }
    },
    [viewRange, resolvedYDomain]
  )

  const endPan = useCallback(() => {
    panRef.current = null
    mousePanRef.current = false
  }, [])

  useEffect(() => {
    setViewRange({ start: 0, end: MAX_MONTH })
    setYDomain(null)
  }, [metric, gender, birthDate])

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (!chartRef.current) return

      if (e.touches.length === 2) {
        panRef.current = null
        const rect = chartRef.current.getBoundingClientRect()
        pinchRef.current = {
          distance: touchDistance(e.touches),
          centerRatio: touchCenterRatio(e.touches, rect),
          range: viewRange,
        }
        return
      }

      if (e.touches.length === 1) {
        pinchRef.current = null
        startPan(e.touches[0].clientX, e.touches[0].clientY)
      }
    },
    [viewRange, startPan]
  )

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!chartRef.current) return

      if (e.touches.length === 2 && pinchRef.current) {
        e.preventDefault()
        const dist = touchDistance(e.touches)
        const scale = dist / pinchRef.current.distance
        const next = rangeFromZoom(
          pinchRef.current.range,
          scale,
          pinchRef.current.centerRatio
        )
        if (hasVisibleMonths(next)) {
          setYDomain(null)
          setViewRange(next)
        }
        return
      }

      if (e.touches.length === 1 && panRef.current) {
        e.preventDefault()
        const touch = e.touches[0]
        applyPan(
          touch.clientX - panRef.current.startX,
          touch.clientY - panRef.current.startY,
          chartRef.current.getBoundingClientRect(),
          panRef.current
        )
      }
    },
    [applyPan]
  )

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 0) {
        pinchRef.current = null
        endPan()
        return
      }

      if (e.touches.length === 1 && pinchRef.current) {
        pinchRef.current = null
        startPan(e.touches[0].clientX, e.touches[0].clientY)
      }
    },
    [endPan, startPan]
  )

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return
      mousePanRef.current = true
      startPan(e.clientX, e.clientY)
    },
    [startPan]
  )

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!mousePanRef.current || !panRef.current || !chartRef.current) return
      applyPan(
        e.clientX - panRef.current.startX,
        e.clientY - panRef.current.startY,
        chartRef.current.getBoundingClientRect(),
        panRef.current
      )
    }

    const onMouseUp = () => endPan()

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [applyPan, endPan])

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
    span <= 0
      ? `bln ${viewRange.start}`
      : tickInterval(span) === 1
        ? 'per 1 bln'
        : tickInterval(span) === 2
          ? 'per 2 bln'
          : 'per 5 bln'
  const atMaxZoom = span <= MIN_MONTH_SPAN

  const renderTooltip = (props: {
    active?: boolean
    payload?: {
      dataKey?: string
      value?: number
      payload?: {
        month?: number
        baby?: number | null
        median?: number
        minus2?: number
        plus2?: number
      }
    }[]
    label?: string | number
  }) => {
    const { active, payload, label: month } = props
    if (!active || !payload?.length || month == null) return null

    const monthNum = Number(month)
    const row = payload[0]?.payload
    const baby = payload.find((p) => p.dataKey === 'baby')
    const median = payload.find((p) => p.dataKey === 'median')
    const medianValue = median?.value ?? row?.median

    const hasBaby = baby?.value != null
    const hasMedian = medianValue != null

    if (!hasBaby && !hasMedian) return null

    const log = logByMonth.get(monthNum)
    const zone =
      hasBaby && baby?.value != null
        ? zoneForMonth(monthNum, baby.value)
        : null
    const hint = zone ? KMS_ZONE_HINT[zone] : null

    return (
      <div className="max-w-[200px] rounded-xl border border-border bg-card px-3 py-2 text-xs shadow-md">
        <p className="font-semibold text-foreground">Bulan {month}</p>
        {hasMedian && (
          <p className="mt-1 text-muted-foreground">
            Median WHO:{' '}
            <span className="font-medium text-foreground">
              {formatDecimal(medianValue)} {unit}
            </span>
          </p>
        )}
        {hasBaby && log && (
          <p className="mt-0.5 text-[10px] text-muted-foreground">
            {new Date(log.date).toLocaleDateString('id-ID', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </p>
        )}
        {hasBaby && (
          <p className="mt-1 text-muted-foreground">
            Data bayi:{' '}
            <span className="font-medium text-foreground">
              {formatDecimal(baby!.value!)} {unit}
            </span>
          </p>
        )}
        {zone && (
          <p className="mt-1.5">
            <span
              className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${KMS_ZONE_STYLE[zone]}`}
            >
              KMS: {KMS_ZONE_LABEL[zone]}
            </span>
          </p>
        )}
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
        className="relative h-[240px] w-full cursor-grab touch-none select-none active:cursor-grabbing"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onDoubleClick={resetZoom}
      >
        <span className="absolute bottom-0 right-0 z-10 text-[10px] text-muted-foreground">
          Bulan
        </span>
        <span className="absolute right-0 top-0 z-10 rounded-full bg-secondary/80 px-2 py-0.5 text-[9px] text-muted-foreground">
          {formatRangeLabel(viewRange)} · {zoomLabel}
          {atMaxZoom ? ' · maks' : ''}
        </span>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={visibleData}
            margin={{ top: 16, right: 8, left: 4, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.4} />
            <XAxis
              dataKey="month"
              type="number"
              domain={[viewRange.start, viewRange.end]}
              ticks={xTicks}
              allowDecimals={false}
              tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
              tickFormatter={(month) => String(Math.round(month))}
              tickMargin={6}
              axisLine={{ stroke: 'var(--border)' }}
              tickLine={false}
              minTickGap={8}
            />
            <YAxis
              width={48}
              tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
              tickFormatter={(value) => formatDecimal(Number(value))}
              tickMargin={2}
              label={{
                value: unit,
                angle: -90,
                position: 'insideLeft',
                offset: 14,
                style: {
                  fontSize: 10,
                  fill: 'var(--muted-foreground)',
                  fontWeight: 500,
                },
              }}
              axisLine={false}
              tickLine={false}
              domain={[resolvedYDomain.min, resolvedYDomain.max]}
              allowDataOverflow
            />
            <Tooltip content={renderTooltip} />

            <Area
              type="monotone"
              dataKey="zoneBahayaLow"
              stroke="none"
              fill="#fca5a5"
              fillOpacity={0.35}
              dot={false}
              activeDot={false}
              legendType="none"
              tooltipType="none"
            />
            <Area
              type="monotone"
              dataKey="zoneWaspadaLow"
              stroke="none"
              fill="#fef08a"
              fillOpacity={0.45}
              dot={false}
              activeDot={false}
              legendType="none"
              tooltipType="none"
            />
            <Area
              type="monotone"
              dataKey="zoneNormal"
              stroke="none"
              fill="#86efac"
              fillOpacity={0.4}
              dot={false}
              activeDot={false}
              legendType="none"
              tooltipType="none"
            />
            <Area
              type="monotone"
              dataKey="zoneWaspadaHigh"
              stroke="none"
              fill="#fef08a"
              fillOpacity={0.45}
              dot={false}
              activeDot={false}
              legendType="none"
              tooltipType="none"
            />
            <Area
              type="monotone"
              dataKey="zoneBahayaHigh"
              stroke="none"
              fill="#fca5a5"
              fillOpacity={0.35}
              dot={false}
              activeDot={false}
              legendType="none"
              tooltipType="none"
            />
            <Line
              type="monotone"
              dataKey="median"
              stroke="#22c55e"
              strokeWidth={2}
              dot={false}
              activeDot={{
                r: 5,
                fill: '#22c55e',
                stroke: '#fff',
                strokeWidth: 2,
              }}
              name="Median WHO"
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

      <div className="mt-3 rounded-xl bg-secondary/40 px-3 py-2.5">
        <div className="flex flex-wrap justify-center gap-x-5 gap-y-1.5 text-[10px] text-muted-foreground">
          <ChartLegendItem label="Data bayi">
            <span className="inline-block h-2 w-2 rounded-full bg-blue-500" />
          </ChartLegendItem>
          <ChartLegendItem label="Median WHO">
            <span className="inline-block h-0.5 w-4 rounded bg-green-500" />
          </ChartLegendItem>
          <ChartLegendItem label="Normal">
            <span className="inline-block h-2.5 w-2.5 bg-green-300/70" />
          </ChartLegendItem>
          <ChartLegendItem label="Waspada">
            <span className="inline-block h-2.5 w-2.5 bg-yellow-300/70" />
          </ChartLegendItem>
          <ChartLegendItem label="Bahaya">
            <span className="inline-block h-2.5 w-2.5 bg-red-300/70" />
          </ChartLegendItem>
        </div>
      </div>
    </div>
  )
}
