import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, jsonError } from '@/lib/api-helpers'

function serialize(event: {
  id: string
  title: string
  location: string | null
  meetWith: string | null
  startAt: Date
  endAt: Date
  notes: string | null
}) {
  return {
    id: event.id,
    title: event.title,
    location: event.location,
    meet_with: event.meetWith,
    start_at: event.startAt.toISOString(),
    end_at: event.endAt.toISOString(),
    notes: event.notes,
  }
}

export async function GET(request: NextRequest) {
  return withAuth(async () => {
    const upcomingOnly = request.nextUrl.searchParams.get('upcoming') === '1'
    const now = new Date()

    const events = await prisma.calendarEvent.findMany({
      where: upcomingOnly ? { endAt: { gte: now } } : undefined,
      orderBy: { startAt: upcomingOnly ? 'asc' : 'desc' },
    })

    return NextResponse.json(events.map(serialize))
  })
}

export async function POST(request: NextRequest) {
  return withAuth(async () => {
    const body = await request.json()
    const title = String(body.title ?? '').trim()
    const startAt = body.start_at ? new Date(body.start_at) : null
    const endAt = body.end_at ? new Date(body.end_at) : null

    if (!title) return jsonError('title is required')
    if (!startAt || Number.isNaN(startAt.getTime())) {
      return jsonError('start_at is required')
    }
    if (!endAt || Number.isNaN(endAt.getTime())) {
      return jsonError('end_at is required')
    }
    if (endAt.getTime() < startAt.getTime()) {
      return jsonError('end_at must be after start_at')
    }

    const event = await prisma.calendarEvent.create({
      data: {
        title,
        location: body.location?.trim() || null,
        meetWith: body.meet_with?.trim() || null,
        startAt,
        endAt,
        notes: body.notes?.trim() || null,
      },
    })

    return NextResponse.json(serialize(event), { status: 201 })
  })
}
