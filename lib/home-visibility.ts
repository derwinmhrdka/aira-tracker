const LOCAL_KEY = 'baby_tracker_home_visibility'
export const HOME_VISIBILITY_SETTING_KEY = 'home_visibility'

export type HomeVisibilityKey =
  | 'babyInfo'
  | 'mood'
  | 'leap'
  | 'nextEvent'
  | 'monitoring'
  | 'insights'
  | 'quickActions'
  | 'milkStorage'

export type HomeVisibility = Record<HomeVisibilityKey, boolean>

export const HOME_VISIBILITY_DEFAULTS: HomeVisibility = {
  babyInfo: true,
  mood: true,
  leap: true,
  nextEvent: true,
  monitoring: true,
  insights: true,
  quickActions: true,
  milkStorage: true,
}

export const HOME_VISIBILITY_KEYS = Object.keys(
  HOME_VISIBILITY_DEFAULTS
) as HomeVisibilityKey[]

export const HOME_VISIBILITY_OPTIONS: {
  key: HomeVisibilityKey
  label: string
  hint: string
}[] = [
  { key: 'babyInfo', label: 'Kartu bayi', hint: 'Nama, usia, vaksin' },
  { key: 'mood', label: 'Mood', hint: 'Widget mood di kartu bayi' },
  { key: 'leap', label: 'Leap', hint: 'Badge di animasi' },
  { key: 'nextEvent', label: 'Event berikutnya', hint: 'Badge jadwal di animasi' },
  {
    key: 'monitoring',
    label: 'Monitoring sesi',
    hint: 'Timer menyusui & tidur aktif',
  },
  { key: 'insights', label: 'Insights hari ini', hint: 'Total susu & tidur' },
  { key: 'quickActions', label: 'Quick Action', hint: 'Tombol log cepat' },
  { key: 'milkStorage', label: 'Milk Storage', hint: 'Stok ASI di botol' },
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

/** Terlihat hanya jika On di global DAN lokal. */
export function mergeHomeVisibility(
  globalVis: HomeVisibility,
  localVis: HomeVisibility
): HomeVisibility {
  const result = { ...HOME_VISIBILITY_DEFAULTS }
  for (const key of HOME_VISIBILITY_KEYS) {
    result[key] = globalVis[key] !== false && localVis[key] !== false
  }
  return result
}

export function getLocalHomeVisibility(): HomeVisibility {
  if (typeof window === 'undefined') return { ...HOME_VISIBILITY_DEFAULTS }
  try {
    const raw = localStorage.getItem(LOCAL_KEY)
    if (!raw) return { ...HOME_VISIBILITY_DEFAULTS }
    return normalizeHomeVisibility(JSON.parse(raw))
  } catch {
    return { ...HOME_VISIBILITY_DEFAULTS }
  }
}

export function setLocalHomeVisibility(
  patch: Partial<HomeVisibility>
): HomeVisibility {
  const next = { ...getLocalHomeVisibility(), ...patch }
  localStorage.setItem(LOCAL_KEY, JSON.stringify(next))
  return next
}
