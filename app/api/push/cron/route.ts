import { NextRequest, NextResponse } from 'next/server'
import {
  isPushConfigured,
  sendPushToAll,
  shouldSendFeedingReminder,
  shouldSendDiaperReminder,
  shouldSendVaccineReminder,
  markPushSent,
  markDiaperPushSent,
} from '@/lib/push-server'
import { prisma } from '@/lib/prisma'
import {
  storedHoursToReminderMinutes,
  envReminderMinutes,
  DEFAULT_FEEDING_INTERVAL_MINUTES,
  DEFAULT_DIAPER_INTERVAL_MINUTES,
} from '@/lib/reminder'

async function getFeedingIntervalMinutes(): Promise<number> {
  const sub = await prisma.pushSubscription.findFirst({
    where: { feedingReminderHours: { not: null } },
    select: { feedingReminderHours: true },
  })
  if (sub?.feedingReminderHours != null) {
    return storedHoursToReminderMinutes(sub.feedingReminderHours)
  }
  return envReminderMinutes(
    'FEEDING_REMINDER_MINUTES',
    'FEEDING_REMINDER_HOURS',
    DEFAULT_FEEDING_INTERVAL_MINUTES
  )
}

async function getDiaperIntervalMinutes(): Promise<number> {
  const sub = await prisma.pushSubscription.findFirst({
    where: { diaperReminderEnabled: true },
    select: { diaperReminderHours: true },
  })
  if (sub?.diaperReminderHours != null) {
    return storedHoursToReminderMinutes(sub.diaperReminderHours)
  }
  return envReminderMinutes(
    'DIAPER_REMINDER_MINUTES',
    'DIAPER_REMINDER_HOURS',
    DEFAULT_DIAPER_INTERVAL_MINUTES
  )
}

export async function GET(request: NextRequest) {
  const secret = request.headers.get('x-cron-secret')
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!isPushConfigured()) {
    return NextResponse.json({ sent: false, reason: 'not_configured' })
  }

  const vaccine = await shouldSendVaccineReminder()
  if (vaccine.shouldSend) {
    const result = await sendPushToAll({
      title: vaccine.title,
      body: vaccine.body,
      url: vaccine.url,
    })
    if (result.sent > 0) await markPushSent()
    return NextResponse.json({
      sent: result.sent > 0,
      count: result.sent,
      type: 'vaccine',
    })
  }

  const feedingInterval =
    Number(request.nextUrl.searchParams.get('feeding_minutes')) ||
    (request.nextUrl.searchParams.get('feeding_hours')
      ? Math.round(Number(request.nextUrl.searchParams.get('feeding_hours')) * 60)
      : 0) ||
    (await getFeedingIntervalMinutes())

  const feeding = await shouldSendFeedingReminder(feedingInterval)
  if (feeding.shouldSend) {
    const title = 'Waktunya menyusui 🍼'
    const body = feeding.babyName
      ? `${feeding.babyName} mungkin sudah lapar — cek jadwal menyusui`
      : 'Sudah waktunya cek jadwal menyusui'

    const result = await sendPushToAll({ title, body })
    if (result.sent > 0) await markPushSent()

    return NextResponse.json({
      sent: result.sent > 0,
      count: result.sent,
      type: 'feeding',
    })
  }

  const diaperInterval =
    Number(request.nextUrl.searchParams.get('diaper_minutes')) ||
    (request.nextUrl.searchParams.get('diaper_hours')
      ? Math.round(Number(request.nextUrl.searchParams.get('diaper_hours')) * 60)
      : 0) ||
    (await getDiaperIntervalMinutes())

  const diaper = await shouldSendDiaperReminder(diaperInterval)
  if (!diaper.shouldSend) {
    return NextResponse.json({ sent: false, reason: 'not_due' })
  }

  const title = 'Waktunya popok 🔄'
  const body = diaper.babyName
    ? `Cek popok ${diaper.babyName} — sudah waktunya`
    : 'Sudah waktunya cek popok'

  const result = await sendPushToAll({ title, body })
  if (result.sent > 0) await markDiaperPushSent()

  return NextResponse.json({
    sent: result.sent > 0,
    count: result.sent,
    type: 'diaper',
  })
}
