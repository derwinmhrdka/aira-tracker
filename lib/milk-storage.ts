import { assignUniqueBottleNumbers } from '@/lib/milk-bottle-number'

export const MILK_STORAGE_LAYOUT_KEY = 'milk_storage_layout'
export const MILK_REMINDER_SETTINGS_KEY = 'milk_reminder_settings'

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
export const MILK_BOTTLE_MAX_ML = 180

/** Max ml input / storage per botol. */
export const MILK_AMOUNT_MAX_ML = 180

export function getBottleDisplayNumber(slot: {
  slot_index: number
  bottle_number?: number | null
  is_filled?: boolean
}): number {
  if (slot.is_filled && slot.bottle_number != null) {
    return slot.bottle_number
  }
  return slot.slot_index + 1
}

export function dedupeClientMilkSlots<
  T extends {
    slot_index: number
    amount_ml: number | null
    filled_at: string | null
    bottle_number?: number | null
    is_filled: boolean
  },
>(slots: T[]): T[] {
  const assigned = assignUniqueBottleNumbers(
    slots.map((slot) => ({
      slotIndex: slot.slot_index,
      amountMl: slot.is_filled ? slot.amount_ml : null,
      filledAt:
        slot.is_filled && slot.filled_at ? new Date(slot.filled_at) : null,
      bottleNumber: slot.bottle_number ?? null,
    }))
  )

  return slots.map((slot) => {
    if (!slot.is_filled) return slot
    const bottleNumber =
      assigned.get(slot.slot_index) ??
      slot.bottle_number ??
      slot.slot_index + 1
    return { ...slot, bottle_number: bottleNumber }
  })
}

/** @deprecated use getMilkReminderSettings().warnBeforeMinutes */
export const MILK_EXPIRY_WARN_HOURS = 6

export const MIN_MILK_WARN_MINUTES = 60
export const MAX_MILK_WARN_MINUTES = 7 * 24 * 60
export const DEFAULT_MILK_WARN_MINUTES = MILK_EXPIRY_WARN_HOURS * 60

const MILK_REMINDER_KEY = 'baby_tracker_milk_reminder'

export type MilkReminderSettings = {
  enabled: boolean
  warnBeforeMinutes: number
}

const MILK_REMINDER_DEFAULTS: MilkReminderSettings = {
  enabled: true,
  warnBeforeMinutes: DEFAULT_MILK_WARN_MINUTES,
}

export const MILK_WARN_PRESETS = [
  { minutes: 60, label: '1 jam' },
  { minutes: 4 * 60, label: '4 jam' },
  { minutes: 6 * 60, label: '6 jam' },
  { minutes: 12 * 60, label: '12 jam' },
  { minutes: 24 * 60, label: '1 hari' },
  { minutes: 48 * 60, label: '2 hari' },
  { minutes: 7 * 24 * 60, label: '7 hari' },
] as const

export function clampMilkWarnMinutes(minutes: number): number {
  return Math.min(
    MAX_MILK_WARN_MINUTES,
    Math.max(MIN_MILK_WARN_MINUTES, Math.round(minutes))
  )
}

export function formatMilkWarnBefore(totalMinutes: number): string {
  const clamped = clampMilkWarnMinutes(totalMinutes)
  const hours = Math.floor(clamped / 60)
  const mins = clamped % 60
  if (hours >= 24 && mins === 0 && hours % 24 === 0) {
    const days = hours / 24
    return days === 1 ? '1 hari' : `${days} hari`
  }
  if (hours === 0) return `${mins} menit`
  if (mins === 0) return `${hours} jam`
  return `${hours} jam ${mins} menit`
}

function normalizeMilkReminderSettings(
  raw: Record<string, unknown> | null | undefined
): MilkReminderSettings {
  const base = raw ?? {}
  const warnBeforeMinutes =
    typeof base.warnBeforeMinutes === 'number'
      ? clampMilkWarnMinutes(base.warnBeforeMinutes)
      : typeof base.warnBeforeHours === 'number'
        ? clampMilkWarnMinutes(Math.round(base.warnBeforeHours * 60))
        : MILK_REMINDER_DEFAULTS.warnBeforeMinutes

  return {
    enabled:
      typeof base.enabled === 'boolean'
        ? base.enabled
        : MILK_REMINDER_DEFAULTS.enabled,
    warnBeforeMinutes,
  }
}

export function parseMilkReminderSettings(raw: unknown): MilkReminderSettings {
  if (!raw || typeof raw !== 'object') return MILK_REMINDER_DEFAULTS
  return normalizeMilkReminderSettings(raw as Record<string, unknown>)
}

export function milkReminderSettingsToJson(
  settings: MilkReminderSettings
): Record<string, unknown> {
  return {
    enabled: settings.enabled,
    warnBeforeMinutes: settings.warnBeforeMinutes,
  }
}

export function getMilkReminderSettings(): MilkReminderSettings {
  if (typeof window === 'undefined') return MILK_REMINDER_DEFAULTS
  try {
    const raw = localStorage.getItem(MILK_REMINDER_KEY)
    return raw
      ? normalizeMilkReminderSettings(JSON.parse(raw))
      : MILK_REMINDER_DEFAULTS
  } catch {
    return MILK_REMINDER_DEFAULTS
  }
}

export function setMilkReminderSettings(
  patch: Partial<MilkReminderSettings>
): MilkReminderSettings {
  const next = normalizeMilkReminderSettings({
    ...getMilkReminderSettings(),
    ...patch,
  })
  localStorage.setItem(MILK_REMINDER_KEY, JSON.stringify(next))
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('milk-reminder-settings-changed'))
  }
  return next
}

export function getMilkWarnBeforeMs(settings = getMilkReminderSettings()): number {
  return settings.warnBeforeMinutes * 60 * 1000
}

export type SlotReminderInput = {
  warn_before_minutes?: number | null
}

export function resolveSlotReminder(
  slot: SlotReminderInput,
  global: MilkReminderSettings = getMilkReminderSettings()
): { enabled: boolean; warnBeforeMinutes: number } {
  return {
    enabled: global.enabled,
    warnBeforeMinutes: clampMilkWarnMinutes(
      slot.warn_before_minutes ?? DEFAULT_MILK_WARN_MINUTES
    ),
  }
}

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

export function getSlotMilkExpiryStatus(
  slot: SlotReminderInput & { expires_at?: string | null },
  now = Date.now(),
  global?: MilkReminderSettings
): MilkExpiryStatus {
  if (!slot.expires_at) return 'none'
  const exp = new Date(slot.expires_at).getTime()
  if (Number.isNaN(exp)) return 'none'
  if (exp <= now) return 'expired'
  const resolved = resolveSlotReminder(slot, global)
  if (!resolved.enabled) return 'ok'
  const warnMs = resolved.warnBeforeMinutes * 60 * 1000
  if (exp - now <= warnMs) return 'soon'
  return 'ok'
}

export function getMilkExpiryStatus(
  expiresAt: string | null | undefined,
  now = Date.now(),
  warnMinutes = getMilkReminderSettings().warnBeforeMinutes
): MilkExpiryStatus {
  return getSlotMilkExpiryStatus(
    {
      expires_at: expiresAt,
      warn_before_minutes: warnMinutes,
    },
    now
  )
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
