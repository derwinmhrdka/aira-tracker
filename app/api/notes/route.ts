import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, parseLoggedBy } from '@/lib/api-helpers'

export async function GET(request: NextRequest) {
  return withAuth(async () => {
    const limit = Math.min(
      50,
      Math.max(1, Number(request.nextUrl.searchParams.get('limit') || '20'))
    )
    const cursor = request.nextUrl.searchParams.get('cursor')
    const before = cursor ? new Date(cursor) : undefined

    const notes = await prisma.dailyNote.findMany({
      where: before ? { timestamp: { lt: before } } : undefined,
      orderBy: { timestamp: 'desc' },
      take: limit + 1,
    })

    const hasMore = notes.length > limit
    const items = notes.slice(0, limit)

    return NextResponse.json({
      items: items.map((n) => ({
        id: n.id,
        timestamp: n.timestamp.toISOString(),
        content: n.content,
        photo_url: n.photoUrl,
        audio_url: n.audioUrl,
        logged_by: n.loggedBy,
      })),
      hasMore,
      nextCursor:
        hasMore && items.length > 0
          ? items[items.length - 1].timestamp.toISOString()
          : null,
    })
  })
}

export async function POST(request: NextRequest) {
  return withAuth(async (sessionLoggedBy) => {
    const body = await request.json()

    const hasContent =
      typeof body.content === 'string' && body.content.trim().length > 0
    const hasAudio =
      typeof body.audio_url === 'string' && body.audio_url.length > 0

    if (!hasContent && !hasAudio) {
      return NextResponse.json(
        { error: 'content or audio_url is required' },
        { status: 400 }
      )
    }

    const loggedBy = parseLoggedBy(body.logged_by) ?? sessionLoggedBy

    const note = await prisma.dailyNote.create({
      data: {
        content: hasContent ? body.content.trim() : '🎤 Catatan suara',
        photoUrl: body.photo_url ?? null,
        audioUrl: body.audio_url ?? null,
        loggedBy: loggedBy ?? null,
      },
    })

    return NextResponse.json({
      id: note.id,
      timestamp: note.timestamp.toISOString(),
      content: note.content,
    })
  })
}
