import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, parseLoggedBy, jsonError } from '@/lib/api-helpers'
import { parseFeedSide, parseFeedType } from '@/lib/log-parsers'

export async function POST(request: NextRequest) {
  return withAuth(async (sessionLoggedBy) => {
    const body = await request.json()
    const action = body.action as string
    const loggedBy = parseLoggedBy(body.logged_by) ?? sessionLoggedBy
    const feedType = parseFeedType(body.feed_type)

    if (action === 'start') {
      const active = await prisma.feedingLog.findFirst({
        where: { timestampEnd: null },
        orderBy: { timestampStart: 'desc' },
      })
      if (active) {
        return jsonError('Masih ada sesi menyusui yang aktif', 409)
      }

      const log = await prisma.feedingLog.create({
        data: {
          timestampStart: new Date(),
          loggedBy: loggedBy ?? null,
          feedType: feedType ?? 'DIRECT',
        },
      })

      return NextResponse.json({
        id: log.id,
        timestamp_start: log.timestampStart.toISOString(),
      })
    }

    if (action === 'end') {
      const active = await prisma.feedingLog.findFirst({
        where: { timestampEnd: null },
        orderBy: { timestampStart: 'desc' },
      })
      if (!active) {
        return jsonError('Tidak ada sesi menyusui aktif', 404)
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

      const log = await prisma.feedingLog.update({
        where: { id: active.id },
        data: {
          timestampEnd,
          side: parseFeedSide(body.side) ?? active.side,
          feedType: feedType ?? active.feedType,
          amountMl:
            body.amount_ml != null ? Number(body.amount_ml) : active.amountMl,
          notes: body.notes?.trim() || active.notes,
        },
      })

      return NextResponse.json({
        id: log.id,
        timestamp_start: log.timestampStart.toISOString(),
        timestamp_end: log.timestampEnd?.toISOString() ?? null,
      })
    }

    if (action === 'quick') {
      const now = new Date()
      const log = await prisma.feedingLog.create({
        data: {
          timestampStart: now,
          timestampEnd: now,
          feedType: feedType ?? 'PUMPED',
          amountMl: body.amount_ml != null ? Number(body.amount_ml) : null,
          loggedBy: loggedBy ?? null,
          notes: body.notes?.trim() || null,
        },
      })

      return NextResponse.json({
        id: log.id,
        timestamp_start: log.timestampStart.toISOString(),
        timestamp_end: log.timestampEnd?.toISOString() ?? null,
      })
    }

    return jsonError('action must be start, end, or quick')
  })
}
