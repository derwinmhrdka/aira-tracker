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

export type ChartDoseBar = ChartCell & {
  startWeeks: number
  endWeeks: number
  lane: number
}

export type ChartRow = {
  id: string
  label: string
  bars: ChartDoseBar[]
  laneCount: number
}

/** @deprecated discrete cell grid — use ChartDoseBar */
export type ChartRowCells = {
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
  if (/booster/i.test(doseLabel)) {
    const n = doseLabel.match(/(\d+)/)
    return n ? `B${n[1]}` : 'B'
  }
  const match = doseLabel.match(/(\d+)/)
  return match ? match[1] : '•'
}

function extractDoseSortOrder(doseLabel?: string | null): number {
  if (!doseLabel) return 99
  if (/booster/i.test(doseLabel)) {
    const n = doseLabel.match(/(\d+)/)
    return 50 + (n ? parseInt(n[1], 10) : 0)
  }
  const match = doseLabel.match(/(\d+)/)
  return match ? parseInt(match[1], 10) : 99
}

function intervalsOverlap(
  a: { start: number; end: number },
  b: { start: number; end: number }
): boolean {
  return a.start < b.end && b.start < a.end
}

export function getDoseWeekRange(item: Immunization): { start: number; end: number } {
  const scheduled =
    item.scheduled_age_weeks ??
    (item.scheduled_age_months > 0 ? item.scheduled_age_months * 4 : 0)

  const min = item.min_weeks ?? scheduled
  const max = item.max_weeks ?? scheduled

  if (min !== max) {
    return { start: Math.max(0, min), end: Math.max(min + 1, max) }
  }

  const col = IDAI_CHART_COLUMNS.find(
    (c) => scheduled >= c.minWeeks && scheduled <= c.maxWeeks
  )
  if (col) {
    return { start: col.minWeeks, end: col.maxWeeks + 1 }
  }

  return { start: scheduled, end: scheduled + 4 }
}

function assignBarLanes(
  bars: { startWeeks: number; endWeeks: number; sortOrder: number }[]
): number[] {
  const sorted = bars
    .map((b, index) => ({ ...b, index }))
    .sort((a, b) => a.startWeeks - b.startWeeks || a.sortOrder - b.sortOrder)

  const laneBars: { startWeeks: number; endWeeks: number }[][] = []
  const lanes = new Array(bars.length).fill(0)

  for (const bar of sorted) {
    let lane = 0
    while (
      lane < laneBars.length &&
      laneBars[lane].some((existing) =>
        intervalsOverlap(
          { start: bar.startWeeks, end: bar.endWeeks },
          { start: existing.startWeeks, end: existing.endWeeks }
        )
      )
    ) {
      lane++
    }

    if (!laneBars[lane]) laneBars[lane] = []
    laneBars[lane].push({ startWeeks: bar.startWeeks, endWeeks: bar.endWeeks })
    lanes[bar.index] = lane
  }

  return lanes
}

export const CHART_MONTH_COL_WIDTH = 40
export const CHART_YEAR_COL_WIDTH = 36
export const CHART_BAR_HEIGHT = 18
export const CHART_BAR_GAP = 4
export const CHART_ROW_PAD = 6

export function getChartTimelineBounds(columns: ChartAgeColumn[] = IDAI_CHART_COLUMNS) {
  return {
    start: columns[0].minWeeks,
    end: columns[columns.length - 1].maxWeeks + 1,
  }
}

export function getChartGridWidthPx(columns: ChartAgeColumn[] = IDAI_CHART_COLUMNS): number {
  return columns.reduce(
    (sum, col) =>
      sum + (col.group === 'month' ? CHART_MONTH_COL_WIDTH : CHART_YEAR_COL_WIDTH),
    0
  )
}

export function weeksToGridPx(
  weeks: number,
  columns: ChartAgeColumn[] = IDAI_CHART_COLUMNS
): number {
  const { start, end } = getChartTimelineBounds(columns)
  const totalWidth = getChartGridWidthPx(columns)
  const clamped = Math.min(end, Math.max(start, weeks))
  return ((clamped - start) / (end - start)) * totalWidth
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
  const rowMap = new Map<
    string,
    { label: string; items: Immunization[] }
  >()

  for (const item of items) {
    const rowLabel = normalizeVaccineChartRow(item.vaccine_name)
    const rowId = rowLabel.toLowerCase().replace(/\s+/g, '-')

    if (!rowMap.has(rowId)) {
      rowMap.set(rowId, { label: rowLabel, items: [] })
    }
    rowMap.get(rowId)!.items.push(item)
  }

  const orderedRows: ChartRow[] = []

  const buildRow = (id: string, label: string, rowItems: Immunization[]): ChartRow => {
    const draft = rowItems.map((item) => {
      const range = getDoseWeekRange(item)
      return {
        item,
        doseDisplay: extractDoseDisplay(item.dose_label),
        kind: getChartCellKind(item),
        startWeeks: range.start,
        endWeeks: range.end,
        sortOrder: extractDoseSortOrder(item.dose_label),
        lane: 0,
      }
    })

    const lanes = assignBarLanes(draft)
    const bars: ChartDoseBar[] = draft.map((bar, i) => ({
      item: bar.item,
      doseDisplay: bar.doseDisplay,
      kind: bar.kind,
      startWeeks: bar.startWeeks,
      endWeeks: bar.endWeeks,
      lane: lanes[i],
    }))

    const laneCount = bars.length > 0 ? Math.max(...bars.map((b) => b.lane)) + 1 : 1

    return { id, label, bars, laneCount }
  }

  for (const label of CHART_ROW_ORDER) {
    const id = label.toLowerCase().replace(/\s+/g, '-')
    const entry = rowMap.get(id)
    if (entry) {
      orderedRows.push(buildRow(id, entry.label, entry.items))
      rowMap.delete(id)
    }
  }

  for (const [id, entry] of rowMap.entries()) {
    orderedRows.push(buildRow(id, entry.label, entry.items))
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
