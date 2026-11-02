'use client'

import { useState } from 'react'
import { getWhoReference, type Gender } from '@/lib/who-growth'
import {
  KMS_CHART_MAX_MONTH,
  formatCm,
  formatKg,
  whoSampleAtMonth,
  type WhoSample,
} from '@/lib/kms-baby'

type Point = { month: number; weight: number; height?: number | null; head?: number | null }

type GrowthCurveProps = {
  month: number
  weight: number
  height?: number | null
  head?: number | null
  gender: Gender
  history: Point[]
}

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
const PAD = { l: 28, r: 8, t: 16, b: 22 }
const MAX_MONTH = KMS_CHART_MAX_MONTH

function xOf(month: number) {
  const clamped = Math.min(MAX_MONTH, Math.max(0, month))
  return PAD.l + (clamped / MAX_MONTH) * (W - PAD.l - PAD.r)
}

function yOf(kg: number, maxKg: number) {
  return PAD.t + (1 - Math.min(maxKg, Math.max(0, kg)) / maxKg) * (H - PAD.t - PAD.b)
}

function pathFor(rows: WhoSample[], key: 'minus2' | 'median' | 'plus1', maxKg: number) {
  return rows
    .map((row, i) => `${i === 0 ? 'M' : 'L'} ${xOf(row.month).toFixed(1)} ${yOf(row[key], maxKg).toFixed(1)}`)
    .join(' ')
}

function measureLine(label: string, value: number | null | undefined, unit: 'kg' | 'cm') {
  const text = value != null && value > 0 ? (unit === 'kg' ? `${formatKg(value)} kg` : `${formatCm(value)} cm`) : '—'
  return `${label} ${text}`
}

export function GrowthCurve({ month, weight, height, head, gender, history }: GrowthCurveProps) {
  const [tipKey, setTipKey] = useState<string | null>('current')
  const ref = getWhoReference('weight', gender)
  const rows = Array.from({ length: MAX_MONTH + 1 }, (_, m) => whoSampleAtMonth(ref, m))
  const maxKg = Math.max(
    18,
    weight + 1,
    ...history.map((point) => point.weight + 1),
    ...rows.map((row) => row.plus2 + 0.4)
  )
  const band = `${pathFor(rows, 'plus1', maxKg)} ${[...rows]
    .reverse()
    .map((row) => `L ${xOf(row.month).toFixed(1)} ${yOf(row.minus2, maxKg).toFixed(1)}`)
    .join(' ')} Z`
  const dotX = xOf(month)
  const dotY = yOf(weight, maxKg)
  const median = whoSampleAtMonth(ref, Math.min(month, MAX_MONTH)).median
  const past = history.filter(
    (point) => Math.abs(point.month - month) > 0.05 || Math.abs(point.weight - weight) > 0.05
  )
  const tips: Tip[] = [
    ...past.map((point, index) => ({
      key: `past-${index}`,
      weight: point.weight,
      height: point.height,
      head: point.head,
      x: xOf(point.month),
      y: yOf(point.weight, maxKg),
    })),
    { key: 'current', weight, height, head, x: dotX, y: dotY },
  ]
  const tip = tips.find((item) => item.key === tipKey) ?? null
  const tipAbove = tip != null && tip.y > 48

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full font-sans" role="img" aria-label="Kurva berat badan menurut umur">
        <path d={band} className="kms-chart-band" />
        <path d={pathFor(rows, 'median', maxKg)} className="kms-chart-median" />
        <path d={pathFor(rows, 'minus2', maxKg)} className="kms-chart-edge" />
        <path d={pathFor(rows, 'plus1', maxKg)} className="kms-chart-edge-high" />
        <line x1={dotX} y1={PAD.t} x2={dotX} y2={H - PAD.b} className="kms-chart-guide" />
        {past.map((point, index) => (
          <circle
            key={`past-${index}`}
            cx={xOf(point.month)}
            cy={yOf(point.weight, maxKg)}
            r="3.5"
            className="kms-chart-dot-past"
          />
        ))}
        <circle cx={dotX} cy={dotY} r="6" className="kms-chart-dot" />
        {tips.map((item) => (
          <circle
            key={item.key}
            cx={item.x}
            cy={item.y}
            r="12"
            fill="transparent"
            className="cursor-pointer"
            onPointerEnter={() => setTipKey(item.key)}
            onPointerLeave={() => setTipKey('current')}
            onClick={(event) => {
              event.stopPropagation()
              setTipKey((current) => (current === item.key ? 'current' : item.key))
            }}
          >
            <title>
              {`${measureLine('Berat', item.weight, 'kg')}, ${measureLine('Panjang', item.height, 'cm')}, ${measureLine('Lingkar kepala', item.head, 'cm')}`}
            </title>
          </circle>
        ))}
        <text x={PAD.l} y={H - 6} className="kms-chart-label">
          0
        </text>
        <text x={W - PAD.r} y={H - 6} textAnchor="end" className="kms-chart-label">
          24 bln
        </text>
        <text x={PAD.l} y={12} className="kms-chart-label">
          Median {median.toFixed(1)} kg
        </text>
      </svg>
      {tip ? (
        <div
          className={`pointer-events-none absolute z-10 w-max -translate-x-1/2 rounded-lg border border-border bg-popover px-2.5 py-1.5 text-popover-foreground shadow-md ${
            tipAbove ? '-translate-y-[calc(100%+10px)]' : 'translate-y-2'
          }`}
          style={{ left: `${(tip.x / W) * 100}%`, top: `${(tip.y / H) * 100}%` }}
          role="tooltip"
        >
          <p className="text-[11px] leading-tight">{measureLine('Berat', tip.weight, 'kg')}</p>
          <p className="text-[11px] leading-tight">{measureLine('Panjang', tip.height, 'cm')}</p>
          <p className="text-[11px] leading-tight">{measureLine('Lingkar kepala', tip.head, 'cm')}</p>
        </div>
      ) : null}
    </div>
  )
}
