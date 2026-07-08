import type { DiaperType, FeedSide } from '@prisma/client'
import { parseFeedType } from '@/lib/feed-utils'

export function parseDiaperType(value: unknown): DiaperType | undefined {
  if (value === 'pup' || value === 'PUP') return 'PUP'
  if (value === 'pee' || value === 'PIPIS') return 'PIPIS'
  if (value === 'both' || value === 'KEDUANYA') return 'KEDUANYA'
  if (value === 'change' || value === 'ganti' || value === 'GANTI') {
    return 'GANTI' as DiaperType
  }
  return undefined
}

export function parseFeedSide(value: unknown): FeedSide | undefined {
  if (value === 'LEFT' || value === 'left') return 'LEFT'
  if (value === 'RIGHT' || value === 'right') return 'RIGHT'
  if (value === 'BOTH' || value === 'both') return 'BOTH'
  return undefined
}

export { parseFeedType }

export function diaperTypeToClient(type: DiaperType): 'pup' | 'pee' | 'both' | 'change' {
  if (type === 'PUP') return 'pup'
  if (type === 'PIPIS') return 'pee'
  if (String(type) === 'GANTI') return 'change'
  return 'both'
}

export function diaperEventCounts(type: DiaperType | string): { pup: number; pee: number } {
  const normalized = String(type).toUpperCase()
  if (normalized === 'PUP') return { pup: 1, pee: 0 }
  if (normalized === 'PIPIS' || normalized === 'PEE') return { pup: 0, pee: 1 }
  if (normalized === 'GANTI' || normalized === 'CHANGE' || normalized === 'GANTI_POPOK') {
    return { pup: 0, pee: 0 }
  }
  if (normalized === 'KEDUANYA' || normalized === 'BOTH' || normalized === 'PUPEE') {
    return { pup: 1, pee: 1 }
  }
  return { pup: 0, pee: 0 }
}
