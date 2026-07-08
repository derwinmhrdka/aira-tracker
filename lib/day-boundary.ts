/** Indonesia Western Time — fixed UTC+7 (no DST). */
const WIB_OFFSET_MS = 7 * 60 * 60 * 1000

function shiftToWib(date: Date) {
  return new Date(date.getTime() + WIB_OFFSET_MS)
}

/** Midnight today in WIB, returned as UTC `Date` for DB comparisons. */
export function startOfTodayWib(now = new Date()) {
  const wib = shiftToWib(now)
  const y = wib.getUTCFullYear()
  const m = wib.getUTCMonth()
  const d = wib.getUTCDate()
  return new Date(Date.UTC(y, m, d) - WIB_OFFSET_MS)
}

/** Calendar date key (YYYY-MM-DD) in WIB. */
export function dayKeyWib(date: Date) {
  const wib = shiftToWib(date)
  const y = wib.getUTCFullYear()
  const m = String(wib.getUTCMonth() + 1).padStart(2, '0')
  const d = String(wib.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Start of a stats period (last N calendar days incl. today) in WIB. */
export function periodStartWib(days: number, now = new Date()) {
  const today = startOfTodayWib(now)
  const start = new Date(today)
  start.setUTCDate(start.getUTCDate() - days + 1)
  return start
}
