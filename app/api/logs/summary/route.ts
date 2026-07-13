import { NextResponse } from 'next/server'
import { DiaperType } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-helpers'
import { formatAge } from '@/lib/baby-utils'
import { getBabyAstrology } from '@/lib/baby-astrology'
import { getNextVaccine } from '@/lib/immunization-utils'
import {
  endOfTodayWib,
  minutesOverlap,
  sessionOverlapsWindow,
  startOfTodayWib,
} from '@/lib/day-boundary'
import { diaperEventCounts } from '@/lib/log-parsers'

function lastTimestamp(
  logs: { timestamp: Date; type: DiaperType }[],
  types: DiaperType[]
) {
  const match = logs
    .filter((l) => types.includes(l.type))
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0]
  return match?.timestamp.toISOString() ?? null
}

function sessionDurationMinutes(
  start: Date,
  end: Date | null,
  ongoing: boolean
): number | null {
  if (!end && !ongoing) return null
  const minutes = Math.round(
    ((end ?? new Date()).getTime() - start.getTime()) / 60000
  )
  return minutes >= 0 ? minutes : null
}

export async function GET() {
  return withAuth(async () => {
    try {
      const dayStart = startOfTodayWib()
      const dayEnd = endOfTodayWib()
      const overlapWhere = sessionOverlapsWindow(dayStart, dayEnd)

      const [
        diaperLogs,
        feedingLogs,
        sleepLogs,
        activeFeeding,
        activeSleep,
        profile,
        immunizations,
        lastDiaperLog,
      ] = await Promise.all([
        prisma.diaperLog.findMany({
          where: { timestamp: { gte: dayStart, lt: dayEnd } },
          orderBy: { timestamp: 'desc' },
        }),
        prisma.feedingLog.findMany({
          where: overlapWhere,
          orderBy: { timestampStart: 'desc' },
        }),
        prisma.sleepLog.findMany({
          where: overlapWhere,
          orderBy: { timestampStart: 'desc' },
        }),
        prisma.feedingLog.findFirst({
          where: { timestampEnd: null },
          orderBy: { timestampStart: 'desc' },
        }),
        prisma.sleepLog.findFirst({
          where: { timestampEnd: null },
          orderBy: { timestampStart: 'desc' },
        }),
        prisma.babyProfile.findFirst(),
        prisma.immunization.findMany({
          orderBy: [{ scheduledAgeMonths: 'asc' }, { vaccineName: 'asc' }],
        }),
        prisma.diaperLog.findFirst({
          orderBy: { timestamp: 'desc' },
        }),
      ])

      let pup = 0
      let pee = 0
      let change = 0
      for (const log of diaperLogs) {
        const counts = diaperEventCounts(log.type)
        pup += counts.pup
        pee += counts.pee
        if (log.type === 'GANTI' || String(log.type) === 'GANTI') change++
      }

      const now = new Date()

      let totalSleepMinutes = 0
      for (const log of sleepLogs) {
        const end = log.timestampEnd ?? now
        totalSleepMinutes += minutesOverlap(
          log.timestampStart,
          end,
          dayStart,
          dayEnd
        )
      }

      let totalFeedingMinutes = 0
      for (const log of feedingLogs) {
        const end = log.timestampEnd ?? now
        totalFeedingMinutes += minutesOverlap(
          log.timestampStart,
          end,
          dayStart,
          dayEnd
        )
      }

      const birthDate = profile?.birthDate.toISOString().split('T')[0] ?? null
      const astrology = birthDate ? getBabyAstrology(birthDate) : null
      const lastFeed = feedingLogs[0] ?? null
      const lastSleep = sleepLogs[0] ?? null
      const lastFeedingEnd = feedingLogs
        .filter((f) => !!f.timestampEnd)
        .sort(
          (a, b) =>
            b.timestampEnd!.getTime() - a.timestampEnd!.getTime()
        )[0]?.timestampEnd

      return NextResponse.json(
        {
          counts: {
            pup,
            pee,
            change,
            feed: feedingLogs.length,
            sleep: sleepLogs.length,
          },
          lastTimes: {
            pup: lastTimestamp(diaperLogs, [DiaperType.PUP, DiaperType.KEDUANYA]),
            pee: lastTimestamp(diaperLogs, [DiaperType.PIPIS, DiaperType.KEDUANYA]),
            change: lastTimestamp(diaperLogs, ['GANTI' as DiaperType]),
            feed: feedingLogs[0]?.timestampStart.toISOString() ?? null,
            sleep: sleepLogs[0]?.timestampStart.toISOString() ?? null,
          },
          lastFeedingEnd: lastFeedingEnd?.toISOString() ?? null,
          lastDiaper: lastDiaperLog?.timestamp.toISOString() ?? null,
          lastDurations: {
            feed: lastFeed
              ? sessionDurationMinutes(
                  lastFeed.timestampStart,
                  lastFeed.timestampEnd,
                  !!activeFeeding && !lastFeed.timestampEnd
                )
              : null,
            sleep: lastSleep
              ? sessionDurationMinutes(
                  lastSleep.timestampStart,
                  lastSleep.timestampEnd,
                  !!activeSleep && !lastSleep.timestampEnd
                )
              : null,
          },
          activeFeeding: !!activeFeeding,
          activeSleep: !!activeSleep,
          activeFeedingStart: activeFeeding?.timestampStart.toISOString() ?? null,
          activeSleepStart: activeSleep?.timestampStart.toISOString() ?? null,
          totalSleepMinutes,
          totalFeedingMinutes,
          baby: profile
            ? {
                name: profile.name,
                birth_date: birthDate,
                age_label: birthDate ? formatAge(birthDate) : null,
                photo_url: profile.photoUrl,
                horoscope: astrology?.horoscope ?? null,
                horoscope_emoji: astrology?.horoscopeEmoji ?? null,
                shio: astrology?.shio ?? null,
              }
            : null,
          nextVaccine: getNextVaccine(immunizations, birthDate),
        },
        {
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate',
          },
        }
      )
    } catch (err) {
      console.error('GET /api/logs/summary failed:', err)
      return NextResponse.json(
        { error: 'Gagal memuat ringkasan hari ini' },
        { status: 500 }
      )
    }
  })
}
