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

/** Ingatkan jika sisa waktu ≤ ini (jam). */
export const MILK_EXPIRY_WARN_HOURS = 6

export const MILK_EXPIRY_PRESETS_HOURS = [
  { hours: 4, label: '4 jam' },
  { hours: 24, label: '24 jam' },
  { hours: 48, label: '48 jam' },
  { hours: 72, label: '72 jam' },
  { hours: 168, label: '7 hari' },
] as const

export type MilkExpiryStatus = 'ok' | 'soon' | 'expired' | 'none'

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

export function getMilkExpiryStatus(
  expiresAt: string | null | undefined,
  now = Date.now()
): MilkExpiryStatus {
  if (!expiresAt) return 'none'
  const exp = new Date(expiresAt).getTime()
  if (Number.isNaN(exp)) return 'none'
  if (exp <= now) return 'expired'
  const warnMs = MILK_EXPIRY_WARN_HOURS * 60 * 60 * 1000
  if (exp - now <= warnMs) return 'soon'
  return 'ok'
}

export function formatMilkExpiryRemaining(
  expiresAt: string | null | undefined,
  now = Date.now()
): string {
  if (!expiresAt) return ''
  const exp = new Date(expiresAt).getTime()
  if (Number.isNaN(exp)) return ''
  const diff = exp - now
  if (diff <= 0) return 'Kadaluarsa'
  const hours = Math.floor(diff / (60 * 60 * 1000))
  const mins = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000))
  if (hours >= 48) return `${Math.floor(hours / 24)} hari lagi`
  if (hours >= 1) return `${hours} jam lagi`
  return `${Math.max(1, mins)} mnt lagi`
}
