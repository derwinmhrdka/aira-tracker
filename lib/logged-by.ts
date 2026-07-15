import type { LoggedBy } from '@/lib/types'

export const LOGGED_BY_OPTIONS: {
  value: LoggedBy
  icon: string
  label: string
}[] = [
  { value: 'AYAH', icon: '👨', label: 'Ayah' },
  { value: 'IBU', icon: '👩', label: 'Ibu' },
  { value: 'PENGASUH', icon: '🧑‍🍼', label: 'Pengasuh' },
]

export const LOGGED_BY_EMOJI: Record<LoggedBy, string> = {
  AYAH: '👨',
  IBU: '👩',
  PENGASUH: '🧑‍🍼',
}

export function loggedByEmoji(value: string | null | undefined): string | null {
  if (!value) return null
  if (value === 'AYAH' || value === 'IBU' || value === 'PENGASUH') {
    return LOGGED_BY_EMOJI[value]
  }
  return null
}
