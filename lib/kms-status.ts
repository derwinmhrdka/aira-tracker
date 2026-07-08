import {
  getWhoReference,
  ageInMonths,
  type WhoPoint,
  type GrowthMetric,
  type Gender,
} from '@/lib/who-growth'

export type KmsZone = 'normal' | 'waspada' | 'bahaya' | 'unknown'

export const KMS_ZONE_LABEL: Record<KmsZone, string> = {
  normal: 'Normal',
  waspada: 'Waspada',
  bahaya: 'Bahaya',
  unknown: '-',
}

export const KMS_ZONE_STYLE: Record<KmsZone, string> = {
  normal:
    'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300',
  waspada:
    'bg-yellow-100 text-yellow-800 dark:bg-yellow-950/40 dark:text-yellow-300',
  bahaya: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300',
  unknown: 'bg-secondary text-muted-foreground',
}

export const KMS_ZONE_HINT: Record<KmsZone, string | null> = {
  normal: 'Dalam rentang normal WHO (-2 SD s/d +2 SD)',
  waspada: 'Di luar normal — perlu pemantauan lebih sering',
  bahaya: 'Di luar batas aman — segera konsultasi ke tenaga kesehatan',
  unknown: null,
}

export const KMS_ZONE_DOT: Record<KmsZone, string> = {
  normal: '#22c55e',
  waspada: '#eab308',
  bahaya: '#ef4444',
  unknown: '#3b82f6',
}

type WhoField = 'minus3' | 'minus2' | 'plus2' | 'plus3'

function interpolateWhoValue(
  months: number,
  ref: WhoPoint[],
  field: WhoField
): number | null {
  if (ref.length === 0) return null
  if (months <= ref[0].month) return ref[0][field]
  if (months >= ref[ref.length - 1].month) return ref[ref.length - 1][field]

  for (let i = 0; i < ref.length - 1; i++) {
    const a = ref[i]
    const b = ref[i + 1]
    if (months >= a.month && months <= b.month) {
      const span = b.month - a.month
      if (span === 0) return a[field]
      const t = (months - a.month) / span
      return a[field] + t * (b[field] - a[field])
    }
  }
  return null
}

export function getKmsZone(
  value: number,
  birthDate: string,
  measureDate: string,
  metric: GrowthMetric,
  gender: Gender = 'MALE'
): KmsZone {
  const months = ageInMonths(birthDate, measureDate)
  const ref = getWhoReference(metric, gender)
  const minus3 = interpolateWhoValue(months, ref, 'minus3')
  const minus2 = interpolateWhoValue(months, ref, 'minus2')
  const plus2 = interpolateWhoValue(months, ref, 'plus2')
  const plus3 = interpolateWhoValue(months, ref, 'plus3')

  if (minus2 == null || plus2 == null) return 'unknown'

  if (value >= minus2 && value <= plus2) return 'normal'

  const lowWaspada = minus3 != null && value >= minus3 && value < minus2
  const highWaspada = plus3 != null && value > plus2 && value <= plus3
  if (lowWaspada || highWaspada) return 'waspada'

  if ((minus3 != null && value < minus3) || (plus3 != null && value > plus3)) {
    return 'bahaya'
  }

  return 'unknown'
}
