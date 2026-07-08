import { NextResponse } from 'next/server'
import { DiaperType } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-helpers'
import { formatAge } from '@/lib/baby-utils'
import { getNextVaccine } from '@/lib/immunization-utils'
import { diaperEventCounts } from '@/lib/log-parsers'

function todayStart() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

function lastTimestamp(
  logs: { timestamp: Date; type: DiaperType }[],
  types: DiaperType[]
) {
  const match = logs
    .filter((l) => types.includes(l.type))
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0]
  return match?.timestamp.toISOString() ?? null
}

export async function GET() {
  return withAuth(async () => {
    try {
      const since = todayStart()

      const [
        diaperLogs,
        feedingLogs,
        sleepLogs,
        activeFeeding,
        activeSleep,
        profile,
        immunizations,
      ] = await Promise.all([
        prisma.diaperLog.findMany({
          where: { timestamp: { gte: since } },
          orderBy: { timestamp: 'desc' },
        }),
        prisma.feedingLog.findMany({
          where: { timestampStart: { gte: since } },
          orderBy: { timestampStart: 'desc' },
        }),
        prisma.sleepLog.findMany({
          where: { timestampStart: { gte: since } },
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
      ])

      let pup = 0
      let pee = 0
      for (const log of diaperLogs) {
        const counts = diaperEventCounts(log.type)
        pup += counts.pup
        pee += counts.pee
      }

      let totalSleepMinutes = 0
      for (const log of sleepLogs) {
        if (!log.timestampEnd) continue
        totalSleepMinutes += Math.round(
          (log.timestampEnd.getTime() - log.timestampStart.getTime()) / 60000
        )
      }
      if (activeSleep && !activeSleep.timestampEnd) {
        totalSleepMinutes += Math.round(
          (Date.now() - activeSleep.timestampStart.getTime()) / 60000
        )
      }

      const birthDate = profile?.birthDate.toISOString().split('T')[0] ?? null

      return NextResponse.json(
        {
          counts: {
            pup,
            pee,
            feed: feedingLogs.length,
            sleep: sleepLogs.length,
          },
          lastTimes: {
            pup: lastTimestamp(diaperLogs, [DiaperType.PUP, DiaperType.KEDUANYA]),
            pee: lastTimestamp(diaperLogs, [DiaperType.PIPIS, DiaperType.KEDUANYA]),
            feed: feedingLogs[0]?.timestampStart.toISOString() ?? null,
            sleep: sleepLogs[0]?.timestampStart.toISOString() ?? null,
          },
          activeFeeding: !!activeFeeding,
          activeSleep: !!activeSleep,
          activeFeedingStart: activeFeeding?.timestampStart.toISOString() ?? null,
          activeSleepStart: activeSleep?.timestampStart.toISOString() ?? null,
          totalSleepMinutes,
          baby: profile
            ? {
                name: profile.name,
                birth_date: birthDate,
                age_label: birthDate ? formatAge(birthDate) : null,
                photo_url: profile.photoUrl,
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
