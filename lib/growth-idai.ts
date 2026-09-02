import type { Gender, GrowthMetric } from '@/lib/who-growth'
import { ageInMonths } from '@/lib/who-growth'

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

export function normalizeToMonthlyChange(actualChange: number, daysBetween: number): number {
  if (daysBetween <= 0) return 0
  return actualChange * (30 / daysBetween)
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

export type IdaiVelocityEvaluation = {
  metric: GrowthMetric
  trend: 'under' | 'normal' | 'over'
  monthlyChange: number
  minExpected: number
  maxExpected: number
  bandLabel: string
  targetLabel: string
  alert?: string
  statusDetail?: string
  isWeightFaltering?: boolean
}

const HEAD_MICRO_MACRO_MIN_CM = 0.5
const HEAD_MICRO_MACRO_MAX_CM = 2.5

export function evaluateIdaiMonthlyGrowth(
  monthlyChange: number,
  ageMonths: number,
  metric: GrowthMetric,
  gender: Gender = 'FEMALE'
): IdaiVelocityEvaluation | null {
  const band = getIdaiGrowthBand(ageMonths, gender)
  if (!band) return null

  if (metric === 'weight') {
    const monthlyGrams = monthlyChange * 1000
    const minExpected = band.weightKbmGram / 1000
    const maxExpected =
      band.weightMaxGram != null ? band.weightMaxGram / 1000 : minExpected * 2

    let trend: IdaiVelocityEvaluation['trend'] = 'normal'
    let statusDetail: string | undefined =
      'IDEAL: Pertumbuhan sesuai kurva WHO/IDAI'
    let alert: string | undefined

    if (monthlyGrams < band.weightKbmGram) {
      trend = 'under'
      statusDetail =
        'WARNING: Kenaikan BB di bawah KBM (risiko weight faltering, evaluasi pelekatan ASI/nutrisi ke Sp.A)'
      return {
        metric,
        trend,
        monthlyChange,
        minExpected,
        maxExpected,
        bandLabel: band.label,
        targetLabel: formatIdaiMonthlyTarget(band, metric),
        statusDetail,
        isWeightFaltering: true,
      }
    } else if (band.weightMaxGram != null && monthlyGrams > band.weightMaxGram) {
      trend = 'over'
      statusDetail = 'Kenaikan BB di atas rentang IDAI bulan ini'
    }

    return {
      metric,
      trend,
      monthlyChange,
      minExpected,
      maxExpected,
      bandLabel: band.label,
      targetLabel: formatIdaiMonthlyTarget(band, metric),
      alert,
      statusDetail,
    }
  }

  if (metric === 'height') {
    const minExpected = band.heightMinCm
    const maxExpected = band.heightMaxCm
    let trend: IdaiVelocityEvaluation['trend'] = 'normal'
    let statusDetail: string | undefined =
      'IDEAL: Pertumbuhan sesuai kurva WHO/IDAI'

    if (monthlyChange < minExpected) {
      trend = 'under'
      statusDetail = 'Kenaikan panjang badan di bawah rentang IDAI'
    } else if (monthlyChange > maxExpected) {
      trend = 'over'
      statusDetail = 'Kenaikan panjang badan di atas rentang IDAI'
    }

    return {
      metric,
      trend,
      monthlyChange,
      minExpected,
      maxExpected,
      bandLabel: band.label,
      targetLabel: formatIdaiMonthlyTarget(band, metric),
      statusDetail,
    }
  }

  const minExpected = band.headMinCm
  const maxExpected = band.headMaxCm
  let trend: IdaiVelocityEvaluation['trend'] = 'normal'
  let statusDetail: string | undefined = 'IDEAL: Pertumbuhan sesuai kurva WHO/IDAI'
  let alert: string | undefined

  if (monthlyChange < minExpected) {
    trend = 'under'
    statusDetail = 'Kenaikan lingkar kepala di bawah rentang IDAI'
  } else if (monthlyChange > maxExpected) {
    trend = 'over'
    statusDetail = 'Kenaikan lingkar kepala di atas rentang IDAI'
  }

  if (ageMonths < 3) {
    if (monthlyChange < HEAD_MICRO_MACRO_MIN_CM || monthlyChange > HEAD_MICRO_MACRO_MAX_CM) {
      alert =
        'Micro/Macrocephaly alert: kenaikan LK perlu konfirmasi dokter anak (<0,5 atau >2,5 cm/bln di 3 bulan pertama)'
      if (monthlyChange < HEAD_MICRO_MACRO_MIN_CM) trend = 'under'
      if (monthlyChange > HEAD_MICRO_MACRO_MAX_CM) trend = 'over'
    }
  }

  return {
    metric,
    trend,
    monthlyChange,
    minExpected,
    maxExpected,
    bandLabel: band.label,
    targetLabel: formatIdaiMonthlyTarget(band, metric),
    alert,
    statusDetail,
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
      message:
        'WARNING: Kenaikan BB di bawah KBM (risiko weight faltering, evaluasi pelekatan ASI/nutrisi ke Sp.A)',
      hasWeightFaltering: true,
      hasHeadAlert,
    }
  }

  if (hasHeadAlert) {
    return {
      trend: 'over',
      message:
        'Perhatian: kenaikan lingkar kepala perlu konfirmasi dokter anak (3 bulan pertama)',
      hasWeightFaltering: false,
      hasHeadAlert: true,
    }
  }

  if (allIdeal) {
    return {
      trend: 'normal',
      message: 'IDEAL: Pertumbuhan sesuai kurva WHO/IDAI',
      hasWeightFaltering: false,
      hasHeadAlert: false,
    }
  }

  if (hasUnder) {
    return {
      trend: 'under',
      message: 'Beberapa kenaikan bulanan di bawah rentang IDAI',
      hasWeightFaltering: false,
      hasHeadAlert: false,
    }
  }

  if (hasOver) {
    return {
      trend: 'over',
      message: 'Beberapa kenaikan bulanan di atas rentang IDAI',
      hasWeightFaltering: false,
      hasHeadAlert: false,
    }
  }

  return {
    trend: 'normal',
    message: 'Pertumbuhan bulanan dalam pantauan',
    hasWeightFaltering: false,
    hasHeadAlert: false,
  }
}
