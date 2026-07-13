import { NextRequest, NextResponse } from 'next/server'
import { FeedSide } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-helpers'
import {
  dayKeyWib,
  distributeMinutesByDayWib,
  endOfTodayWib,
  periodStartWib,
} from '@/lib/day-boundary'
import { diaperEventCounts } from '@/lib/log-parsers'

function hoursBetween(start: Date, end: Date) {
  const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60)
  return hours > 0 ? hours : 0
}

function positiveMinutes(start: Date, end: Date) {
  const minutes = (end.getTime() - start.getTime()) / 60000
  return minutes > 0 ? minutes : 0
}

export async function GET(request: NextRequest) {
  return withAuth(async () => {
    const days = Math.min(
      90,
      Math.max(7, Number(request.nextUrl.searchParams.get('days') || '7'))
    )
    const since = periodStartWib(days)
    const until = endOfTodayWib()
    const now = new Date()

    const [diaperLogs, feedingLogs, sleepLogs, growthLogs] = await Promise.all([
      prisma.diaperLog.findMany({
        where: { timestamp: { gte: since, lt: until } },
      }),
      prisma.feedingLog.findMany({
        where: {
          timestampStart: { lt: until },
          OR: [
            { timestampStart: { gte: since } },
            { timestampEnd: { gte: since } },
            { timestampEnd: null },
          ],
        },
        orderBy: { timestampStart: 'asc' },
      }),
      prisma.sleepLog.findMany({
        where: {
          timestampStart: { lt: until },
          OR: [
            { timestampStart: { gte: since } },
            { timestampEnd: { gte: since } },
            { timestampEnd: null },
          ],
        },
      }),
      prisma.growthLog.findMany({
        orderBy: { date: 'asc' },
      }),
    ])

    const dailyMap = new Map<
      string,
      {
        pup: number
        pee: number
        change: number
        feed: number
        sleepHours: number
        feedDurationMinutes: number
        feedSessionsCompleted: number
        sleepSessions: number
      }
    >()

    for (let i = 0; i < days; i++) {
      const d = new Date(since.getTime() + i * 24 * 60 * 60 * 1000)
      dailyMap.set(dayKeyWib(d), {
        pup: 0,
        pee: 0,
        change: 0,
        feed: 0,
        sleepHours: 0,
        feedDurationMinutes: 0,
        feedSessionsCompleted: 0,
        sleepSessions: 0,
      })
    }

    for (const log of diaperLogs) {
      const key = dayKeyWib(log.timestamp)
      const bucket = dailyMap.get(key)
      if (!bucket) continue
      const counts = diaperEventCounts(log.type)
      bucket.pup += counts.pup
      bucket.pee += counts.pee
      if (String(log.type).toUpperCase() === 'GANTI') bucket.change++
    }

    for (const log of feedingLogs) {
      const startKey = dayKeyWib(log.timestampStart)
      const startBucket = dailyMap.get(startKey)
      if (startBucket && log.timestampStart >= since) {
        startBucket.feed++
      }

      if (!log.timestampEnd && log.timestampStart < since) continue

      const end = log.timestampEnd ?? now
      if (end.getTime() <= log.timestampStart.getTime()) continue

      for (const { dayKey, minutes } of distributeMinutesByDayWib(
        log.timestampStart,
        end
      )) {
        const bucket = dailyMap.get(dayKey)
        if (!bucket || minutes <= 0) continue
        bucket.feedDurationMinutes += minutes
        bucket.feedSessionsCompleted++
      }
    }

    for (const log of sleepLogs) {
      if (!log.timestampEnd && log.timestampStart < since) continue
      const end = log.timestampEnd ?? now
      if (end.getTime() <= log.timestampStart.getTime()) continue

      for (const { dayKey, minutes } of distributeMinutesByDayWib(
        log.timestampStart,
        end
      )) {
        const bucket = dailyMap.get(dayKey)
        if (!bucket || minutes <= 0) continue
        bucket.sleepHours += minutes / 60
        bucket.sleepSessions++
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
      change: counts.change,
      feed: counts.feed,
      sleepHours: Math.round(counts.sleepHours * 10) / 10,
      avgFeedingDurationMinutes:
        counts.feedSessionsCompleted > 0
          ? Math.round(
              counts.feedDurationMinutes / counts.feedSessionsCompleted
            )
          : null,
      avgSleepDurationMinutes:
        counts.sleepSessions > 0
          ? Math.round((counts.sleepHours * 60) / counts.sleepSessions)
          : null,
    }))

    let totalSleepHours = 0
    for (const day of daily) {
      totalSleepHours += day.sleepHours
    }

    const completedFeeds = feedingLogs.filter(
      (f) => f.timestampEnd && f.timestampEnd > f.timestampStart
    )
    let avgFeedingInterval: number | null = null
    let avgFeedingDurationMinutes: number | null = null
    if (completedFeeds.length >= 2) {
      const intervals: number[] = []
      for (let i = 1; i < completedFeeds.length; i++) {
        const gap = hoursBetween(
          completedFeeds[i - 1].timestampStart,
          completedFeeds[i].timestampStart
        )
        if (gap > 0) intervals.push(gap)
      }
      if (intervals.length > 0) {
        avgFeedingInterval =
          intervals.reduce((a, b) => a + b, 0) / intervals.length
      }
    }
    if (completedFeeds.length > 0) {
      const durations = completedFeeds.map((f) =>
        positiveMinutes(f.timestampStart, f.timestampEnd!)
      )
      avgFeedingDurationMinutes =
        durations.reduce((a, b) => a + b, 0) / durations.length
    }

    const completedSleeps = sleepLogs.filter(
      (s) => s.timestampEnd && s.timestampEnd > s.timestampStart
    )
    let avgSleepHours: number | null = null
    if (completedSleeps.length > 0) {
      const durations = completedSleeps.map((s) =>
        hoursBetween(s.timestampStart, s.timestampEnd!)
      )
      avgSleepHours = durations.reduce((a, b) => a + b, 0) / durations.length
    }

    let periodPup = 0
    let periodPee = 0
    let periodChange = 0
    for (const log of diaperLogs) {
      const counts = diaperEventCounts(log.type)
      periodPup += counts.pup
      periodPee += counts.pee
      if (String(log.type).toUpperCase() === 'GANTI') periodChange++
    }

    let feedLeft = 0
    let feedRight = 0
    const feedsStartedInPeriod = feedingLogs.filter(
      (f) => f.timestampStart >= since
    )
    for (const log of feedsStartedInPeriod) {
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
        change: periodChange,
        feed: feedsStartedInPeriod.length,
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
