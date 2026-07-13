/** Indonesia Western Time — fixed UTC+7 (no DST). */
const WIB_OFFSET_MS = 7 * 60 * 60 * 1000
const DAY_MS = 24 * 60 * 60 * 1000

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

/** Exclusive end of today in WIB (= start of tomorrow). */
export function endOfTodayWib(now = new Date()) {
  return new Date(startOfTodayWib(now).getTime() + DAY_MS)
}

/** Midnight of a YYYY-MM-DD (WIB calendar day) as UTC Date. */
export function startOfDayKeyWib(dayKey: string) {
  const [y, m, d] = dayKey.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d) - WIB_OFFSET_MS)
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

/**
 * Minutes of [rangeStart, rangeEnd) that fall inside [windowStart, windowEnd).
 * Always >= 0; inverted ranges yield 0.
 */
export function minutesOverlap(
  rangeStart: Date,
  rangeEnd: Date,
  windowStart: Date,
  windowEnd: Date
): number {
  const from = Math.max(rangeStart.getTime(), windowStart.getTime())
  const to = Math.min(rangeEnd.getTime(), windowEnd.getTime())
  if (!(to > from)) return 0
  return Math.round((to - from) / 60000)
}

/**
 * Distribute a time range across WIB calendar days.
 * Yields { dayKey, minutes } for each day with overlap (> 0).
 */
export function* distributeMinutesByDayWib(
  rangeStart: Date,
  rangeEnd: Date
): Generator<{ dayKey: string; minutes: number }> {
  let cursor = rangeStart.getTime()
  const end = rangeEnd.getTime()
  if (!(end > cursor)) return

  while (cursor < end) {
    const dayKey = dayKeyWib(new Date(cursor))
    const dayStart = startOfDayKeyWib(dayKey).getTime()
    const dayEnd = dayStart + DAY_MS
    const portionEnd = Math.min(end, dayEnd)
    const minutes = Math.round((portionEnd - cursor) / 60000)
    if (minutes > 0) yield { dayKey, minutes }
    cursor = portionEnd
  }
}

/** Prisma filter: sessions that overlap [windowStart, windowEnd). */
export function sessionOverlapsWindow(
  windowStart: Date,
  windowEnd: Date,
  activeLookbackMs = 3 * DAY_MS
) {
  const activeSince = new Date(windowStart.getTime() - activeLookbackMs)
  return {
    timestampStart: { lt: windowEnd },
    OR: [
      { timestampEnd: { gt: windowStart } },
      { timestampEnd: null, timestampStart: { gte: activeSince } },
    ],
  }
}
