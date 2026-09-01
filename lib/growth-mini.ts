import { getKmsZone, type KmsZone } from '@/lib/kms-status'
import {
  ageInMonths,
  getWhoValueAtAge,
  type Gender,
  type GrowthMetric,
} from '@/lib/who-growth'

export type GrowthTrend = 'under' | 'normal' | 'over'

export const GROWTH_TREND_LABEL: Record<GrowthTrend, string> = {
  under: 'Kurang',
  normal: 'Normal',
  over: 'Lebih',
}

export function getGrowthTrend(
  value: number,
  birthDate: string,
  measureDate: string,
  metric: GrowthMetric,
  gender: Gender = 'MALE'
): GrowthTrend {
  const minus2 = getWhoValueAtAge(birthDate, measureDate, metric, gender, 'minus2')
  const plus2 = getWhoValueAtAge(birthDate, measureDate, metric, gender, 'plus2')
  if (minus2 == null || plus2 == null) return 'normal'
  if (value < minus2) return 'under'
  if (value > plus2) return 'over'
  return 'normal'
}

/** Selisih ke median WHO. Positif = di atas median, negatif = di bawah. */
export function getGrowthDeltaToMedian(
  value: number,
  birthDate: string,
  measureDate: string,
  metric: GrowthMetric,
  gender: Gender = 'MALE'
): number | null {
  const median = getWhoValueAtAge(birthDate, measureDate, metric, gender, 'median')
  if (median == null) return null
  const raw = value - median
  const decimals = metric === 'weight' ? 1 : 0
  const factor = 10 ** decimals
  return Math.round(raw * factor) / factor
}

/** Tampilan +/- menuju ideal (median). */
export function formatGrowthIdealDelta(
  value: number,
  birthDate: string,
  measureDate: string,
  metric: GrowthMetric,
  gender: Gender = 'MALE'
): string | null {
  const trend = getGrowthTrend(value, birthDate, measureDate, metric, gender)
  const delta = getGrowthDeltaToMedian(value, birthDate, measureDate, metric, gender)
  if (delta == null) return null
  if (trend === 'normal') return '0'
  const amount = Math.abs(delta)
  const formatted =
    metric === 'weight' ? amount.toFixed(1) : String(Math.round(amount))
  return trend === 'under' ? `+${formatted}` : `-${formatted}`
}

/** Posisi 0–100 pada rentang -2 SD s/d +2 SD untuk gauge visual. */
export function getGrowthGaugePercent(
  value: number,
  birthDate: string,
  measureDate: string,
  metric: GrowthMetric,
  gender: Gender = 'MALE'
): number | null {
  const minus2 = getWhoValueAtAge(birthDate, measureDate, metric, gender, 'minus2')
  const plus2 = getWhoValueAtAge(birthDate, measureDate, metric, gender, 'plus2')
  if (minus2 == null || plus2 == null || plus2 === minus2) return null
  const pct = ((value - minus2) / (plus2 - minus2)) * 100
  return Math.max(4, Math.min(96, pct))
}

export function getGrowthKmsZone(
  value: number,
  birthDate: string,
  measureDate: string,
  metric: GrowthMetric,
  gender: Gender = 'MALE'
): KmsZone {
  return getKmsZone(value, birthDate, measureDate, metric, gender)
}

export function formatGrowthValue(value: number, metric: GrowthMetric): string {
  if (metric === 'weight') return value.toFixed(1).replace('.', ',')
  return String(Math.round(value))
}

export function growthMetricUnit(metric: GrowthMetric): string {
  if (metric === 'weight') return 'kg'
  return 'cm'
}

export function growthMetricShortLabel(metric: GrowthMetric): string {
  if (metric === 'weight') return 'Berat'
  if (metric === 'height') return 'Panjang'
  return 'LK'
}
