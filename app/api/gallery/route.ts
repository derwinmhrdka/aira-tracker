import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-helpers'

type GallerySource = 'note' | 'milestone'

function milestoneTimestamp(date: Date) {
  const d = new Date(date)
  d.setUTCHours(12, 0, 0, 0)
  return d
}

export async function GET(request: NextRequest) {
  return withAuth(async () => {
    const limit = Math.min(
      50,
      Math.max(1, Number(request.nextUrl.searchParams.get('limit') || '30'))
    )
    const offset = Math.max(0, Number(request.nextUrl.searchParams.get('offset') || '0'))

    const [notes, milestones] = await Promise.all([
      prisma.dailyNote.findMany({
        where: { photoUrl: { not: null } },
        orderBy: { timestamp: 'desc' },
      }),
      prisma.milestone.findMany({
        where: { photoUrl: { not: null } },
        orderBy: { date: 'desc' },
      }),
    ])

    const merged = [
      ...notes.map((n) => ({
        id: n.id,
        source: 'note' as GallerySource,
        photo_url: n.photoUrl!,
        caption: n.content,
        timestamp: n.timestamp.toISOString(),
        logged_by: n.loggedBy,
      })),
      ...milestones.map((m) => ({
        id: m.id,
        source: 'milestone' as GallerySource,
        photo_url: m.photoUrl!,
        caption: m.description?.trim()
          ? `${m.title} — ${m.description.trim()}`
          : m.title,
        timestamp: milestoneTimestamp(m.date).toISOString(),
        logged_by: null,
      })),
    ].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )

    const items = merged.slice(offset, offset + limit)
    const nextOffset = offset + limit < merged.length ? offset + limit : null

    return NextResponse.json({
      items,
      total: merged.length,
      hasMore: nextOffset !== null,
      nextOffset,
    })
  })
}
