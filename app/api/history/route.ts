import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-helpers'
import { feedTypeLabel } from '@/lib/feed-utils'

const DEFAULT_LIMIT = 15
const MAX_LIMIT = 50

export async function GET(request: NextRequest) {
  return withAuth(async () => {
    const days = Number(request.nextUrl.searchParams.get('days') || '7')
    const category = request.nextUrl.searchParams.get('category')
    const limit = Math.min(
      Math.max(1, Number(request.nextUrl.searchParams.get('limit') || DEFAULT_LIMIT)),
      MAX_LIMIT
    )
    const offset = Math.max(0, Number(request.nextUrl.searchParams.get('offset') || '0'))
    const cursor = request.nextUrl.searchParams.get('cursor')
    const before = cursor ? new Date(cursor) : undefined

    const since = new Date()
    since.setDate(since.getDate() - days)
    since.setHours(0, 0, 0, 0)

    const range = before ? { gte: since, lt: before } : { gte: since }
    const includeDiaper = !category || category === 'diaper'
    const includeFeeding = !category || category === 'feeding'
    const includeSleep = !category || category === 'sleep'
    const includeNote = !category || category === 'note'
    const paginateSingleCategory = !!category

    const [diaperLogs, feedingLogs, sleepLogs, notes] = await Promise.all([
      includeDiaper
        ? prisma.diaperLog.findMany({
            where: { timestamp: paginateSingleCategory ? range : { gte: since } },
            orderBy: { timestamp: 'desc' },
            ...(paginateSingleCategory
              ? { take: limit + 1 }
              : {}),
          })
        : [],
      includeFeeding
        ? prisma.feedingLog.findMany({
            where: {
              timestampStart: paginateSingleCategory ? range : { gte: since },
            },
            orderBy: { timestampStart: 'desc' },
            ...(paginateSingleCategory
              ? { take: limit + 1 }
              : {}),
          })
        : [],
      includeSleep
        ? prisma.sleepLog.findMany({
            where: {
              timestampStart: paginateSingleCategory ? range : { gte: since },
            },
            orderBy: { timestampStart: 'desc' },
            ...(paginateSingleCategory
              ? { take: limit + 1 }
              : {}),
          })
        : [],
      includeNote
        ? prisma.dailyNote.findMany({
            where: { timestamp: paginateSingleCategory ? range : { gte: since } },
            orderBy: { timestamp: 'desc' },
            ...(paginateSingleCategory
              ? { take: limit + 1 }
              : {}),
          })
        : [],
    ])

    const merged = [
      ...diaperLogs.map((l) => ({
        id: l.id,
        category: 'diaper' as const,
        type: l.type === 'PUP' ? 'pup' : l.type === 'PIPIS' ? 'pee' : 'both',
        timestamp: l.timestamp.toISOString(),
        details: l.notes,
        loggedBy: l.loggedBy,
        diaper_type: l.type === 'PUP' ? 'pup' : l.type === 'PIPIS' ? 'pee' : 'both',
        notes: l.notes,
      })),
      ...feedingLogs.map((l) => {
        const typeLabel = feedTypeLabel(l.feedType)
        return {
          id: l.id,
          category: 'feeding' as const,
          type: l.timestampEnd ? 'feed-end' : 'feed',
          timestamp: l.timestampStart.toISOString(),
          timestampEnd: l.timestampEnd?.toISOString() ?? null,
          side: l.side,
          feed_type: l.feedType,
          amount_ml: l.amountMl,
          notes: l.notes,
          details:
            [
              typeLabel,
              l.side && `Sisi: ${l.side}`,
              l.amountMl && `${l.amountMl}ml`,
              l.notes,
            ]
              .filter(Boolean)
              .join(' · ') || null,
          loggedBy: l.loggedBy,
        }
      }),
      ...sleepLogs.map((l) => ({
        id: l.id,
        category: 'sleep' as const,
        type: l.timestampEnd ? 'wake' : 'sleep',
        timestamp: l.timestampStart.toISOString(),
        timestampEnd: l.timestampEnd?.toISOString() ?? null,
        notes: l.notes,
        details: l.notes,
        loggedBy: l.loggedBy,
      })),
      ...notes.map((n) => ({
        id: n.id,
        category: 'note' as const,
        type: 'note',
        timestamp: n.timestamp.toISOString(),
        content: n.content,
        details: n.content,
        photo_url: n.photoUrl,
        loggedBy: n.loggedBy,
      })),
    ].sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )

    let items = merged
    let hasMore = false
    let nextCursor: string | null = null
    let nextOffset: number | null = null

    if (paginateSingleCategory) {
      hasMore = merged.length > limit
      items = merged.slice(0, limit)
      nextCursor =
        hasMore && items.length > 0
          ? items[items.length - 1].timestamp
          : null
    } else {
      items = merged.slice(offset, offset + limit)
      hasMore = merged.length > offset + limit
      nextOffset = hasMore ? offset + limit : null
    }

    return NextResponse.json({ items, hasMore, nextCursor, nextOffset })
  })
}
