import { NextRequest, NextResponse } from 'next/server'
import { DiaperType } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-helpers'

function hoursBetween(start: Date, end: Date) {
  return (end.getTime() - start.getTime()) / (1000 * 60 * 60)
}

function periodStart(days: number) {
  const d = new Date()
  d.setDate(d.getDate() - days + 1)
  d.setHours(0, 0, 0, 0)
  return d
}

function dayKey(date: Date) {
  return date.toISOString().split('T')[0]
}

export async function GET(request: NextRequest) {
  return withAuth(async () => {
    const days = Math.min(
      90,
      Math.max(7, Number(request.nextUrl.searchParams.get('days') || '7'))
    )
    const since = periodStart(days)

    const [diaperLogs, feedingLogs, sleepLogs, growthLogs] = await Promise.all([
      prisma.diaperLog.findMany({
        where: { timestamp: { gte: since } },
      }),
      prisma.feedingLog.findMany({
        where: { timestampStart: { gte: since } },
        orderBy: { timestampStart: 'asc' },
      }),
      prisma.sleepLog.findMany({
        where: { timestampStart: { gte: since } },
      }),
      prisma.growthLog.findMany({ orderBy: { date: 'asc' } }),
    ])

    const dailyMap = new Map<
      string,
      { pup: number; pee: number; feed: number; sleepHours: number }
    >()

    for (let i = 0; i < days; i++) {
      const d = new Date(since)
      d.setDate(d.getDate() + i)
      dailyMap.set(dayKey(d), { pup: 0, pee: 0, feed: 0, sleepHours: 0 })
    }

    for (const log of diaperLogs) {
      const key = dayKey(log.timestamp)
      const bucket = dailyMap.get(key)
      if (!bucket) continue
      if (log.type === DiaperType.PUP) bucket.pup++
      else bucket.pee++
    }

    for (const log of feedingLogs) {
      const key = dayKey(log.timestampStart)
      const bucket = dailyMap.get(key)
      if (bucket) bucket.feed++
    }

    for (const log of sleepLogs) {
      if (!log.timestampEnd) continue
      const key = dayKey(log.timestampStart)
      const bucket = dailyMap.get(key)
      if (bucket) {
        bucket.sleepHours += hoursBetween(log.timestampStart, log.timestampEnd)
      }
    }

    const daily = [...dailyMap.entries()].map(([date, counts]) => ({
      date,
      label: new Date(date).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
      }),
      pup: counts.pup,
      pee: counts.pee,
      feed: counts.feed,
      sleepHours: Math.round(counts.sleepHours * 10) / 10,
    }))

    let totalSleepHours = 0
    for (const log of sleepLogs) {
      if (log.timestampEnd) {
        totalSleepHours += hoursBetween(log.timestampStart, log.timestampEnd)
      }
    }

    const completedFeeds = feedingLogs.filter((f) => f.timestampEnd)
    let avgFeedingInterval: number | null = null
    if (completedFeeds.length >= 2) {
      const intervals: number[] = []
      for (let i = 1; i < completedFeeds.length; i++) {
        intervals.push(
          hoursBetween(
            completedFeeds[i - 1].timestampStart,
            completedFeeds[i].timestampStart
          )
        )
      }
      avgFeedingInterval =
        intervals.reduce((a, b) => a + b, 0) / intervals.length
    }

    const completedSleeps = sleepLogs.filter((s) => s.timestampEnd)
    let avgSleepHours: number | null = null
    if (completedSleeps.length > 0) {
      const durations = completedSleeps.map((s) =>
        hoursBetween(s.timestampStart, s.timestampEnd!)
      )
      avgSleepHours = durations.reduce((a, b) => a + b, 0) / durations.length
    }

    return NextResponse.json({
      days,
      period: {
        pup: diaperLogs.filter((l) => l.type === DiaperType.PUP).length,
        pee: diaperLogs.filter(
          (l) => l.type === DiaperType.PIPIS || l.type === DiaperType.KEDUANYA
        ).length,
        feed: feedingLogs.length,
        sleepHours: Math.round(totalSleepHours * 10) / 10,
      },
      daily,
      growth: growthLogs.map((g) => ({
        id: g.id,
        date: g.date.toISOString().split('T')[0],
        weight_kg: g.weightKg,
        height_cm: g.heightCm,
        is_jaundice: g.isJaundice,
        bilirubin_level: g.bilirubinLevel,
        notes: g.notes,
      })),
      insights: {
        avgSleepHours: avgSleepHours
          ? Math.round(avgSleepHours * 10) / 10
          : null,
        avgFeedingIntervalHours: avgFeedingInterval
          ? Math.round(avgFeedingInterval * 10) / 10
          : null,
      },
    })
  })
}
