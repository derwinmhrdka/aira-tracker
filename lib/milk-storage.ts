export const MILK_STORAGE_LAYOUT_KEY = 'milk_storage_layout'

export type MilkStorageLayout = {
  rows: number
  cols: number
}

export const MILK_STORAGE_LAYOUT_DEFAULTS: MilkStorageLayout = {
  rows: 1,
  cols: 4,
}

export const MILK_STORAGE_ROWS_OPTIONS = [1, 2, 3, 4] as const
export const MILK_STORAGE_COLS_OPTIONS = [2, 3, 4, 5, 6] as const

/** Visual fill cap — ml di atas ini dianggap penuh. */
export const MILK_BOTTLE_MAX_ML = 240

export function normalizeMilkStorageLayout(raw: unknown): MilkStorageLayout {
  const base = { ...MILK_STORAGE_LAYOUT_DEFAULTS }
  if (!raw || typeof raw !== 'object') return base
  const obj = raw as Record<string, unknown>
  const rows = Number(obj.rows)
  const cols = Number(obj.cols)
  if (Number.isFinite(rows) && rows >= 1 && rows <= 4) base.rows = Math.round(rows)
  if (Number.isFinite(cols) && cols >= 2 && cols <= 6) base.cols = Math.round(cols)
  return base
}

export function milkSlotCount(layout: MilkStorageLayout): number {
  return layout.rows * layout.cols
}

export function formatMilkTime(iso: string | null | undefined): string {
  if (!iso) return ''
  return new Date(iso).toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}
