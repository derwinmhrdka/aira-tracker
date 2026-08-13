import type { Immunization } from '@/lib/api-client'

export type ChartCellKind = 'primer' | 'booster' | 'catchup' | 'endemic' | 'highrisk'

export type ChartAgeColumn = {
  id: string
  label: string
  group: 'month' | 'year'
  minWeeks: number
  maxWeeks: number
}

export type ChartCell = {
  item: Immunization
  doseDisplay: string
  kind: ChartCellKind
}

export type ChartRow = {
  id: string
  label: string
  cells: Map<string, ChartCell[]>
}

/** Kolom usia — mengikuti tabel IDAI 2024 (0–18 tahun). */
export const IDAI_CHART_COLUMNS: ChartAgeColumn[] = [
  { id: 'birth', label: 'Lahir', group: 'month', minWeeks: 0, maxWeeks: 3 },
  { id: 'm1', label: '1', group: 'month', minWeeks: 4, maxWeeks: 7 },
  { id: 'm2', label: '2', group: 'month', minWeeks: 8, maxWeeks: 11 },
  { id: 'm3', label: '3', group: 'month', minWeeks: 12, maxWeeks: 14 },
  { id: 'm4', label: '4', group: 'month', minWeeks: 15, maxWeeks: 21 },
  { id: 'm5', label: '5', group: 'month', minWeeks: 22, maxWeeks: 25 },
  { id: 'm6', label: '6', group: 'month', minWeeks: 26, maxWeeks: 35 },
  { id: 'm9', label: '9', group: 'month', minWeeks: 36, maxWeeks: 51 },
  { id: 'm12', label: '12', group: 'month', minWeeks: 52, maxWeeks: 64 },
  { id: 'm15', label: '15', group: 'month', minWeeks: 65, maxWeeks: 77 },
  { id: 'm18', label: '18', group: 'month', minWeeks: 78, maxWeeks: 103 },
  { id: 'm24', label: '24', group: 'month', minWeeks: 104, maxWeeks: 155 },
  ...([3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18] as const).map(
    (y) => ({
      id: `y${y}`,
      label: String(y),
      group: 'year' as const,
      minWeeks: y * 52 - 26,
      maxWeeks: y * 52 + 25,
    })
  ),
]

export const CHART_ROW_ORDER = [
  'Hepatitis B',
  'Polio',
  'BCG',
  'DTP',
  'Hib',
  'PCV',
  'Rotavirus',
  'Influenza',
  'MR / MMR',
  'Japanese Encephalitis',
  'Varisela',
  'Hepatitis A',
  'Tifoid',
  'Dengue',
  'HPV',
] as const

const WEEK_COLUMN_ANCHOR: Record<number, string> = {
  0: 'birth',
  8: 'm2',
  12: 'm3',
  16: 'm4',
  26: 'm6',
  36: 'm9',
  52: 'm12',
  65: 'm15',
  78: 'm18',
  104: 'm24',
  260: 'y5',
}

export function normalizeVaccineChartRow(name: string): string {
  const n = name.toLowerCase()

  if (/hepatitis\s*a\b/.test(n)) return 'Hepatitis A'
  if (/hepatitis\s*b|hb0|\bhb\b/.test(n)) return 'Hepatitis B'
  if (/bcg/.test(n)) return 'BCG'
  if (/japanese|encephalitis|\bje\b/.test(n)) return 'Japanese Encephalitis'
  if (/campak|mmr|\bmr\b/.test(n)) return 'MR / MMR'
  if (/varisela|varicella/.test(n)) return 'Varisela'
  if (/tifoid|typhoid/.test(n)) return 'Tifoid'
  if (/dengue/.test(n)) return 'Dengue'
  if (/hpv/.test(n)) return 'HPV'
  if (/influenza|\bflu\b/.test(n)) return 'Influenza'
  if (/rotavirus|\brv\b/.test(n)) return 'Rotavirus'
  if (/pcv|pneumococ/.test(n)) return 'PCV'
  if (/polio|ipv|opv/.test(n)) return 'Polio'
  if (/^hib\b/.test(n) || (/\bhib\b/.test(n) && !/dpt|dtp|pentavalen|hexavalen/.test(n))) {
    return 'Hib'
  }
  if (/dpt|dtp|pentavalen|hexavalen/.test(n)) return 'DTP'

  return name.split('(')[0].trim()
}

export function weeksToChartColumnId(weeks: number): string {
  if (weeks in WEEK_COLUMN_ANCHOR) return WEEK_COLUMN_ANCHOR[weeks]

  for (const col of IDAI_CHART_COLUMNS) {
    if (weeks >= col.minWeeks && weeks <= col.maxWeeks) return col.id
  }

  let best = IDAI_CHART_COLUMNS[0]
  let bestDist = Infinity
  for (const col of IDAI_CHART_COLUMNS) {
    const mid = (col.minWeeks + col.maxWeeks) / 2
    const dist = Math.abs(weeks - mid)
    if (dist < bestDist) {
      bestDist = dist
      best = col
    }
  }
  return best.id
}

export function getChartCellKind(item: Immunization): ChartCellKind {
  const dose = (item.dose_label ?? '').toLowerCase()
  const notes = (item.schedule_notes ?? '').toLowerCase()
  const name = item.vaccine_name.toLowerCase()

  if (/booster/i.test(dose)) return 'booster'
  if (/endemis|\bje\b|japanese/.test(notes + name)) return 'endemic'
  if (/risiko tinggi|high.?risk/.test(notes)) return 'highrisk'

  const min = item.min_weeks
  const max = item.max_weeks
  const scheduled = item.scheduled_age_weeks ?? 0
  if (
    min != null &&
    max != null &&
    max - min >= 8 &&
    scheduled !== min &&
    max - min > 12
  ) {
    return 'catchup'
  }

  return 'primer'
}

export function extractDoseDisplay(doseLabel?: string | null): string {
  if (!doseLabel) return '•'
  if (/tunggal/i.test(doseLabel)) return '1'
  const match = doseLabel.match(/(\d+)/)
  return match ? match[1] : '•'
}

export function getChartColumnForBabyWeeks(babyWeeks: number): string | null {
  if (babyWeeks < 0) return null
  for (const col of IDAI_CHART_COLUMNS) {
    if (babyWeeks >= col.minWeeks && babyWeeks <= col.maxWeeks) return col.id
  }
  if (babyWeeks > IDAI_CHART_COLUMNS[IDAI_CHART_COLUMNS.length - 1].maxWeeks) {
    return IDAI_CHART_COLUMNS[IDAI_CHART_COLUMNS.length - 1].id
  }
  return null
}

export function buildImmunizationChart(items: Immunization[]): {
  columns: ChartAgeColumn[]
  rows: ChartRow[]
} {
  const rowMap = new Map<string, ChartRow>()

  for (const item of items) {
    const rowLabel = normalizeVaccineChartRow(item.vaccine_name)
    const rowId = rowLabel.toLowerCase().replace(/\s+/g, '-')
    const weeks =
      item.scheduled_age_weeks ??
      (item.scheduled_age_months > 0 ? item.scheduled_age_months * 4 : 0)
    const colId = weeksToChartColumnId(weeks)

    if (!rowMap.has(rowId)) {
      rowMap.set(rowId, { id: rowId, label: rowLabel, cells: new Map() })
    }

    const row = rowMap.get(rowId)!
    const list = row.cells.get(colId) ?? []
    list.push({
      item,
      doseDisplay: extractDoseDisplay(item.dose_label),
      kind: getChartCellKind(item),
    })
    row.cells.set(colId, list)
  }

  const orderedRows: ChartRow[] = []
  for (const label of CHART_ROW_ORDER) {
    const id = label.toLowerCase().replace(/\s+/g, '-')
    const row = rowMap.get(id)
    if (row) {
      orderedRows.push(row)
      rowMap.delete(id)
    }
  }

  for (const row of rowMap.values()) {
    orderedRows.push(row)
  }

  return { columns: IDAI_CHART_COLUMNS, rows: orderedRows }
}

export const CHART_KIND_LABEL: Record<ChartCellKind, string> = {
  primer: 'Primer',
  booster: 'Booster',
  catchup: 'Kejar',
  endemic: 'Endemis',
  highrisk: 'Risiko',
}

export const CHART_KIND_STYLE: Record<ChartCellKind, string> = {
  primer: 'bg-sky-500 text-white dark:bg-sky-600',
  booster: 'bg-emerald-400 text-emerald-950 dark:bg-emerald-500 dark:text-emerald-950',
  catchup: 'bg-amber-300 text-amber-950 dark:bg-amber-400',
  endemic: 'bg-red-400 text-white dark:bg-red-500',
  highrisk: 'bg-orange-400 text-orange-950 dark:bg-orange-500',
}
