import type { Gender, GrowthMetric } from '@/lib/who-growth'

/** Rentang usia (bulan) — standar kenaikan bulanan IDAI (bayi perempuan). */
export type IdaiMonthlyGrowthBand = {
  minMonth: number
  maxMonth: number
  label: string
  weightKbmGram: number
  weightMaxGram: number | null
  heightMinCm: number
  heightMaxCm: number
  headMinCm: number
  headMaxCm: number
}

/** Referensi IDAI — tabel kenaikan ideal per bulan (0–12 bln). */
export const IDAI_MONTHLY_GROWTH_FEMALE: IdaiMonthlyGrowthBand[] = [
  {
    minMonth: 0,
    maxMonth: 1,
    label: '0–1 bln',
    weightKbmGram: 800,
    weightMaxGram: null,
    heightMinCm: 2.5,
    heightMaxCm: 3.5,
    headMinCm: 2.0,
    headMaxCm: 2.5,
  },
  {
    minMonth: 1,
    maxMonth: 2,
    label: '1–2 bln',
    weightKbmGram: 900,
    weightMaxGram: null,
    heightMinCm: 2.5,
    heightMaxCm: 3.5,
    headMinCm: 2.0,
    headMaxCm: 2.5,
  },
  {
    minMonth: 2,
    maxMonth: 3,
    label: '2–3 bln',
    weightKbmGram: 800,
    weightMaxGram: null,
    heightMinCm: 2.5,
    heightMaxCm: 3.0,
    headMinCm: 1.5,
    headMaxCm: 2.5,
  },
  {
    minMonth: 3,
    maxMonth: 4,
    label: '3–4 bln',
    weightKbmGram: 600,
    weightMaxGram: null,
    heightMinCm: 2.0,
    heightMaxCm: 2.5,
    headMinCm: 1.5,
    headMaxCm: 2.0,
  },
  {
    minMonth: 4,
    maxMonth: 5,
    label: '4–5 bln',
    weightKbmGram: 500,
    weightMaxGram: null,
    heightMinCm: 1.5,
    heightMaxCm: 2.0,
    headMinCm: 1.0,
    headMaxCm: 1.5,
  },
  {
    minMonth: 5,
    maxMonth: 6,
    label: '5–6 bln',
    weightKbmGram: 400,
    weightMaxGram: null,
    heightMinCm: 1.5,
    heightMaxCm: 2.0,
    headMinCm: 1.0,
    headMaxCm: 1.5,
  },
  {
    minMonth: 6,
    maxMonth: 12,
    label: '6–12 bln',
    weightKbmGram: 200,
    weightMaxGram: 300,
    heightMinCm: 1.0,
    heightMaxCm: 1.5,
    headMinCm: 0.5,
    headMaxCm: 1.0,
  },
]

const HEAD_MICRO_MACRO_MIN_CM = 0.5
const HEAD_MICRO_MACRO_MAX_CM = 2.5

/** Sementara memakai referensi perempuan hingga tabel laki-laki ditambahkan. */
export function getIdaiMonthlyGrowthBands(_gender: Gender = 'FEMALE'): IdaiMonthlyGrowthBand[] {
  return IDAI_MONTHLY_GROWTH_FEMALE
}

export function getIdaiGrowthBand(
  ageMonths: number,
  gender: Gender = 'FEMALE'
): IdaiMonthlyGrowthBand | null {
  if (ageMonths < 0 || ageMonths >= 12) return null
  const bands = getIdaiMonthlyGrowthBands(gender)
  return (
    bands.find((band) => ageMonths >= band.minMonth && ageMonths < band.maxMonth) ??
    bands[bands.length - 1] ??
    null
  )
}

/** Prorata standar bulanan ke jumlah hari pengukuran. */
export function prorateMonthlyValue(monthlyValue: number, daysBetween: number): number {
  if (daysBetween <= 0) return 0
  return monthlyValue * (daysBetween / 30)
}

export function formatIdaiMonthlyTarget(
  band: IdaiMonthlyGrowthBand,
  metric: GrowthMetric
): string {
  if (metric === 'weight') {
    if (band.weightMaxGram != null) {
      return `KBM ${band.weightKbmGram}–${band.weightMaxGram} g/bln`
    }
    return `KBM ≥${band.weightKbmGram} g/bln`
  }
  if (metric === 'height') {
    return `${band.heightMinCm}–${band.heightMaxCm} cm/bln`
  }
  return `${band.headMinCm}–${band.headMaxCm} cm/bln`
}

export function formatIdaiPeriodTarget(
  band: IdaiMonthlyGrowthBand,
  metric: GrowthMetric,
  daysBetween: number
): string {
  if (metric === 'weight') {
    const minG = Math.round(prorateMonthlyValue(band.weightKbmGram, daysBetween))
    if (band.weightMaxGram != null) {
      const maxG = Math.round(prorateMonthlyValue(band.weightMaxGram, daysBetween))
      return `${minG}–${maxG} g`
    }
    return `≥${minG} g`
  }
  if (metric === 'height') {
    const min = prorateMonthlyValue(band.heightMinCm, daysBetween)
    const max = prorateMonthlyValue(band.heightMaxCm, daysBetween)
    return `${min.toFixed(1).replace('.', ',')}–${max.toFixed(1).replace('.', ',')} cm`
  }
  const min = prorateMonthlyValue(band.headMinCm, daysBetween)
  const max = prorateMonthlyValue(band.headMaxCm, daysBetween)
  return `${min.toFixed(1).replace('.', ',')}–${max.toFixed(1).replace('.', ',')} cm`
}

export type IdaiVelocityEvaluation = {
  metric: GrowthMetric
  trend: 'under' | 'normal' | 'over'
  actualChange: number
  daysBetween: number
  minExpected: number
  maxExpected: number
  bandLabel: string
  targetLabel: string
  periodTargetLabel: string
  alert?: string
  isWeightFaltering?: boolean
}

/** Bandingkan kenaikan aktual vs target IDAI yang diprorata menurut jarak hari. */
export function evaluateIdaiPeriodGrowth(
  actualChange: number,
  daysBetween: number,
  ageMonths: number,
  metric: GrowthMetric,
  gender: Gender = 'FEMALE'
): IdaiVelocityEvaluation | null {
  const band = getIdaiGrowthBand(ageMonths, gender)
  if (!band || daysBetween <= 0) return null

  const periodTargetLabel = formatIdaiPeriodTarget(band, metric, daysBetween)
  const monthlyTargetLabel = formatIdaiMonthlyTarget(band, metric)

  if (metric === 'weight') {
    const actualGrams = actualChange * 1000
    const minGrams = prorateMonthlyValue(band.weightKbmGram, daysBetween)
    const maxGrams =
      band.weightMaxGram != null
        ? prorateMonthlyValue(band.weightMaxGram, daysBetween)
        : minGrams * 2
    const minExpected = minGrams / 1000
    const maxExpected = maxGrams / 1000

    if (actualGrams < minGrams) {
      return {
        metric,
        trend: 'under',
        actualChange,
        daysBetween,
        minExpected,
        maxExpected,
        bandLabel: band.label,
        targetLabel: monthlyTargetLabel,
        periodTargetLabel,
        isWeightFaltering: true,
      }
    }

    let trend: IdaiVelocityEvaluation['trend'] = 'normal'
    if (band.weightMaxGram != null && actualGrams > maxGrams) trend = 'over'

    return {
      metric,
      trend,
      actualChange,
      daysBetween,
      minExpected,
      maxExpected,
      bandLabel: band.label,
      targetLabel: monthlyTargetLabel,
      periodTargetLabel,
    }
  }

  if (metric === 'height') {
    const minExpected = prorateMonthlyValue(band.heightMinCm, daysBetween)
    const maxExpected = prorateMonthlyValue(band.heightMaxCm, daysBetween)
    let trend: IdaiVelocityEvaluation['trend'] = 'normal'

    if (actualChange < minExpected) trend = 'under'
    else if (actualChange > maxExpected) trend = 'over'

    return {
      metric,
      trend,
      actualChange,
      daysBetween,
      minExpected,
      maxExpected,
      bandLabel: band.label,
      targetLabel: monthlyTargetLabel,
      periodTargetLabel,
    }
  }

  const minExpected = prorateMonthlyValue(band.headMinCm, daysBetween)
  const maxExpected = prorateMonthlyValue(band.headMaxCm, daysBetween)
  let trend: IdaiVelocityEvaluation['trend'] = 'normal'
  let alert: string | undefined

  if (actualChange < minExpected) trend = 'under'
  else if (actualChange > maxExpected) trend = 'over'

  if (ageMonths < 3) {
    const headMin = prorateMonthlyValue(HEAD_MICRO_MACRO_MIN_CM, daysBetween)
    const headMax = prorateMonthlyValue(HEAD_MICRO_MACRO_MAX_CM, daysBetween)
    if (actualChange < headMin || actualChange > headMax) {
      alert = 'LK di luar normal (3 bln pertama). Konfirmasi ke dokter anak.'
      if (actualChange < headMin) trend = 'under'
      if (actualChange > headMax) trend = 'over'
    }
  }

  return {
    metric,
    trend,
    actualChange,
    daysBetween,
    minExpected,
    maxExpected,
    bandLabel: band.label,
    targetLabel: monthlyTargetLabel,
    periodTargetLabel,
    alert,
  }
}

export type IdaiOverallGrowthStatus = {
  trend: 'under' | 'normal' | 'over'
  message: string
  hasWeightFaltering: boolean
  hasHeadAlert: boolean
}

export function evaluateIdaiOverallMonthlyGrowth(
  evaluations: Array<IdaiVelocityEvaluation | null>
): IdaiOverallGrowthStatus | null {
  const valid = evaluations.filter((item): item is IdaiVelocityEvaluation => item != null)
  if (valid.length === 0) return null

  const hasWeightFaltering = valid.some((item) => item.isWeightFaltering)
  const hasHeadAlert = valid.some((item) => item.alert != null)
  const hasUnder = valid.some((item) => item.trend === 'under')
  const hasOver = valid.some((item) => item.trend === 'over')
  const allIdeal = valid.every((item) => item.trend === 'normal' && !item.alert)

  if (hasWeightFaltering) {
    return {
      trend: 'under',
      message: 'BB di bawah KBM — evaluasi ke Sp.A',
      hasWeightFaltering: true,
      hasHeadAlert,
    }
  }

  if (hasHeadAlert) {
    return {
      trend: 'over',
      message: 'LK perlu konfirmasi dokter anak',
      hasWeightFaltering: false,
      hasHeadAlert: true,
    }
  }

  if (allIdeal) {
    return {
      trend: 'normal',
      message: 'Pertumbuhan sesuai IDAI',
      hasWeightFaltering: false,
      hasHeadAlert: false,
    }
  }

  if (hasUnder) {
    return {
      trend: 'under',
      message: 'Ada kenaikan di bawah rentang IDAI',
      hasWeightFaltering: false,
      hasHeadAlert: false,
    }
  }

  if (hasOver) {
    return {
      trend: 'over',
      message: 'Ada kenaikan di atas rentang IDAI',
      hasWeightFaltering: false,
      hasHeadAlert: false,
    }
  }

  return {
    trend: 'normal',
    message: 'Dalam pantauan',
    hasWeightFaltering: false,
    hasHeadAlert: false,
  }
}
