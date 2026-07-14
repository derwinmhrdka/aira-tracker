import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-helpers'
import { feedTypeLabel } from '@/lib/feed-utils'
import { periodStartWib } from '@/lib/day-boundary'

const DEFAULT_LIMIT = 15
const MAX_LIMIT = 50

type HistoryCategory = 'diaper' | 'feeding' | 'sleep' | 'note'

type HistoryRow = {
  id: string
  category: HistoryCategory
  type: string
  timestamp: string
  timestampEnd?: string | null
  details?: string | null
  loggedBy?: string | null
  diaper_type?: 'pup' | 'pee' | 'both' | 'change'
  side?: string | null
  feed_type?: string | null
  amount_ml?: number | null
  notes?: string | null
  content?: string | null
  photo_url?: string | null
  audio_url?: string | null
}

type Cursor = { t: string; c: HistoryCategory | ''; id: string }

function encodeCursor(item: HistoryRow): string {
  return Buffer.from(
    JSON.stringify({ t: item.timestamp, c: item.category, id: item.id }),
    'utf8'
  ).toString('base64url')
}

function decodeCursor(raw: string): Cursor | null {
  try {
    const parsed = JSON.parse(
      Buffer.from(raw, 'base64url').toString('utf8')
    ) as Cursor
    if (parsed?.t && typeof parsed.c === 'string' && parsed.id) return parsed
  } catch {
    // fall through — older clients sent a plain ISO timestamp
  }
  const d = new Date(raw)
  if (!Number.isNaN(d.getTime())) {
    // Strict older-than timestamp only (avoids same-ms duplicates replay)
    return { t: d.toISOString(), c: '', id: '' }
  }
  return null
}

/** Prisma filter for one table after a composite cursor (timestamp DESC, category DESC, id DESC). */
function afterCursorWhere(
  tableCategory: HistoryCategory,
  since: Date,
  cursor: Cursor | null,
  timeField: 'timestamp' | 'timestampStart'
) {
  const base = { [timeField]: { gte: since } }
  if (!cursor) return base

  const cursorDate = new Date(cursor.t)
  const sameTsClause =
    tableCategory < cursor.c
      ? { [timeField]: cursorDate }
      : tableCategory === cursor.c
        ? { AND: [{ [timeField]: cursorDate }, { id: { lt: cursor.id } }] }
        : null

  return {
    AND: [
      base,
      {
        OR: [
          { [timeField]: { lt: cursorDate } },
          ...(sameTsClause ? [sameTsClause] : []),
        ],
      },
    ],
  }
}

function compareRows(a: HistoryRow, b: HistoryRow) {
  const dt =
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  if (dt !== 0) return dt
  const cat = b.category.localeCompare(a.category)
  if (cat !== 0) return cat
  return b.id.localeCompare(a.id)
}

function mapDiaper(l: {
  id: string
  type: string
  timestamp: Date
  notes: string | null
  loggedBy: string | null
}): HistoryRow {
  const type =
    l.type === 'PUP'
      ? 'pup'
      : l.type === 'PIPIS'
        ? 'pee'
        : l.type === 'GANTI'
          ? 'change'
          : 'both'
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
    const days = Math.min(90, Math.max(1, Number(request.nextUrl.searchParams.get('days') || '7')))
    const category = request.nextUrl.searchParams.get('category') as
      | HistoryCategory
      | null
    const limit = Math.min(
      Math.max(1, Number(request.nextUrl.searchParams.get('limit') || DEFAULT_LIMIT)),
      MAX_LIMIT
    )
    const cursorRaw = request.nextUrl.searchParams.get('cursor')
    const cursor = cursorRaw ? decodeCursor(cursorRaw) : null
    const since = periodStartWib(days)
    // +1 so we can detect hasMore after merge without unreliable per-table flags
    const take = limit + 1

    const includeDiaper = !category || category === 'diaper'
    const includeFeeding = !category || category === 'feeding'
    const includeSleep = !category || category === 'sleep'
    const includeNote = !category || category === 'note'

    const [diaperLogs, feedingLogs, sleepLogs, notes] = await Promise.all([
      includeDiaper
        ? prisma.diaperLog.findMany({
            where: afterCursorWhere('diaper', since, cursor, 'timestamp'),
            orderBy: [{ timestamp: 'desc' }, { id: 'desc' }],
            take,
            select: {
              id: true,
              type: true,
              timestamp: true,
              notes: true,
              loggedBy: true,
            },
          })
        : Promise.resolve([]),
      includeFeeding
        ? prisma.feedingLog.findMany({
            where: afterCursorWhere('feeding', since, cursor, 'timestampStart'),
            orderBy: [{ timestampStart: 'desc' }, { id: 'desc' }],
            take,
            select: {
              id: true,
              timestampStart: true,
              timestampEnd: true,
              side: true,
              feedType: true,
              amountMl: true,
              notes: true,
              loggedBy: true,
            },
          })
        : Promise.resolve([]),
      includeSleep
        ? prisma.sleepLog.findMany({
            where: afterCursorWhere('sleep', since, cursor, 'timestampStart'),
            orderBy: [{ timestampStart: 'desc' }, { id: 'desc' }],
            take,
            select: {
              id: true,
              timestampStart: true,
              timestampEnd: true,
              notes: true,
              loggedBy: true,
            },
          })
        : Promise.resolve([]),
      includeNote
        ? prisma.dailyNote.findMany({
            where: afterCursorWhere('note', since, cursor, 'timestamp'),
            orderBy: [{ timestamp: 'desc' }, { id: 'desc' }],
            take,
            select: {
              id: true,
              timestamp: true,
              content: true,
              photoUrl: true,
              audioUrl: true,
              loggedBy: true,
            },
          })
        : Promise.resolve([]),
    ])

    const merged = [
      ...diaperLogs.map(mapDiaper),
      ...feedingLogs.map(mapFeeding),
      ...sleepLogs.map(mapSleep),
      ...notes.map(mapNote),
    ].sort(compareRows)

    const hasMore = merged.length > limit
    const items = merged.slice(0, limit)
    const nextCursor =
      hasMore && items.length > 0 ? encodeCursor(items[items.length - 1]) : null

    return NextResponse.json({ items, hasMore, nextCursor, nextOffset: null })
  })
}
