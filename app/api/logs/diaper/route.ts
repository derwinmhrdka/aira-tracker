import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, parseLoggedBy, jsonError } from '@/lib/api-helpers'
import { parseDiaperType } from '@/lib/log-parsers'

export async function POST(request: NextRequest) {
  return withAuth(async (sessionLoggedBy) => {
    const body = await request.json()
    const type = parseDiaperType(body.type)

    if (!type) {
      return jsonError('type must be pup, pee, both, or change')
    }

    const loggedBy = parseLoggedBy(body.logged_by) ?? sessionLoggedBy

    const log = await prisma.diaperLog.create({
      data: {
        type,
        notes: body.notes?.trim() || null,
        loggedBy: loggedBy ?? null,
      },
    })

    return NextResponse.json({
      id: log.id,
      timestamp: log.timestamp.toISOString(),
      type: body.type,
    })
  })
}
