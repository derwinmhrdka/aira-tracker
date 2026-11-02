import {
  ageInMonths,
  getWhoReference,
  type Gender,
  type GrowthMetric,
  type WhoPoint,
} from '@/lib/who-growth'

/** KMS berat/umur bands used by the reference baby animation. */
export type KmsBabyStatus = 'sangat-kurang' | 'kurang' | 'normal' | 'lebih' | 'obesitas'

export type WhoSample = {
  month: number
  minus3: number
  minus2: number
  median: number
  plus1: number
  plus2: number
  plus3: number
}

function mix(a: number, b: number, t: number) {
  return a + (b - a) * t
}

export function whoSampleAtMonth(ref: WhoPoint[], month: number): WhoSample {
  const last = ref[ref.length - 1]
  const m = Math.min(Math.max(month, ref[0].month), last.month)
  let i = 1
  while (i < ref.length - 1 && ref[i].month < m) i += 1
  const hi = ref[i]
  const lo = ref[i - 1]
  const span = hi.month - lo.month || 1
  const t = (m - lo.month) / span
  const median = mix(lo.median, hi.median, t)
  const plus2 = mix(lo.plus2, hi.plus2, t)
  return {
    month: m,
    minus3: mix(lo.minus3, hi.minus3, t),
    minus2: mix(lo.minus2, hi.minus2, t),
    median,
    plus1: median + (plus2 - median) / 2,
    plus2,
    plus3: mix(lo.plus3, hi.plus3, t),
  }
}

export function zFromSample(value: number, row: Pick<WhoSample, 'median' | 'plus2' | 'minus2'>) {
  const sd = value >= row.median ? (row.plus2 - row.median) / 2 : (row.median - row.minus2) / 2
  if (sd <= 0) return 0
  return (value - row.median) / sd
}

export function metricZScore(
  value: number,
  birthDate: string,
  measureDate: string,
  metric: GrowthMetric,
  gender: Gender
): number | null {
  const months = ageInMonths(birthDate, measureDate)
  const ref = getWhoReference(metric, gender)
  if (ref.length === 0) return null
  return zFromSample(value, whoSampleAtMonth(ref, months))
}

export function kmsBabyStatusFromZ(z: number): KmsBabyStatus {
  if (z < -3) return 'sangat-kurang'
  if (z < -2) return 'kurang'
  if (z <= 1) return 'normal'
  if (z <= 2) return 'lebih'
  return 'obesitas'
}

export function formatMeasureDate(iso: string) {
  const day = iso.slice(0, 10)
  const [year, month, date] = day.split('-').map(Number)
  if (!year || !month || !date) return iso
  return new Date(year, month - 1, date).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function formatKg(value: number) {
  return value.toFixed(1).replace('.', ',')
}

export function formatCm(value: number) {
  const rounded = Math.round(value * 10) / 10
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1).replace('.', ',')
}

export const KMS_CHART_MAX_MONTH = 24
