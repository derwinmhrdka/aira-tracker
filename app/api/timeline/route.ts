import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-helpers'
import {
  dayKeyWib,
  startOfDayKeyWib,
} from '@/lib/day-boundary'
import { diaperEventCounts } from '@/lib/log-parsers'

const DAY_MS = 24 * 60 * 60 * 1000
const MOOD_EMOJI: Record<string, string> = {
  happy: '😊',
  calm: '😌',
  fussy: '😣',
  crying: '😭',
  sleepy: '😴',
}

function minutesFromDayStart(at: Date, dayStart: Date) {
  return Math.max(
    0,
    Math.min(1440, Math.round((at.getTime() - dayStart.getTime()) / 60000))
  )
}

function clipRange(
  start: Date,
  end: Date,
  dayStart: Date,
  dayEnd: Date
): { start: Date; end: Date } | null {
  const from = Math.max(start.getTime(), dayStart.getTime())
  const to = Math.min(end.getTime(), dayEnd.getTime())
  if (!(to > from)) return null
  return { start: new Date(from), end: new Date(to) }
}

function parseDateParam(raw: string | null): string {
  if (raw && /^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw
  return dayKeyWib(new Date())
}

export async function GET(request: NextRequest) {
  return withAuth(async () => {
    const date = parseDateParam(request.nextUrl.searchParams.get('date'))
    const dayStart = startOfDayKeyWib(date)
    const dayEnd = new Date(dayStart.getTime() + DAY_MS)
    const now = new Date()
    const todayKey = dayKeyWib(now)
    const isToday = date === todayKey

    const overlapWhere = {
      timestampStart: { lt: dayEnd },
      OR: [
        { timestampEnd: { gt: dayStart } },
        { timestampEnd: null, timestampStart: { gte: new Date(dayStart.getTime() - 3 * DAY_MS) } },
      ],
    }

    const [sleepLogs, feedingLogs, diaperLogs, moodLogs] = await Promise.all([
      prisma.sleepLog.findMany({
        where: overlapWhere,
        orderBy: { timestampStart: 'asc' },
      }),
      prisma.feedingLog.findMany({
        where: overlapWhere,
        orderBy: { timestampStart: 'asc' },
      }),
      prisma.diaperLog.findMany({
        where: { timestamp: { gte: dayStart, lt: dayEnd } },
        orderBy: { timestamp: 'asc' },
      }),
      prisma.moodLog.findMany({
        where: { timestamp: { gte: dayStart, lt: dayEnd } },
        orderBy: { timestamp: 'asc' },
      }),
    ])

    type TimelineEvent = {
      id: string
      kind: 'sleep' | 'feeding' | 'pup' | 'pee' | 'change' | 'mood'
      label: string
      emoji: string
      start: string
      end: string | null
      start_min: number
      end_min: number | null
      ongoing: boolean
    }

    const events: TimelineEvent[] = []

    for (const log of sleepLogs) {
      const end = log.timestampEnd ?? (isToday ? now : dayEnd)
      const clipped = clipRange(log.timestampStart, end, dayStart, dayEnd)
      if (!clipped) continue
      events.push({
        id: `sleep-${log.id}`,
        kind: 'sleep',
        label: log.timestampEnd ? 'Tidur' : 'Sedang tidur',
        emoji: '😴',
        start: clipped.start.toISOString(),
        end: clipped.end.toISOString(),
        start_min: minutesFromDayStart(clipped.start, dayStart),
        end_min: minutesFromDayStart(clipped.end, dayStart),
        ongoing: !log.timestampEnd,
      })
    }

    for (const log of feedingLogs) {
      const end = log.timestampEnd ?? (isToday ? now : dayEnd)
      const clipped = clipRange(log.timestampStart, end, dayStart, dayEnd)
      if (!clipped) continue
      events.push({
        id: `feed-${log.id}`,
        kind: 'feeding',
        label: log.timestampEnd ? 'Menyusui' : 'Sedang menyusui',
        emoji: '🍼',
        start: clipped.start.toISOString(),
        end: clipped.end.toISOString(),
        start_min: minutesFromDayStart(clipped.start, dayStart),
        end_min: minutesFromDayStart(clipped.end, dayStart),
        ongoing: !log.timestampEnd,
      })
    }

    for (const log of diaperLogs) {
      const counts = diaperEventCounts(log.type)
      const min = minutesFromDayStart(log.timestamp, dayStart)
      const iso = log.timestamp.toISOString()
      const isChange = log.type === 'GANTI' || String(log.type) === 'GANTI'

      if (isChange) {
        events.push({
          id: `change-${log.id}`,
          kind: 'change',
          label: 'Popok',
          emoji: '🩲',
          start: iso,
          end: null,
          start_min: min,
          end_min: null,
          ongoing: false,
        })
        continue
      }

      // Stack separately — KEDUANYA becomes two events, not one combined marker
      if (counts.pup > 0) {
        events.push({
          id: `pup-${log.id}`,
          kind: 'pup',
          label: 'Pup',
          emoji: '💩',
          start: iso,
          end: null,
          start_min: min,
          end_min: null,
          ongoing: false,
        })
      }
      if (counts.pee > 0) {
        events.push({
          id: `pee-${log.id}`,
          kind: 'pee',
          label: 'Pee',
          emoji: '💧',
          start: iso,
          end: null,
          start_min: min,
          end_min: null,
          ongoing: false,
        })
      }
    }

    for (const log of moodLogs) {
      const min = minutesFromDayStart(log.timestamp, dayStart)
      events.push({
        id: `mood-${log.id}`,
        kind: 'mood',
        label: log.mood,
        emoji: MOOD_EMOJI[log.mood] ?? '🙂',
        start: log.timestamp.toISOString(),
        end: null,
        start_min: min,
        end_min: null,
        ongoing: false,
      })
    }

    events.sort((a, b) => a.start_min - b.start_min)

    const prevDate = dayKeyWib(new Date(dayStart.getTime() - DAY_MS))
    const nextDate = dayKeyWib(dayEnd)
    const canGoNext = nextDate <= todayKey

    return NextResponse.json({
      date,
      label: dayStart.toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        timeZone: 'Asia/Jakarta',
      }),
      prev_date: prevDate,
      next_date: canGoNext ? nextDate : null,
      is_today: isToday,
      now_min: isToday ? minutesFromDayStart(now, dayStart) : null,
      events,
    })
  })
}
