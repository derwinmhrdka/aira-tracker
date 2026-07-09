import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-helpers'

type GallerySource = 'note' | 'milestone'
type GalleryMediaType = 'photo' | 'audio'

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
        where: {
          OR: [{ photoUrl: { not: null } }, { audioUrl: { not: null } }],
        },
        orderBy: { timestamp: 'desc' },
      }),
      prisma.milestone.findMany({
        where: { photoUrl: { not: null } },
        orderBy: { date: 'desc' },
      }),
    ])

    const merged: {
      id: string
      source: GallerySource
      media_type: GalleryMediaType
      photo_url: string | null
      audio_url: string | null
      caption: string
      timestamp: string
      logged_by: string | null
    }[] = []

    for (const n of notes) {
      const base = {
        id: n.id,
        source: 'note' as GallerySource,
        caption: n.content,
        timestamp: n.timestamp.toISOString(),
        logged_by: n.loggedBy,
      }
      if (n.photoUrl) {
        merged.push({
          ...base,
          media_type: 'photo',
          photo_url: n.photoUrl,
          audio_url: null,
        })
      }
      if (n.audioUrl) {
        merged.push({
          ...base,
          media_type: 'audio',
          photo_url: null,
          audio_url: n.audioUrl,
        })
      }
    }

    for (const m of milestones) {
      merged.push({
        id: m.id,
        source: 'milestone',
        media_type: 'photo',
        photo_url: m.photoUrl!,
        audio_url: null,
        caption: m.description?.trim()
          ? `${m.title} — ${m.description.trim()}`
          : m.title,
        timestamp: milestoneTimestamp(m.date).toISOString(),
        logged_by: null,
      })
    }

    merged.sort((a, b) => {
      const diff = new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      if (diff !== 0) return diff
      if (a.media_type !== b.media_type) {
        return a.media_type === 'photo' ? -1 : 1
      }
      return a.id.localeCompare(b.id)
    })

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
