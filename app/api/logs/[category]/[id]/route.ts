import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, jsonError } from '@/lib/api-helpers'
import { feedTypeLabel } from '@/lib/feed-utils'
import {
  deleteUploadsIfManaged,
  replaceManagedUpload,
} from '@/lib/upload-files'
import {
  parseDiaperType,
  parseFeedSide,
  parseFeedType,
  diaperTypeToClient,
} from '@/lib/log-parsers'

type RouteParams = { params: Promise<{ category: string; id: string }> }

function formatHistoryItem(
  category: string,
  record: Record<string, unknown>
) {
  if (category === 'diaper') {
    const type = record.type as import('@prisma/client').DiaperType
    return {
      id: record.id as string,
      category: 'diaper' as const,
      type: diaperTypeToClient(type),
      timestamp: (record.timestamp as Date).toISOString(),
      diaper_type: diaperTypeToClient(type),
      notes: (record.notes as string | null) ?? null,
      loggedBy: (record.loggedBy as string | null) ?? null,
    }
  }

  if (category === 'feeding') {
    const feedType = record.feedType as string | null
    return {
      id: record.id as string,
      category: 'feeding' as const,
      type: 'feed',
      timestamp: (record.timestampStart as Date).toISOString(),
      timestampEnd: (record.timestampEnd as Date | null)?.toISOString() ?? null,
      side: (record.side as string | null) ?? null,
      feed_type: feedType,
      amount_ml: (record.amountMl as number | null) ?? null,
      notes: (record.notes as string | null) ?? null,
      loggedBy: (record.loggedBy as string | null) ?? null,
      details: feedTypeLabel(feedType),
    }
  }

  if (category === 'sleep') {
    return {
      id: record.id as string,
      category: 'sleep' as const,
      type: 'sleep',
      timestamp: (record.timestampStart as Date).toISOString(),
      timestampEnd: (record.timestampEnd as Date | null)?.toISOString() ?? null,
      notes: (record.notes as string | null) ?? null,
      loggedBy: (record.loggedBy as string | null) ?? null,
    }
  }

  return {
    id: record.id as string,
    category: 'note' as const,
    type: 'note',
    timestamp: (record.timestamp as Date).toISOString(),
    content: record.content as string,
    photo_url: (record.photoUrl as string | null) ?? null,
    audio_url: (record.audioUrl as string | null) ?? null,
    loggedBy: (record.loggedBy as string | null) ?? null,
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  return withAuth(async () => {
    const { category, id } = await params
    const body = await request.json()

    if (category === 'diaper') {
      const type = body.type != null ? parseDiaperType(body.type) : undefined
      if (body.type != null && !type) {
        return jsonError('type must be pup, pee, or both')
      }

      const log = await prisma.diaperLog.update({
        where: { id },
        data: {
          timestamp: body.timestamp ? new Date(body.timestamp) : undefined,
          type,
          notes: body.notes !== undefined ? body.notes : undefined,
        },
      })

      return NextResponse.json(formatHistoryItem('diaper', log))
    }

    if (category === 'feeding') {
      const log = await prisma.feedingLog.update({
        where: { id },
        data: {
          timestampStart: body.timestamp
            ? new Date(body.timestamp)
            : undefined,
          timestampEnd:
            body.timestamp_end === null
              ? null
              : body.timestamp_end
                ? new Date(body.timestamp_end)
                : undefined,
          side: body.side != null ? parseFeedSide(body.side) : undefined,
          feedType:
            body.feed_type != null ? parseFeedType(body.feed_type) : undefined,
          amountMl:
            body.amount_ml !== undefined ? body.amount_ml : undefined,
          notes: body.notes !== undefined ? body.notes : undefined,
        },
      })

      return NextResponse.json(formatHistoryItem('feeding', log))
    }

    if (category === 'sleep') {
      const log = await prisma.sleepLog.update({
        where: { id },
        data: {
          timestampStart: body.timestamp
            ? new Date(body.timestamp)
            : undefined,
          timestampEnd:
            body.timestamp_end === null
              ? null
              : body.timestamp_end
                ? new Date(body.timestamp_end)
                : undefined,
          notes: body.notes !== undefined ? body.notes : undefined,
        },
      })

      return NextResponse.json(formatHistoryItem('sleep', log))
    }

    if (category === 'note') {
      const existing = await prisma.dailyNote.findUnique({ where: { id } })
      if (!existing) {
        return jsonError('Note not found', 404)
      }

      const newPhotoUrl =
        body.photo_url !== undefined ? body.photo_url : existing.photoUrl
      const newAudioUrl =
        body.audio_url !== undefined ? body.audio_url : existing.audioUrl

      if (body.photo_url !== undefined && newPhotoUrl !== existing.photoUrl) {
        await replaceManagedUpload(existing.photoUrl, newPhotoUrl)
      }
      if (body.audio_url !== undefined && newAudioUrl !== existing.audioUrl) {
        await replaceManagedUpload(existing.audioUrl, newAudioUrl)
      }

      const log = await prisma.dailyNote.update({
        where: { id },
        data: {
          timestamp: body.timestamp ? new Date(body.timestamp) : undefined,
          content: body.content?.trim(),
          photoUrl: body.photo_url !== undefined ? body.photo_url : undefined,
          audioUrl: body.audio_url !== undefined ? body.audio_url : undefined,
        },
      })

      return NextResponse.json(formatHistoryItem('note', log))
    }

    return jsonError('Unknown category', 404)
  })
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  return withAuth(async () => {
    const { category, id } = await params

    if (category === 'diaper') {
      await prisma.diaperLog.delete({ where: { id } })
    } else if (category === 'feeding') {
      await prisma.feedingLog.delete({ where: { id } })
    } else if (category === 'sleep') {
      await prisma.sleepLog.delete({ where: { id } })
    } else if (category === 'note') {
      const note = await prisma.dailyNote.findUnique({ where: { id } })
      if (!note) {
        return jsonError('Note not found', 404)
      }
      await deleteUploadsIfManaged([note.photoUrl, note.audioUrl], true)
      await prisma.dailyNote.delete({ where: { id } })
    } else {
      return jsonError('Unknown category', 404)
    }

    return NextResponse.json({ success: true })
  })
}
