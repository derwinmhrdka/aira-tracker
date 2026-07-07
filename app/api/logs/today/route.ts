import { NextResponse } from 'next/server'
import { DiaperType } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-helpers'
import { formatAge } from '@/lib/baby-utils'
import { getNextVaccine } from '@/lib/immunization-utils'

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
      if (log.type === DiaperType.PUP) pup++
      else if (log.type === DiaperType.PIPIS) pee++
      else {
        pup++
        pee++
      }
    }

    let totalSleepMinutes = 0
    for (const log of sleepLogs) {
      if (!log.timestampEnd) continue
      totalSleepMinutes += Math.round(
        (log.timestampEnd.getTime() - log.timestampStart.getTime()) / 60000
      )
    }
    if (activeSleep?.timestampEnd == null) {
      totalSleepMinutes += Math.round(
        (Date.now() - activeSleep.timestampStart.getTime()) / 60000
      )
    }

    const birthDate = profile?.birthDate.toISOString().split('T')[0] ?? null

    return NextResponse.json({
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
    })
  })
}
