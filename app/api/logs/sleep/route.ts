import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, parseLoggedBy, jsonError } from '@/lib/api-helpers'

export async function POST(request: NextRequest) {
  return withAuth(async (sessionLoggedBy) => {
    const body = await request.json()
    const action = body.action as string
    const loggedBy = parseLoggedBy(body.logged_by) ?? sessionLoggedBy

    if (action === 'start') {
      const active = await prisma.sleepLog.findFirst({
        where: { timestampEnd: null },
        orderBy: { timestampStart: 'desc' },
      })
      if (active) {
        return jsonError('Masih ada sesi tidur yang aktif', 409)
      }

      const log = await prisma.sleepLog.create({
        data: {
          timestampStart: new Date(),
          loggedBy: loggedBy ?? null,
          notes: body.notes?.trim() || null,
        },
      })

      return NextResponse.json({
        id: log.id,
        timestamp_start: log.timestampStart.toISOString(),
      })
    }

    if (action === 'end') {
      const active = await prisma.sleepLog.findFirst({
        where: { timestampEnd: null },
        orderBy: { timestampStart: 'desc' },
      })
      if (!active) {
        return jsonError('Tidak ada sesi tidur aktif', 404)
      }

      let timestampEnd = new Date()
      if (body.timestamp_end) {
        const parsed = new Date(body.timestamp_end)
        if (!Number.isNaN(parsed.getTime()) && parsed.getTime() >= active.timestampStart.getTime()) {
          timestampEnd = parsed
        }
      } else if (body.duration_minutes != null && Number.isFinite(Number(body.duration_minutes))) {
        const mins = Math.max(0, Math.round(Number(body.duration_minutes)))
        timestampEnd = new Date(active.timestampStart.getTime() + mins * 60000)
      }

      const log = await prisma.sleepLog.update({
        where: { id: active.id },
        data: {
          timestampEnd,
          notes: body.notes?.trim() || active.notes,
        },
      })

      return NextResponse.json({
        id: log.id,
        timestamp_start: log.timestampStart.toISOString(),
        timestamp_end: log.timestampEnd?.toISOString() ?? null,
      })
    }

    return jsonError('action must be start or end')
  })
}
