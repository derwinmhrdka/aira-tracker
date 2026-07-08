export type WhoPoint = {
  month: number
  minus3: number
  minus2: number
  median: number
  plus2: number
  plus3: number
}

export type Gender = 'MALE' | 'FEMALE'
export type GrowthMetric = 'weight' | 'height'

// Weight kg
export const WHO_WEIGHT_BOYS: WhoPoint[] = [
  { month: 0, minus3: 2.1, minus2: 2.5, median: 3.3, plus2: 4.4, plus3: 5.1 },
  { month: 1, minus3: 2.9, minus2: 3.4, median: 4.5, plus2: 5.8, plus3: 6.6 },
  { month: 2, minus3: 3.8, minus2: 4.3, median: 5.6, plus2: 7.1, plus3: 8.0 },
  { month: 3, minus3: 4.4, minus2: 5.0, median: 6.4, plus2: 8.0, plus3: 9.0 },
  { month: 6, minus3: 5.7, minus2: 6.4, median: 7.9, plus2: 9.8, plus3: 10.9 },
  { month: 9, minus3: 6.4, minus2: 7.1, median: 8.9, plus2: 11.0, plus3: 12.3 },
  { month: 12, minus3: 6.9, minus2: 7.7, median: 9.6, plus2: 11.9, plus3: 13.3 },
  { month: 18, minus3: 7.8, minus2: 8.8, median: 10.9, plus2: 13.5, plus3: 15.1 },
  { month: 24, minus3: 8.4, minus2: 9.5, median: 12.0, plus2: 14.9, plus3: 16.7 },
]

export const WHO_WEIGHT_GIRLS: WhoPoint[] = [
  { month: 0, minus3: 2.0, minus2: 2.4, median: 3.2, plus2: 4.2, plus3: 4.8 },
  { month: 1, minus3: 2.7, minus2: 3.2, median: 4.2, plus2: 5.5, plus3: 6.2 },
  { month: 2, minus3: 3.4, minus2: 3.9, median: 5.1, plus2: 6.5, plus3: 7.4 },
  { month: 3, minus3: 4.0, minus2: 4.5, median: 5.8, plus2: 7.3, plus3: 8.2 },
  { month: 6, minus3: 5.1, minus2: 5.8, median: 7.3, plus2: 9.0, plus3: 10.1 },
  { month: 9, minus3: 5.8, minus2: 6.5, median: 8.2, plus2: 10.1, plus3: 11.3 },
  { month: 12, minus3: 6.3, minus2: 7.0, median: 8.9, plus2: 10.9, plus3: 12.2 },
  { month: 18, minus3: 7.0, minus2: 7.9, median: 10.0, plus2: 12.3, plus3: 13.7 },
  { month: 24, minus3: 7.5, minus2: 8.5, median: 10.8, plus2: 13.3, plus3: 14.8 },
]

// Height cm
export const WHO_HEIGHT_BOYS: WhoPoint[] = [
  { month: 0, minus3: 44.2, minus2: 46.1, median: 49.9, plus2: 53.7, plus3: 55.6 },
  { month: 3, minus3: 55.3, minus2: 57.3, median: 61.4, plus2: 65.5, plus3: 67.5 },
  { month: 6, minus3: 61.2, minus2: 63.3, median: 67.6, plus2: 71.9, plus3: 74.0 },
  { month: 9, minus3: 65.2, minus2: 67.4, median: 71.8, plus2: 76.2, plus3: 78.4 },
  { month: 12, minus3: 68.0, minus2: 70.1, median: 74.0, plus2: 77.9, plus3: 80.0 },
  { month: 18, minus3: 72.0, minus2: 74.2, median: 78.7, plus2: 83.2, plus3: 85.4 },
  { month: 24, minus3: 75.0, minus2: 77.3, median: 82.1, plus2: 86.9, plus3: 89.2 },
]

export const WHO_HEIGHT_GIRLS: WhoPoint[] = [
  { month: 0, minus3: 43.6, minus2: 45.4, median: 49.1, plus2: 52.9, plus3: 54.7 },
  { month: 3, minus3: 53.5, minus2: 55.6, median: 59.8, plus2: 64.0, plus3: 66.1 },
  { month: 6, minus3: 59.1, minus2: 61.2, median: 65.7, plus2: 70.2, plus3: 72.3 },
  { month: 9, minus3: 62.7, minus2: 64.8, median: 69.4, plus2: 74.0, plus3: 76.1 },
  { month: 12, minus3: 65.3, minus2: 67.4, median: 72.0, plus2: 76.6, plus3: 78.7 },
  { month: 18, minus3: 69.0, minus2: 71.2, median: 76.0, plus2: 80.8, plus3: 83.0 },
  { month: 24, minus3: 72.0, minus2: 74.3, median: 79.3, plus2: 84.3, plus3: 86.6 },
]

export function getWhoReference(
  metric: GrowthMetric,
  gender: Gender = 'MALE'
): WhoPoint[] {
  if (metric === 'weight') {
    return gender === 'FEMALE' ? WHO_WEIGHT_GIRLS : WHO_WEIGHT_BOYS
  }
  return gender === 'FEMALE' ? WHO_HEIGHT_GIRLS : WHO_HEIGHT_BOYS
}

export function ageInMonths(birthDate: string, measureDate: string): number {
  const birth = new Date(birthDate)
  const measure = new Date(measureDate)
  const months =
    (measure.getFullYear() - birth.getFullYear()) * 12 +
    (measure.getMonth() - birth.getMonth()) +
    (measure.getDate() - birth.getDate()) / 30
  return Math.max(0, Math.round(months * 10) / 10)
}

type WhoField = 'minus3' | 'minus2' | 'median' | 'plus2' | 'plus3'

function interpolateWhoField(
  months: number,
  ref: WhoPoint[],
  field: WhoField
): number {
  if (ref.length === 0) return 0
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
  return ref[ref.length - 1][field]
}

function whoRowAtMonth(month: number, ref: WhoPoint[]) {
  const minus3 = interpolateWhoField(month, ref, 'minus3')
  const minus2 = interpolateWhoField(month, ref, 'minus2')
  const median = interpolateWhoField(month, ref, 'median')
  const plus2 = interpolateWhoField(month, ref, 'plus2')
  const plus3 = interpolateWhoField(month, ref, 'plus3')
  const pad = (plus3 - minus3) * 0.25
  const lower = minus3 - pad
  const upper = plus3 + pad

  return {
    month,
    minus3,
    minus2,
    median,
    plus2,
    plus3,
    zoneBahayaLow: [lower, minus3] as [number, number],
    zoneWaspadaLow: [minus3, minus2] as [number, number],
    zoneNormal: [minus2, plus2] as [number, number],
    zoneWaspadaHigh: [plus2, plus3] as [number, number],
    zoneBahayaHigh: [plus3, upper] as [number, number],
    baby: null as number | null,
  }
}

export function buildDenseChartData(
  growthLogs: { date: string; value: number }[],
  birthDate: string,
  metric: GrowthMetric,
  gender: Gender = 'MALE',
  maxMonth = 24
) {
  const ref = getWhoReference(metric, gender)
  const whoData = Array.from({ length: maxMonth + 1 }, (_, month) =>
    whoRowAtMonth(month, ref)
  )

  const latestByMonth = new Map<number, { date: string; value: number }>()
  for (const log of growthLogs) {
    const month = Math.round(ageInMonths(birthDate, log.date))
    if (month < 0 || month > maxMonth) continue
    const existing = latestByMonth.get(month)
    if (!existing || log.date > existing.date) {
      latestByMonth.set(month, log)
    }
  }

  for (const [month, log] of latestByMonth) {
    whoData[month].baby = log.value
  }

  return whoData
}

export function buildChartData(
  growthLogs: { date: string; value: number }[],
  birthDate: string,
  metric: GrowthMetric,
  gender: Gender = 'MALE'
) {
  const ref = getWhoReference(metric, gender)
  const whoData = ref.map((w) => {
    const pad = (w.plus3 - w.minus3) * 0.25
    const lower = w.minus3 - pad
    const upper = w.plus3 + pad

    return {
      month: w.month,
      minus3: w.minus3,
      minus2: w.minus2,
      median: w.median,
      plus2: w.plus2,
      plus3: w.plus3,
      zoneBahayaLow: [lower, w.minus3] as [number, number],
      zoneWaspadaLow: [w.minus3, w.minus2] as [number, number],
      zoneNormal: [w.minus2, w.plus2] as [number, number],
      zoneWaspadaHigh: [w.plus2, w.plus3] as [number, number],
      zoneBahayaHigh: [w.plus3, upper] as [number, number],
      baby: null as number | null,
    }
  })

  for (const log of growthLogs) {
    const month = Math.round(ageInMonths(birthDate, log.date))
    const idx = whoData.findIndex((d) => d.month === month)
    if (idx >= 0) {
      whoData[idx].baby = log.value
    }
  }

  return whoData.sort((a, b) => a.month - b.month)
}
