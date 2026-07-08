import { NextRequest, NextResponse } from 'next/server'
import { FeedSide } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-helpers'
import { dayKeyWib, periodStartWib } from '@/lib/day-boundary'
import { diaperEventCounts } from '@/lib/log-parsers'

function hoursBetween(start: Date, end: Date) {
  return (end.getTime() - start.getTime()) / (1000 * 60 * 60)
}

export async function GET(request: NextRequest) {
  return withAuth(async () => {
    const days = Math.min(
      90,
      Math.max(7, Number(request.nextUrl.searchParams.get('days') || '7'))
    )
    const since = periodStartWib(days)

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
      prisma.growthLog.findMany({
        orderBy: { date: 'asc' },
      }),
    ])

    const dailyMap = new Map<
      string,
      { pup: number; pee: number; feed: number; sleepHours: number }
    >()

    for (let i = 0; i < days; i++) {
      const d = new Date(since.getTime() + i * 24 * 60 * 60 * 1000)
      dailyMap.set(dayKeyWib(d), { pup: 0, pee: 0, feed: 0, sleepHours: 0 })
    }

    for (const log of diaperLogs) {
      const key = dayKeyWib(log.timestamp)
      const bucket = dailyMap.get(key)
      if (!bucket) continue
      const counts = diaperEventCounts(log.type)
      bucket.pup += counts.pup
      bucket.pee += counts.pee
    }

    for (const log of feedingLogs) {
      const key = dayKeyWib(log.timestampStart)
      const bucket = dailyMap.get(key)
      if (bucket) bucket.feed++
    }

    for (const log of sleepLogs) {
      if (!log.timestampEnd) continue
      const key = dayKeyWib(log.timestampStart)
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
    let avgFeedingDurationMinutes: number | null = null
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
    if (completedFeeds.length > 0) {
      const durations = completedFeeds.map(
        (f) =>
          (f.timestampEnd!.getTime() - f.timestampStart.getTime()) / 60000
      )
      avgFeedingDurationMinutes =
        durations.reduce((a, b) => a + b, 0) / durations.length
    }

    const completedSleeps = sleepLogs.filter((s) => s.timestampEnd)
    let avgSleepHours: number | null = null
    if (completedSleeps.length > 0) {
      const durations = completedSleeps.map((s) =>
        hoursBetween(s.timestampStart, s.timestampEnd!)
      )
      avgSleepHours = durations.reduce((a, b) => a + b, 0) / durations.length
    }

    let periodPup = 0
    let periodPee = 0
    for (const log of diaperLogs) {
      const counts = diaperEventCounts(log.type)
      periodPup += counts.pup
      periodPee += counts.pee
    }

    let feedLeft = 0
    let feedRight = 0
    for (const log of feedingLogs) {
      if (!log.side) continue
      if (log.side === FeedSide.LEFT) feedLeft++
      else if (log.side === FeedSide.RIGHT) feedRight++
      else if (log.side === FeedSide.BOTH) {
        feedLeft++
        feedRight++
      }
    }

    const daysWithPup = daily.filter((d) => d.pup > 0)
    const daysWithPee = daily.filter((d) => d.pee > 0)
    const avgPupPerDay =
      daysWithPup.length > 0
        ? daysWithPup.reduce((sum, d) => sum + d.pup, 0) / daysWithPup.length
        : 0
    const avgPeePerDay =
      daysWithPee.length > 0
        ? daysWithPee.reduce((sum, d) => sum + d.pee, 0) / daysWithPee.length
        : 0

    return NextResponse.json({
      days,
      period: {
        pup: periodPup,
        pee: periodPee,
        feed: feedingLogs.length,
        sleepHours: Math.round(totalSleepHours * 10) / 10,
      },
      daily,
      growth: growthLogs.map((g) => ({
        id: g.id,
        date: g.date.toISOString().split('T')[0],
        weight_kg: g.weightKg,
        height_cm: g.heightCm,
        head_circumference_cm: g.headCircumferenceCm,
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
        avgFeedingDurationMinutes: avgFeedingDurationMinutes
          ? Math.round(avgFeedingDurationMinutes)
          : null,
        avgPupPerDay: Math.round(avgPupPerDay * 10) / 10,
        avgPeePerDay: Math.round(avgPeePerDay * 10) / 10,
        feedSideLeft: feedLeft,
        feedSideRight: feedRight,
      },
    })
  })
}
