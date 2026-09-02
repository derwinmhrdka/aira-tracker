import { getKmsZone, type KmsZone } from '@/lib/kms-status'
import {
  evaluateIdaiMonthlyGrowth,
  evaluateIdaiOverallMonthlyGrowth,
  normalizeToMonthlyChange,
  type IdaiOverallGrowthStatus,
  type IdaiVelocityEvaluation,
} from '@/lib/growth-idai'
import {
  ageInMonths,
  getWhoValueAtAge,
  type Gender,
  type GrowthMetric,
} from '@/lib/who-growth'

export type GrowthTrend = 'under' | 'normal' | 'over'

export type GrowthMetricPoint = {
  value: number
  date: string
}

export type GrowthLogLike = {
  date: string
  weight_kg: number
  height_cm: number
  head_circumference_cm?: number | null
}

export type GrowthVelocityResult = {
  trend: GrowthTrend
  metric: GrowthMetric
  actualChange: number
  monthlyChange: number
  daysBetween: number
  minExpected: number
  maxExpected: number
  targetLabel: string
  bandLabel: string
  alert?: string
  statusDetail?: string
  isWeightFaltering?: boolean
}

export type { IdaiOverallGrowthStatus, IdaiVelocityEvaluation }

export const GROWTH_TREND_LABEL: Record<GrowthTrend, string> = {
  under: 'Kurang',
  normal: 'Normal',
  over: 'Lebih',
}

export const GROWTH_VELOCITY_LABEL: Record<GrowthTrend, string> = {
  under: 'Lambat',
  normal: 'Normal',
  over: 'Cepat',
}

const MIN_VELOCITY_DAYS = 21
const TARGET_MONTH_DAYS = 30

function daysBetweenDates(from: string, to: string): number {
  const start = new Date(from)
  const end = new Date(to)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)))
}

function metricValueFromLog(log: GrowthLogLike, metric: GrowthMetric): number | null {
  const value =
    metric === 'weight'
      ? log.weight_kg
      : metric === 'height'
        ? log.height_cm
        : log.head_circumference_cm
  if (value == null || !Number.isFinite(value) || value <= 0) return null
  return value
}

/** Riwayat pengukuran per metrik, terbaru dulu. */
export function getMetricHistoryFromLogs(
  logs: GrowthLogLike[],
  metric: GrowthMetric
): GrowthMetricPoint[] {
  return [...logs]
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((log) => {
      const value = metricValueFromLog(log, metric)
      if (value == null) return null
      return { value, date: log.date }
    })
    .filter((point): point is GrowthMetricPoint => point != null)
}

/** Titik acuan ~1 bulan sebelum pengukuran terbaru (paling dekat 30 hari). */
export function getMetricBaselineOneMonthAgo(
  history: GrowthMetricPoint[]
): GrowthMetricPoint | null {
  if (history.length < 2) return null

  const current = history[0]
  const currentMs = new Date(current.date).getTime()
  if (Number.isNaN(currentMs)) return null

  const targetMs = currentMs - TARGET_MONTH_DAYS * 24 * 60 * 60 * 1000
  let best: { point: GrowthMetricPoint; score: number } | null = null

  for (const point of history.slice(1)) {
    const days = daysBetweenDates(point.date, current.date)
    if (days < MIN_VELOCITY_DAYS) continue

    const pointMs = new Date(point.date).getTime()
    if (Number.isNaN(pointMs)) continue

    const score = Math.abs(pointMs - targetMs)
    if (!best || score < best.score) {
      best = { point, score }
    }
  }

  return best?.point ?? null
}

export function getGrowthVelocityTrend(
  current: GrowthMetricPoint,
  previous: GrowthMetricPoint,
  birthDate: string,
  metric: GrowthMetric,
  gender: Gender = 'MALE'
): GrowthVelocityResult | null {
  const daysBetween = daysBetweenDates(previous.date, current.date)
  if (daysBetween < MIN_VELOCITY_DAYS) return null

  const actualChange = current.value - previous.value
  const monthlyChange = normalizeToMonthlyChange(actualChange, daysBetween)
  const ageMonths = ageInMonths(birthDate, current.date)
  const evaluation = evaluateIdaiMonthlyGrowth(monthlyChange, ageMonths, metric, gender)
  if (!evaluation) return null

  return {
    trend: evaluation.trend,
    metric,
    actualChange,
    monthlyChange: evaluation.monthlyChange,
    daysBetween,
    minExpected: evaluation.minExpected,
    maxExpected: evaluation.maxExpected,
    targetLabel: evaluation.targetLabel,
    bandLabel: evaluation.bandLabel,
    alert: evaluation.alert,
    statusDetail: evaluation.statusDetail,
    isWeightFaltering: evaluation.isWeightFaltering,
  }
}

export function getOverallMonthlyGrowthStatus(
  evaluations: Array<GrowthVelocityResult | null>
): IdaiOverallGrowthStatus | null {
  return evaluateIdaiOverallMonthlyGrowth(
    evaluations.map((item) =>
      item
        ? {
            metric: item.metric,
            trend: item.trend,
            monthlyChange: item.monthlyChange,
            minExpected: item.minExpected,
            maxExpected: item.maxExpected,
            bandLabel: item.bandLabel,
            targetLabel: item.targetLabel,
            alert: item.alert,
            statusDetail: item.statusDetail,
            isWeightFaltering: item.isWeightFaltering,
          }
        : null
    )
  )
}

/** Selisih kenaikan bulanan vs target IDAI. */
export function formatGrowthVelocityDelta(
  current: GrowthMetricPoint,
  previous: GrowthMetricPoint,
  birthDate: string,
  metric: GrowthMetric,
  gender: Gender = 'MALE'
): string | null {
  const velocity = getGrowthVelocityTrend(current, previous, birthDate, metric, gender)
  if (!velocity || velocity.trend === 'normal') return null

  if (metric === 'weight') {
    const monthlyGrams = velocity.monthlyChange * 1000
    const refGrams =
      velocity.trend === 'under'
        ? velocity.minExpected * 1000
        : velocity.maxExpected * 1000
    const diffGrams = Math.round(Math.abs(monthlyGrams - refGrams))
    if (diffGrams >= 1000) {
      const kg = (diffGrams / 1000).toFixed(1).replace('.', ',')
      return velocity.trend === 'under' ? `-${kg}` : `+${kg}`
    }
    return velocity.trend === 'under' ? `-${diffGrams}g` : `+${diffGrams}g`
  }

  const ref = velocity.trend === 'under' ? velocity.minExpected : velocity.maxExpected
  const diff = Math.abs(velocity.monthlyChange - ref)
  const formatted = diff.toFixed(1).replace('.', ',')
  return velocity.trend === 'under' ? `-${formatted}` : `+${formatted}`
}

export function formatGrowthVelocitySummary(
  current: GrowthMetricPoint,
  previous: GrowthMetricPoint,
  birthDate: string,
  metric: GrowthMetric,
  gender: Gender = 'MALE'
): string | null {
  const velocity = getGrowthVelocityTrend(current, previous, birthDate, metric, gender)
  if (!velocity) return null

  if (metric === 'weight') {
    const grams = Math.round(velocity.monthlyChange * 1000)
    const signed = grams > 0 ? `+${grams}` : String(grams)
    return `${signed} g/bln · target ${velocity.targetLabel}`
  }

  const unit = growthMetricUnit(metric)
  const change = velocity.monthlyChange.toFixed(1).replace('.', ',')
  const signed = velocity.monthlyChange > 0 ? `+${change}` : change
  return `${signed} ${unit}/bln · target ${velocity.targetLabel}`
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
  return 'Lingkar kepala'
}

export function growthMetricFullLabel(metric: GrowthMetric): string {
  if (metric === 'weight') return 'Berat badan'
  if (metric === 'height') return 'Panjang badan'
  return 'Lingkar kepala'
}

export function formatGrowthIdealRange(
  birthDate: string,
  measureDate: string,
  metric: GrowthMetric,
  gender: Gender = 'MALE'
): string | null {
  const minus2 = getWhoValueAtAge(birthDate, measureDate, metric, gender, 'minus2')
  const plus2 = getWhoValueAtAge(birthDate, measureDate, metric, gender, 'plus2')
  if (minus2 == null || plus2 == null) return null
  const unit = growthMetricUnit(metric)
  return `${formatGrowthValue(minus2, metric)}–${formatGrowthValue(plus2, metric)} ${unit}`
}

export function formatGrowthValueWithUnit(value: number, metric: GrowthMetric): string {
  return `${formatGrowthValue(value, metric)} ${growthMetricUnit(metric)}`
}
