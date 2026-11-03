const KEY = 'baby_tracker_quick_actions'
export const QUICK_ACTIONS_EVENT = 'aira-quick-actions'

export type QuickActionId =
  | 'pup'
  | 'pee'
  | 'change'
  | 'feed'
  | 'pumping'
  | 'sleep'
  | 'note'
  | 'event'
  | 'immunization'
  | 'history'
  | 'milestone'

export const QUICK_ACTION_OPTIONS: {
  id: QuickActionId
  label: string
  emoji: string
}[] = [
  { id: 'pup', label: 'Pup', emoji: '💩' },
  { id: 'pee', label: 'Pee', emoji: '💧' },
  { id: 'change', label: 'Popok', emoji: '🩲' },
  { id: 'feed', label: 'Susu', emoji: '🍼' },
  { id: 'pumping', label: 'Pumping', emoji: '🥛' },
  { id: 'sleep', label: 'Tidur', emoji: '😴' },
  { id: 'note', label: 'Note', emoji: '📝' },
  { id: 'event', label: 'Event', emoji: '📅' },
  { id: 'immunization', label: 'Imunisasi', emoji: '💉' },
  { id: 'history', label: 'Riwayat', emoji: '🕐' },
  { id: 'milestone', label: 'Milestone', emoji: '🏆' },
]

export type QuickActionPrefs = {
  enabled: Record<QuickActionId, boolean>
}

function defaultEnabled(): Record<QuickActionId, boolean> {
  return {
    pup: true,
    pee: true,
    change: true,
    feed: true,
    pumping: true,
    sleep: true,
    note: true,
    event: true,
    immunization: true,
    history: true,
    milestone: true,
  }
}

function normalizeQuickActionPrefs(raw: unknown): QuickActionPrefs {
  const enabled = defaultEnabled()
  if (!raw || typeof raw !== 'object') return { enabled }
  const obj = raw as { enabled?: unknown }
  if (obj.enabled && typeof obj.enabled === 'object') {
    const flags = obj.enabled as Record<string, unknown>
    for (const option of QUICK_ACTION_OPTIONS) {
      if (typeof flags[option.id] === 'boolean') enabled[option.id] = flags[option.id]
    }
  }
  return { enabled }
}

export function getQuickActionPrefs(): QuickActionPrefs {
  if (typeof window === 'undefined') return { enabled: defaultEnabled() }
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { enabled: defaultEnabled() }
    return normalizeQuickActionPrefs(JSON.parse(raw))
  } catch {
    return { enabled: defaultEnabled() }
  }
}

export function setQuickActionPrefs(patch: {
  enabled?: Partial<Record<QuickActionId, boolean>>
}): QuickActionPrefs {
  const current = getQuickActionPrefs()
  const next = normalizeQuickActionPrefs({
    enabled: { ...current.enabled, ...patch.enabled },
  })
  localStorage.setItem(KEY, JSON.stringify(next))
  window.dispatchEvent(new Event(QUICK_ACTIONS_EVENT))
  return next
}

const MAX_X = 146
const MIN_LIFT = 76

function arcPoints(count: number, radius: number, spreadDeg: number) {
  if (count <= 0) return []
  if (count === 1) return [{ x: 0, y: -Math.round(radius) }]
  const start = 90 + spreadDeg / 2
  const step = spreadDeg / (count - 1)
  return Array.from({ length: count }, (_, index) => {
    const rad = ((start - step * index) * Math.PI) / 180
    return {
      x: Math.round(Math.cos(rad) * radius),
      y: Math.round(-Math.sin(rad) * radius),
    }
  })
}

function arcRadius(count: number, spreadDeg: number, gap: number) {
  if (count <= 1) return 118
  const step = ((spreadDeg / (count - 1)) * Math.PI) / 180
  const outer = ((90 + spreadDeg / 2) * Math.PI) / 180
  const forGap = gap / (2 * Math.sin(step / 2))
  const forLift = MIN_LIFT / Math.sin(outer)
  const forWidth = MAX_X / Math.abs(Math.cos(outer))
  return Math.min(Math.max(forGap, forLift, 96), forWidth)
}

function pointsFit(points: { x: number; y: number }[], gap: number) {
  for (let i = 0; i < points.length; i += 1) {
    if (Math.abs(points[i].x) > MAX_X + 8) return false
    if (points[i].y > -MIN_LIFT + 6) return false
    for (let j = i + 1; j < points.length; j += 1) {
      if (Math.hypot(points[i].x - points[j].x, points[i].y - points[j].y) < gap - 2) return false
    }
  }
  return true
}

function singleArc(count: number, gap: number) {
  let best: { x: number; y: number }[] | null = null
  let bestRadius = Infinity
  for (let spread = 72; spread <= 146; spread += 2) {
    const radius = arcRadius(count, spread, gap)
    if (radius > 176) continue
    const points = arcPoints(count, radius, spread)
    if (pointsFit(points, gap) && radius < bestRadius) {
      best = points
      bestRadius = radius
    }
  }
  return best
}

function twoRings(count: number, orb: number) {
  const outerCount = Math.ceil(count / 2)
  const innerCount = count - outerCount
  const innerRadius = innerCount >= 4 ? 128 : 108
  const outerRadius = innerRadius + orb + 12
  const outerSpread = 96
  const outer = arcPoints(outerCount, outerRadius, outerSpread)
  const innerSpread = innerCount <= 1 ? 0 : innerCount === 2 ? 62 : innerCount === 3 ? 78 : 92
  return [...outer, ...arcPoints(innerCount, innerRadius, innerSpread)]
}

/** Slots follow however many actions are on. y is upward from the + button. */
export function quickMenuSlots(count: number): { x: number; y: number; disc: number; orb: number }[] {
  const n = Math.max(0, Math.min(QUICK_ACTION_OPTIONS.length, Math.floor(count)))
  if (n === 0) return []
  const orb = n <= 5 ? 64 : 56
  const gap = orb + 10
  const points = singleArc(n, gap) ?? twoRings(n, orb)
  const reach = points.reduce((max, point) => Math.max(max, Math.hypot(point.x, point.y)), 0)
  const disc = Math.round((reach + orb / 2 + 18) * 2)
  return points.map((point) => ({ ...point, disc, orb }))
}

/** Actions switched on, in catalog order. */
export function visibleQuickActionIds(prefs: QuickActionPrefs): QuickActionId[] {
  return QUICK_ACTION_OPTIONS.filter((option) => prefs.enabled[option.id]).map((option) => option.id)
}
