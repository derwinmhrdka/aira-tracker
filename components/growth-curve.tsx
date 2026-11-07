'use client'

import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { getWhoReference, type Gender, type GrowthMetric } from '@/lib/who-growth'
import {
  KMS_CHART_MAX_MONTH,
  formatCm,
  formatKg,
  whoSampleAtMonth,
  zFromSample,
  type WhoSample,
} from '@/lib/kms-baby'

type Point = { month: number; weight: number; height?: number | null; head?: number | null }

export type GrowthCurveMode = GrowthMetric | 'all'

type GrowthCurveProps = {
  mode: GrowthCurveMode
  month: number
  weight: number
  height?: number | null
  head?: number | null
  gender: Gender
  history: Point[]
}

type Visit = Point & { key: string }

type Tip = {
  key: string
  weight: number
  height?: number | null
  head?: number | null
  x: number
  y: number
}

const W = 320
const H = 168
const PAD = { l: 32, r: 10, t: 12, b: 22 }
const MAX_MONTH = KMS_CHART_MAX_MONTH

const SERIES: GrowthMetric[] = ['weight', 'height', 'head']

const SERIES_LABEL: Record<GrowthMetric, string> = {
  weight: 'Berat',
  height: 'Panjang',
  head: 'Lingkar kepala',
}

const SERIES_STROKE: Record<GrowthMetric, string> = {
  weight: 'var(--primary)',
  height: '#0f766e',
  head: '#c2410c',
}

function xOf(month: number) {
  const clamped = Math.min(MAX_MONTH, Math.max(0, month))
  return PAD.l + (clamped / MAX_MONTH) * (W - PAD.l - PAD.r)
}

function yOf(value: number, min: number, max: number) {
  const span = max - min || 1
  const clamped = Math.min(max, Math.max(min, value))
  return PAD.t + (1 - (clamped - min) / span) * (H - PAD.t - PAD.b)
}

type CurveKey = 'minus3' | 'minus2' | 'median' | 'plus1' | 'plus2' | 'plus3'

function pathFor(rows: WhoSample[], key: CurveKey, min: number, max: number) {
  return rows
    .map((row, i) => `${i === 0 ? 'M' : 'L'} ${xOf(row.month).toFixed(1)} ${yOf(row[key], min, max).toFixed(1)}`)
    .join(' ')
}

function ribbon(rows: WhoSample[], upper: CurveKey, lower: CurveKey, min: number, max: number) {
  const over = pathFor(rows, upper, min, max)
  const under = [...rows]
    .reverse()
    .map((row) => `L ${xOf(row.month).toFixed(1)} ${yOf(row[lower], min, max).toFixed(1)}`)
    .join(' ')
  return `${over} ${under} Z`
}

function belowCurve(rows: WhoSample[], key: CurveKey, min: number, max: number) {
  const bottom = (H - PAD.b).toFixed(1)
  const back = [...rows]
    .reverse()
    .map((row) => `L ${xOf(row.month).toFixed(1)} ${yOf(row[key], min, max).toFixed(1)}`)
    .join(' ')
  return `M ${PAD.l} ${bottom} L ${W - PAD.r} ${bottom} ${back} Z`
}

function aboveCurve(rows: WhoSample[], key: CurveKey, min: number, max: number) {
  const top = PAD.t.toFixed(1)
  return `${pathFor(rows, key, min, max)} L ${(W - PAD.r).toFixed(1)} ${top} L ${PAD.l} ${top} Z`
}

function lineFor(points: Array<{ month: number; y: number }>) {
  return points
    .map((point, i) => `${i === 0 ? 'M' : 'L'} ${xOf(point.month).toFixed(1)} ${point.y.toFixed(1)}`)
    .join(' ')
}

function niceStep(rough: number) {
  if (rough <= 0) return 1
  const pow = 10 ** Math.floor(Math.log10(rough))
  const n = rough / pow
  const nice = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10
  return nice * pow
}

function axisTicks(min: number, max: number, unit: 'kg' | 'cm' | 'z') {
  if (unit === 'z') {
    const ticks: number[] = []
    for (let value = Math.ceil(min); value <= Math.floor(max); value += 1) ticks.push(value)
    return ticks
  }
  const step = niceStep((max - min) / 4)
  const start = Math.ceil(min / step) * step
  const ticks: number[] = []
  for (let value = start; value <= max + step * 0.01; value += step) {
    ticks.push(Math.round(value * 10) / 10)
  }
  return ticks
}

function formatTick(value: number) {
  const rounded = Math.round(value * 10) / 10
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1).replace('.', ',')
}

function ChartGrid({ min, max, unit }: { min: number; max: number; unit: 'kg' | 'cm' | 'z' }) {
  const yTicks = axisTicks(min, max, unit).filter((tick) => {
    const y = yOf(tick, min, max)
    return y > PAD.t + 6 && y < H - PAD.b - 4
  })
  const xTicks = [0, 6, 12, 18, 24]
  return (
    <g>
      {yTicks.map((tick) => (
        <g key={`y-${tick}`}>
          <line
            x1={PAD.l}
            x2={W - PAD.r}
            y1={yOf(tick, min, max)}
            y2={yOf(tick, min, max)}
            className="kms-chart-grid"
          />
          <text x={PAD.l - 4} y={yOf(tick, min, max) + 3} textAnchor="end" className="kms-chart-label">
            {formatTick(tick)}
          </text>
        </g>
      ))}
      {xTicks.map((month) => (
        <g key={`x-${month}`}>
          <line x1={xOf(month)} x2={xOf(month)} y1={PAD.t} y2={H - PAD.b} className="kms-chart-grid" />
          <text
            x={xOf(month)}
            y={H - 6}
            textAnchor={month === 0 ? 'start' : month === 24 ? 'end' : 'middle'}
            className="kms-chart-label"
          >
            {month === 24 ? '24 bln' : String(month)}
          </text>
        </g>
      ))}
    </g>
  )
}

function measureLine(label: string, value: number | null | undefined, unit: 'kg' | 'cm') {
  const text = value != null && value > 0 ? (unit === 'kg' ? `${formatKg(value)} kg` : `${formatCm(value)} cm`) : '—'
  return `${label} ${text}`
}

function metricValue(point: Point, metric: GrowthMetric): number | null {
  const value = metric === 'weight' ? point.weight : metric === 'height' ? point.height : point.head
  return value != null && value > 0 ? value : null
}

export function GrowthCurve({ mode, month, weight, height, head, gender, history }: GrowthCurveProps) {
  const [tipKey, setTipKey] = useState<string | null>(null)
  const selectTip = (key: string) => setTipKey((current) => (current === key ? null : key))
  const current: Point = { month, weight, height, head }
  const visits: Visit[] = (() => {
    const map = new Map<string, Visit>()
    history.forEach((point, index) => {
      map.set(point.month.toFixed(2), { ...point, key: `past-${index}` })
    })
    map.set(month.toFixed(2), { ...current, key: 'current' })
    return [...map.values()].sort((a, b) => a.month - b.month)
  })()

  if (mode === 'all') {
    return (
      <AllCurve
        visits={visits}
        gender={gender}
        tipKey={tipKey}
        onTip={selectTip}
      />
    )
  }

  return (
    <MetricCurve
      metric={mode}
      visits={visits}
      gender={gender}
      tipKey={tipKey}
      onTip={selectTip}
    />
  )
}

function MetricCurve({
  metric,
  visits,
  gender,
  tipKey,
  onTip,
}: {
  metric: GrowthMetric
  visits: Visit[]
  gender: Gender
  tipKey: string | null
  onTip: (key: string) => void
}) {
  const ref = getWhoReference(metric, gender)
  const rows = Array.from({ length: MAX_MONTH + 1 }, (_, m) => whoSampleAtMonth(ref, m))
  const plotted = visits
    .map((visit) => ({ visit, value: metricValue(visit, metric) }))
    .filter((item): item is { visit: Visit; value: number } => item.value != null)
  const values = plotted.map((item) => item.value)
  const curveLow = Math.min(...rows.map((row) => row.minus3))
  const curveHigh = Math.max(...rows.map((row) => row.plus3))
  const dataLow = Math.min(curveLow, ...values)
  const dataHigh = Math.max(curveHigh, ...values)
  const pad = Math.max(metric === 'weight' ? 0.35 : 1.2, (dataHigh - dataLow) * 0.05)
  const min = Math.max(0, dataLow - pad)
  const max = dataHigh + pad
  const currentVisit = visits.find((visit) => visit.key === 'current') ?? visits[visits.length - 1]
  const currentValue = metricValue(currentVisit, metric)
  const dotX = xOf(currentVisit.month)
  const dotY = currentValue == null ? null : yOf(currentValue, min, max)
  const tips: Tip[] = plotted.map((item) => ({
    key: item.visit.key,
    weight: item.visit.weight,
    height: item.visit.height,
    head: item.visit.head,
    x: xOf(item.visit.month),
    y: yOf(item.value, min, max),
  }))
  const tip = tips.find((item) => item.key === tipKey) ?? null
  const tipAbove = tip != null && tip.y > 48

  return (
    <ChartFrame
      ariaLabel={`Kurva ${SERIES_LABEL[metric].toLowerCase()} menurut umur`}
      tip={tip}
      tipAbove={tipAbove}
      activeMetric={metric}
    >
      <KmsRibbons rows={rows} min={min} max={max} />
      <ChartGrid min={min} max={max} unit={metric === 'weight' ? 'kg' : 'cm'} />
      <path d={pathFor(rows, 'median', min, max)} className="kms-zone-median" />
      {dotY != null ? <line x1={dotX} y1={PAD.t} x2={dotX} y2={H - PAD.b} className="kms-chart-guide" /> : null}
      {plotted.length > 1 ? (
        <path
          d={lineFor(plotted.map((item) => ({ month: item.visit.month, y: yOf(item.value, min, max) })))}
          className="kms-chart-track"
        />
      ) : null}
      {plotted
        .filter((item) => item.visit.key !== 'current')
        .map((item) => (
          <circle
            key={item.visit.key}
            cx={xOf(item.visit.month)}
            cy={yOf(item.value, min, max)}
            r="2"
            className="kms-chart-dot-past"
          />
        ))}
      {dotY != null ? <circle cx={dotX} cy={dotY} r="3.5" className="kms-chart-dot" /> : null}
      {currentValue != null && dotY != null ? (
        <text
          x={dotX > W - 54 ? dotX - 8 : dotX + 8}
          y={Math.max(PAD.t + 10, dotY - 6)}
          textAnchor={dotX > W - 54 ? 'end' : 'start'}
          className="kms-chart-value"
        >
          {`${formatTick(currentValue)} ${metric === 'weight' ? 'kg' : 'cm'}`}
        </text>
      ) : null}
      {tips.map((item) => (
        <Hit key={item.key} item={item} onTip={onTip} />
      ))}
    </ChartFrame>
  )
}

function AllCurve({
  visits,
  gender,
  tipKey,
  onTip,
}: {
  visits: Visit[]
  gender: Gender
  tipKey: string | null
  onTip: (key: string) => void
}) {
  const zOf = (metric: GrowthMetric, visit: Visit) => {
    const value = metricValue(visit, metric)
    if (value == null) return null
    const row = whoSampleAtMonth(getWhoReference(metric, gender), visit.month)
    return zFromSample(value, row)
  }
  const scores = SERIES.flatMap((metric) =>
    visits.map((visit) => zOf(metric, visit)).filter((score): score is number => score != null)
  )
  const zMin = Math.min(-4, ...scores) - 0.15
  const zMax = Math.max(3.4, ...scores) + 0.15
  const currentVisit = visits.find((visit) => visit.key === 'current') ?? visits[visits.length - 1]
  const guideX = xOf(currentVisit.month)
  const tips: Tip[] = SERIES.flatMap((metric) =>
    visits.flatMap((visit) => {
      const score = zOf(metric, visit)
      if (score == null) return []
      return [
        {
          key: `${visit.key}-${metric}`,
          weight: visit.weight,
          height: visit.height,
          head: visit.head,
          x: xOf(visit.month),
          y: yOf(score, zMin, zMax),
        },
      ]
    })
  )
  const tip = tips.find((item) => item.key === tipKey) ?? null
  const tipAbove = tip != null && tip.y > 48

  return (
    <div>
      <ChartFrame ariaLabel="Kurva berat, panjang, dan lingkar kepala" tip={tip} tipAbove={tipAbove}>
        <KmsZZones zMin={zMin} zMax={zMax} />
        <ChartGrid min={zMin} max={zMax} unit="z" />
        <line x1={PAD.l} x2={W - PAD.r} y1={yOf(0, zMin, zMax)} y2={yOf(0, zMin, zMax)} className="kms-zone-median" />
        <line x1={guideX} y1={PAD.t} x2={guideX} y2={H - PAD.b} className="kms-chart-guide" />
        {SERIES.map((metric) => {
          const points = visits
            .map((visit) => {
              const score = zOf(metric, visit)
              return score == null ? null : { month: visit.month, y: yOf(score, zMin, zMax), visit }
            })
            .filter((point): point is { month: number; y: number; visit: Visit } => point != null)
          if (points.length === 0) return null
          return (
            <g key={metric}>
              {points.length > 1 ? (
                <path
                  d={lineFor(points)}
                  fill="none"
                  stroke={SERIES_STROKE[metric]}
                  strokeOpacity="0.85"
                  strokeWidth="1.25"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              ) : null}
              {points.map((point) => (
                <circle
                  key={point.visit.key}
                  cx={xOf(point.month)}
                  cy={point.y}
                  r={point.visit.key === 'current' ? 3 : 2}
                  fill={SERIES_STROKE[metric]}
                  stroke="var(--card)"
                  strokeWidth="1"
                />
              ))}
            </g>
          )
        })}
        {tips.map((item) => (
          <Hit key={item.key} item={item} onTip={onTip} />
        ))}
      </ChartFrame>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
        {SERIES.map((metric) => (
          <span key={metric} className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
            <span className="size-2 rounded-full" style={{ background: SERIES_STROKE[metric] }} />
            {SERIES_LABEL[metric]}
          </span>
        ))}
      </div>
    </div>
  )
}

function KmsRibbons({ rows, min, max }: { rows: WhoSample[]; min: number; max: number }) {
  const clipId = useId().replace(/:/g, '')
  return (
    <>
      <defs>
        <clipPath id={clipId}>
          <rect x={PAD.l} y={PAD.t} width={W - PAD.l - PAD.r} height={H - PAD.t - PAD.b} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`}>
        <path d={belowCurve(rows, 'minus3', min, max)} className="kms-zone-red" />
        <path d={ribbon(rows, 'minus2', 'minus3', min, max)} className="kms-zone-yellow" />
        <path d={ribbon(rows, 'plus1', 'minus2', min, max)} className="kms-zone-green" />
        <path d={ribbon(rows, 'plus2', 'plus1', min, max)} className="kms-zone-yellow" />
        <path d={aboveCurve(rows, 'plus2', min, max)} className="kms-zone-red" />
      </g>
    </>
  )
}

function KmsZZones({ zMin, zMax }: { zMin: number; zMax: number }) {
  const bands = [
    { from: zMin, to: -3, className: 'kms-zone-red' },
    { from: -3, to: -2, className: 'kms-zone-yellow' },
    { from: -2, to: 1, className: 'kms-zone-green' },
    { from: 1, to: 2, className: 'kms-zone-yellow' },
    { from: 2, to: zMax, className: 'kms-zone-red' },
  ]
  return (
    <>
      {bands.map((band) => {
        const y1 = yOf(band.from, zMin, zMax)
        const y2 = yOf(band.to, zMin, zMax)
        const y = Math.max(PAD.t, Math.min(y1, y2))
        const bottom = Math.min(H - PAD.b, Math.max(y1, y2))
        return (
          <rect
            key={`${band.className}-${band.from}`}
            x={PAD.l}
            y={y}
            width={W - PAD.l - PAD.r}
            height={Math.max(0, bottom - y)}
            className={band.className}
          />
        )
      })}
    </>
  )
}

function Hit({ item, onTip }: { item: Tip; onTip: (key: string) => void }) {
  return (
    <circle
      cx={item.x}
      cy={item.y}
      r="12"
      fill="transparent"
      className="cursor-pointer"
      onClick={(event) => {
        event.stopPropagation()
        onTip(item.key)
      }}
    >
      <title>
        {`${measureLine('Berat', item.weight, 'kg')}, ${measureLine('Panjang', item.height, 'cm')}, ${measureLine('Lingkar kepala', item.head, 'cm')}`}
      </title>
    </circle>
  )
}

const MIN_ZOOM = 1
const MAX_ZOOM = 4

type Zoom = { scale: number; tx: number; ty: number }

function clampZoom(tx: number, ty: number, scale: number, width: number, height: number): Zoom {
  const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, scale))
  if (next <= 1.001 || width <= 0 || height <= 0) return { scale: 1, tx: 0, ty: 0 }
  return {
    scale: next,
    tx: Math.min(0, Math.max(width * (1 - next), tx)),
    ty: Math.min(0, Math.max(height * (1 - next), ty)),
  }
}

function ChartFrame({
  ariaLabel,
  tip,
  tipAbove,
  activeMetric,
  children,
}: {
  ariaLabel: string
  tip: Tip | null
  tipAbove: boolean
  activeMetric?: GrowthMetric
  children: ReactNode
}) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const viewport = viewportRef.current
    const content = contentRef.current
    if (!viewport || !content) return

    const view: Zoom = { scale: 1, tx: 0, ty: 0 }
    let pinch: { dist: number; scale: number; tx: number; ty: number; fx: number; fy: number } | null = null
    let pan: { x: number; y: number; tx: number; ty: number } | null = null
    let lastTap = 0
    let suppressClick = false

    const box = () => viewport.getBoundingClientRect()
    const paint = (next: Zoom) => {
      view.scale = next.scale
      view.tx = next.tx
      view.ty = next.ty
      content.style.transform = `translate(${next.tx}px, ${next.ty}px) scale(${next.scale})`
    }
    const apply = (tx: number, ty: number, scale: number) => {
      const rect = box()
      paint(clampZoom(tx, ty, scale, rect.width, rect.height))
    }

    const onTouchStart = (event: TouchEvent) => {
      if (event.touches.length === 2) {
        event.preventDefault()
        const rect = box()
        const [a, b] = [event.touches[0], event.touches[1]]
        pinch = {
          dist: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY) || 1,
          scale: view.scale,
          tx: view.tx,
          ty: view.ty,
          fx: (a.clientX + b.clientX) / 2 - rect.left,
          fy: (a.clientY + b.clientY) / 2 - rect.top,
        }
        pan = null
      } else if (event.touches.length === 1 && view.scale > 1) {
        pan = {
          x: event.touches[0].clientX,
          y: event.touches[0].clientY,
          tx: view.tx,
          ty: view.ty,
        }
      }
    }

    const onTouchMove = (event: TouchEvent) => {
      if (pinch && event.touches.length >= 2) {
        event.preventDefault()
        const rect = box()
        const [a, b] = [event.touches[0], event.touches[1]]
        const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY) || 1
        const fx = (a.clientX + b.clientX) / 2 - rect.left
        const fy = (a.clientY + b.clientY) / 2 - rect.top
        const nextScale = pinch.scale * (dist / pinch.dist)
        const contentX = (pinch.fx - pinch.tx) / pinch.scale
        const contentY = (pinch.fy - pinch.ty) / pinch.scale
        apply(fx - contentX * nextScale, fy - contentY * nextScale, nextScale)
        suppressClick = true
        return
      }
      if (pan && event.touches.length === 1) {
        const dx = event.touches[0].clientX - pan.x
        const dy = event.touches[0].clientY - pan.y
        if (Math.hypot(dx, dy) > 4) {
          event.preventDefault()
          apply(pan.tx + dx, pan.ty + dy, view.scale)
          suppressClick = true
        }
      }
    }

    const zoomAt = (fx: number, fy: number, nextScale: number) => {
      const contentX = (fx - view.tx) / view.scale
      const contentY = (fy - view.ty) / view.scale
      apply(fx - contentX * nextScale, fy - contentY * nextScale, nextScale)
    }

    const onTouchEnd = (event: TouchEvent) => {
      if (event.touches.length < 2) pinch = null
      if (event.touches.length === 0) {
        pan = null
        if (view.scale < 1.06) apply(0, 0, 1)
        const blocked = suppressClick
        const now = Date.now()
        if (!blocked && event.changedTouches.length === 1 && now - lastTap < 280) {
          const rect = box()
          const touch = event.changedTouches[0]
          const fx = touch.clientX - rect.left
          const fy = touch.clientY - rect.top
          if (view.scale > 1) apply(0, 0, 1)
          else zoomAt(fx, fy, 2)
          suppressClick = true
          lastTap = 0
        } else {
          lastTap = now
        }
        if (suppressClick) {
          window.setTimeout(() => {
            suppressClick = false
          }, 400)
        }
      }
    }

    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey) return
      event.preventDefault()
      const rect = box()
      const fx = event.clientX - rect.left
      const fy = event.clientY - rect.top
      zoomAt(fx, fy, view.scale * Math.exp(-event.deltaY * 0.0025))
    }

    const onClick = (event: MouseEvent) => {
      if (!suppressClick) return
      event.preventDefault()
      event.stopPropagation()
      suppressClick = false
    }

    viewport.addEventListener('touchstart', onTouchStart, { passive: false })
    viewport.addEventListener('touchmove', onTouchMove, { passive: false })
    viewport.addEventListener('touchend', onTouchEnd)
    viewport.addEventListener('touchcancel', onTouchEnd)
    viewport.addEventListener('wheel', onWheel, { passive: false })
    viewport.addEventListener('click', onClick, true)
    return () => {
      viewport.removeEventListener('touchstart', onTouchStart)
      viewport.removeEventListener('touchmove', onTouchMove)
      viewport.removeEventListener('touchend', onTouchEnd)
      viewport.removeEventListener('touchcancel', onTouchEnd)
      viewport.removeEventListener('wheel', onWheel)
      viewport.removeEventListener('click', onClick, true)
    }
  }, [])

  return (
    <div ref={viewportRef} className="relative touch-none overflow-hidden">
      <div ref={contentRef} className="relative origin-top-left">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full font-sans" role="img" aria-label={ariaLabel}>
          {children}
        </svg>
        {tip ? (
          <div
            className={`pointer-events-none absolute z-10 w-max -translate-x-1/2 rounded-lg border border-border bg-popover px-2.5 py-1.5 text-popover-foreground shadow-md ${
              tipAbove ? '-translate-y-[calc(100%+10px)]' : 'translate-y-2'
            }`}
            style={{ left: `${(tip.x / W) * 100}%`, top: `${(tip.y / H) * 100}%` }}
            role="tooltip"
          >
            <TipLine text={measureLine('Berat', tip.weight, 'kg')} active={activeMetric == null || activeMetric === 'weight'} />
            <TipLine text={measureLine('Panjang', tip.height, 'cm')} active={activeMetric == null || activeMetric === 'height'} />
            <TipLine text={measureLine('Lingkar kepala', tip.head, 'cm')} active={activeMetric == null || activeMetric === 'head'} />
          </div>
        ) : null}
      </div>
    </div>
  )
}

function TipLine({ text, active }: { text: string; active: boolean }) {
  return <p className={`text-[11px] leading-tight ${active ? 'font-semibold' : 'text-muted-foreground'}`}>{text}</p>
}
