export const HOME_VISIBILITY_SETTING_KEY = 'home_visibility'

export type HomeVisibilityKey =
  | 'babyInfo'
  | 'leap'
  | 'nextEvent'
  | 'monitoring'
  | 'insights'
  | 'milkStorage'

export type HomeVisibility = Record<HomeVisibilityKey, boolean>

export const HOME_VISIBILITY_DEFAULTS: HomeVisibility = {
  babyInfo: true,
  leap: true,
  nextEvent: true,
  monitoring: true,
  insights: true,
  milkStorage: true,
}

export const HOME_VISIBILITY_KEYS = Object.keys(
  HOME_VISIBILITY_DEFAULTS
) as HomeVisibilityKey[]

export const HOME_VISIBILITY_OPTIONS: {
  key: HomeVisibilityKey
  label: string
}[] = [
  { key: 'babyInfo', label: 'Kartu bayi' },
  { key: 'leap', label: 'Leap' },
  { key: 'nextEvent', label: 'Event berikutnya' },
  { key: 'monitoring', label: 'Monitoring sesi' },
  { key: 'insights', label: 'Insights hari ini' },
  { key: 'milkStorage', label: 'Milk Storage' },
]

export function normalizeHomeVisibility(
  raw: unknown
): HomeVisibility {
  const base = { ...HOME_VISIBILITY_DEFAULTS }
  if (!raw || typeof raw !== 'object') return base
  const obj = raw as Record<string, unknown>
  for (const key of HOME_VISIBILITY_KEYS) {
    if (typeof obj[key] === 'boolean') base[key] = obj[key]
  }
  return base
}
