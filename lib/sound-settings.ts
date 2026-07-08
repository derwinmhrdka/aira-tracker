const KEY = 'baby_tracker_sound_enabled'

export function isSoundEnabled(): boolean {
  if (typeof window === 'undefined') return false
  try {
    const raw = localStorage.getItem(KEY)
    return raw === null ? false : raw === 'true'
  } catch {
    return false
  }
}

export function setSoundEnabled(enabled: boolean) {
  localStorage.setItem(KEY, String(enabled))
}
