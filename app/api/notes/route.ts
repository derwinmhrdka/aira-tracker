import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, parseLoggedBy } from '@/lib/api-helpers'

export async function GET() {
  return withAuth(async () => {
    const notes = await prisma.dailyNote.findMany({
      orderBy: { timestamp: 'desc' },
      take: 50,
    })

    return NextResponse.json(
      notes.map((n) => ({
        id: n.id,
        timestamp: n.timestamp.toISOString(),
        content: n.content,
        photo_url: n.photoUrl,
        logged_by: n.loggedBy,
      }))
    )
  })
}

export async function POST(request: NextRequest) {
  return withAuth(async (sessionLoggedBy) => {
    const body = await request.json()

    if (!body.content || typeof body.content !== 'string') {
      return NextResponse.json({ error: 'content is required' }, { status: 400 })
    }

    const loggedBy = parseLoggedBy(body.logged_by) ?? sessionLoggedBy

    const note = await prisma.dailyNote.create({
      data: {
        content: body.content,
        photoUrl: body.photo_url ?? null,
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
