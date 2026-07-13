import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-helpers'

const VALID_MOODS = new Set(['happy', 'calm', 'fussy', 'crying', 'sleepy'])

function formatMood(log: {
  id: string
  timestamp: Date
  mood: string
  loggedBy: string | null
}) {
  return {
    id: log.id,
    timestamp: log.timestamp.toISOString(),
    mood: log.mood,
    logged_by: log.loggedBy,
  }
}

export async function GET(request: NextRequest) {
  return withAuth(async () => {
    const limit = Math.min(
      50,
      Math.max(1, Number(request.nextUrl.searchParams.get('limit') || '20'))
    )
    const latestOnly = request.nextUrl.searchParams.get('latest') === '1'

    if (latestOnly) {
      const latest = await prisma.moodLog.findFirst({
        orderBy: { timestamp: 'desc' },
      })
      return NextResponse.json({
        latest: latest ? formatMood(latest) : null,
      })
    }

    const items = await prisma.moodLog.findMany({
      orderBy: { timestamp: 'desc' },
      take: limit,
    })

    return NextResponse.json({
      items: items.map(formatMood),
      latest: items[0] ? formatMood(items[0]) : null,
    })
  })
}

export async function POST(request: NextRequest) {
  return withAuth(async (sessionLoggedBy) => {
    const body = await request.json().catch(() => ({}))
    const mood = typeof body.mood === 'string' ? body.mood.trim() : ''

    if (!VALID_MOODS.has(mood)) {
      return NextResponse.json(
        { error: 'mood harus happy|calm|fussy|crying|sleepy' },
        { status: 400 }
      )
    }

    const log = await prisma.moodLog.create({
      data: {
        mood,
        timestamp: new Date(),
        loggedBy: sessionLoggedBy ?? null,
      },
    })

    return NextResponse.json(formatMood(log))
  })
}
