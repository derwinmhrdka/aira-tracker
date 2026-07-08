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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(async () => {
    const { id } = await params
    const body = await request.json()

    const existing = await prisma.calendarEvent.findUnique({ where: { id } })
    if (!existing) return jsonError('Event not found', 404)

    const title =
      body.title != null ? String(body.title).trim() : undefined
    if (title !== undefined && !title) return jsonError('title is required')

    const startAt =
      body.start_at != null ? new Date(body.start_at) : existing.startAt
    const endAt = body.end_at != null ? new Date(body.end_at) : existing.endAt

    if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
      return jsonError('Invalid datetime')
    }
    if (endAt.getTime() < startAt.getTime()) {
      return jsonError('end_at must be after start_at')
    }

    const updated = await prisma.calendarEvent.update({
      where: { id },
      data: {
        title,
        location:
          body.location !== undefined
            ? String(body.location || '').trim() || null
            : undefined,
        meetWith:
          body.meet_with !== undefined
            ? String(body.meet_with || '').trim() || null
            : undefined,
        startAt: body.start_at != null ? startAt : undefined,
        endAt: body.end_at != null ? endAt : undefined,
        notes:
          body.notes !== undefined
            ? String(body.notes || '').trim() || null
            : undefined,
      },
    })

    return NextResponse.json(serialize(updated))
  })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(async () => {
    const { id } = await params
    const existing = await prisma.calendarEvent.findUnique({ where: { id } })
    if (!existing) return jsonError('Event not found', 404)

    await prisma.calendarEvent.delete({ where: { id } })
    return NextResponse.json({ success: true })
  })
}
