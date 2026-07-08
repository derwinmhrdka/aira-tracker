import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-helpers'
import { feedTypeLabel } from '@/lib/feed-utils'

const DEFAULT_LIMIT = 15
const MAX_LIMIT = 50

type HistoryRow = {
  id: string
  category: 'diaper' | 'feeding' | 'sleep' | 'note'
  type: string
  timestamp: string
  timestampEnd?: string | null
  details?: string | null
  loggedBy?: string | null
  diaper_type?: 'pup' | 'pee' | 'both'
  side?: string | null
  feed_type?: string | null
  amount_ml?: number | null
  notes?: string | null
  content?: string | null
  photo_url?: string | null
  audio_url?: string | null
}

function mapDiaper(l: {
  id: string
  type: string
  timestamp: Date
  notes: string | null
  loggedBy: string | null
}): HistoryRow {
  const type = l.type === 'PUP' ? 'pup' : l.type === 'PIPIS' ? 'pee' : 'both'
  return {
    id: l.id,
    category: 'diaper',
    type,
    timestamp: l.timestamp.toISOString(),
    details: l.notes,
    loggedBy: l.loggedBy,
    diaper_type: type,
    notes: l.notes,
  }
}

function mapFeeding(l: {
  id: string
  timestampStart: Date
  timestampEnd: Date | null
  side: string | null
  feedType: string | null
  amountMl: number | null
  notes: string | null
  loggedBy: string | null
}): HistoryRow {
  const typeLabel = feedTypeLabel(l.feedType)
  return {
    id: l.id,
    category: 'feeding',
    type: l.timestampEnd ? 'feed-end' : 'feed',
    timestamp: l.timestampStart.toISOString(),
    timestampEnd: l.timestampEnd?.toISOString() ?? null,
    side: l.side,
    feed_type: l.feedType,
    amount_ml: l.amountMl,
    notes: l.notes,
    details:
      [typeLabel, l.side && `Sisi: ${l.side}`, l.amountMl && `${l.amountMl}ml`, l.notes]
        .filter(Boolean)
        .join(' · ') || null,
    loggedBy: l.loggedBy,
  }
}

function mapSleep(l: {
  id: string
  timestampStart: Date
  timestampEnd: Date | null
  notes: string | null
  loggedBy: string | null
}): HistoryRow {
  return {
    id: l.id,
    category: 'sleep',
    type: l.timestampEnd ? 'wake' : 'sleep',
    timestamp: l.timestampStart.toISOString(),
    timestampEnd: l.timestampEnd?.toISOString() ?? null,
    notes: l.notes,
    details: l.notes,
    loggedBy: l.loggedBy,
  }
}

function mapNote(n: {
  id: string
  timestamp: Date
  content: string
  photoUrl: string | null
  audioUrl: string | null
  loggedBy: string | null
}): HistoryRow {
  return {
    id: n.id,
    category: 'note',
    type: 'note',
    timestamp: n.timestamp.toISOString(),
    content: n.content,
    details: n.content,
    photo_url: n.photoUrl,
    audio_url: n.audioUrl,
    loggedBy: n.loggedBy,
  }
}

export async function GET(request: NextRequest) {
  return withAuth(async () => {
    const days = Number(request.nextUrl.searchParams.get('days') || '7')
    const category = request.nextUrl.searchParams.get('category')
    const limit = Math.min(
      Math.max(1, Number(request.nextUrl.searchParams.get('limit') || DEFAULT_LIMIT)),
      MAX_LIMIT
    )
    const cursor = request.nextUrl.searchParams.get('cursor')
    const before = cursor ? new Date(cursor) : undefined

    const since = new Date()
    since.setDate(since.getDate() - days)
    since.setHours(0, 0, 0, 0)

    const range = before ? { gte: since, lt: before } : { gte: since }
    const fetchN = limit + 1

    const includeDiaper = !category || category === 'diaper'
    const includeFeeding = !category || category === 'feeding'
    const includeSleep = !category || category === 'sleep'
    const includeNote = !category || category === 'note'

    const [diaperLogs, feedingLogs, sleepLogs, notes] = await Promise.all([
      includeDiaper
        ? prisma.diaperLog.findMany({
            where: { timestamp: range },
            orderBy: { timestamp: 'desc' },
            take: fetchN,
          })
        : [],
      includeFeeding
        ? prisma.feedingLog.findMany({
            where: { timestampStart: range },
            orderBy: { timestampStart: 'desc' },
            take: fetchN,
          })
        : [],
      includeSleep
        ? prisma.sleepLog.findMany({
            where: { timestampStart: range },
            orderBy: { timestampStart: 'desc' },
            take: fetchN,
          })
        : [],
      includeNote
        ? prisma.dailyNote.findMany({
            where: { timestamp: range },
            orderBy: { timestamp: 'desc' },
            take: fetchN,
          })
        : [],
    ])

    const merged = [
      ...diaperLogs.map(mapDiaper),
      ...feedingLogs.map(mapFeeding),
      ...sleepLogs.map(mapSleep),
      ...notes.map(mapNote),
    ].sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )

    const hasMore =
      merged.length > limit ||
      diaperLogs.length === fetchN ||
      feedingLogs.length === fetchN ||
      sleepLogs.length === fetchN ||
      notes.length === fetchN

    const items = merged.slice(0, limit)
    const nextCursor =
      hasMore && items.length > 0 ? items[items.length - 1].timestamp : null

    return NextResponse.json({ items, hasMore, nextCursor, nextOffset: null })
  })
}
