export type FeedTypeValue = 'DIRECT' | 'PUMPED' | 'FORMULA'

export const FEED_TYPE_OPTIONS: { value: FeedTypeValue; label: string }[] = [
  { value: 'DIRECT', label: 'ASI' },
  { value: 'PUMPED', label: 'Perah' },
  { value: 'FORMULA', label: 'Formula' },
]

export function parseFeedType(value: unknown): FeedTypeValue | undefined {
  if (value === 'DIRECT' || value === 'direct') return 'DIRECT'
  if (value === 'PUMPED' || value === 'pumped') return 'PUMPED'
  if (value === 'FORMULA' || value === 'formula') return 'FORMULA'
  return undefined
}

export function feedTypeLabel(value: string | null | undefined): string | null {
  if (!value) return null
  return FEED_TYPE_OPTIONS.find((o) => o.value === value)?.label ?? null
}
