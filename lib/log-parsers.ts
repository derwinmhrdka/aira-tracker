import type { DiaperType, FeedSide } from '@prisma/client'
import { parseFeedType } from '@/lib/feed-utils'

export function parseDiaperType(value: unknown): DiaperType | undefined {
  if (value === 'pup' || value === 'PUP') return 'PUP'
  if (value === 'pee' || value === 'PIPIS') return 'PIPIS'
  if (value === 'both' || value === 'KEDUANYA') return 'KEDUANYA'
  return undefined
}

export function parseFeedSide(value: unknown): FeedSide | undefined {
  if (value === 'LEFT' || value === 'left') return 'LEFT'
  if (value === 'RIGHT' || value === 'right') return 'RIGHT'
  if (value === 'BOTH' || value === 'both') return 'BOTH'
  return undefined
}

export { parseFeedType }

export function diaperTypeToClient(type: DiaperType): 'pup' | 'pee' | 'both' {
  if (type === 'PUP') return 'pup'
  if (type === 'PIPIS') return 'pee'
  return 'both'
}

export function diaperEventCounts(type: DiaperType): { pup: number; pee: number } {
  if (type === 'PUP') return { pup: 1, pee: 0 }
  if (type === 'PIPIS') return { pup: 0, pee: 1 }
  return { pup: 1, pee: 1 }
}
