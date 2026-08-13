import { prisma } from '@/lib/prisma'
import {
  isPushConfigured,
  sendMilkExpiryPushes,
  sendPushToAll,
  shouldSendDiaperReminder,
  shouldSendFeedingReminder,
  shouldSendVaccineReminder,
  markDiaperPushSent,
  markPushSent,
} from '@/lib/push-server'
import {
  DEFAULT_DIAPER_INTERVAL_MINUTES,
  DEFAULT_FEEDING_INTERVAL_MINUTES,
  envReminderMinutes,
  storedHoursToReminderMinutes,
} from '@/lib/reminder'

export type PushReminderResult = {
  type: 'vaccine' | 'milk' | 'feeding' | 'diaper'
  count: number
}

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

/** Jalankan semua cek push (vaksin, ASI, menyusui, popok) — untuk cron & scheduler in-app. */
export async function runAllPushReminders(): Promise<{
  results: PushReminderResult[]
  sentAny: boolean
}> {
  if (!isPushConfigured()) {
    return { results: [], sentAny: false }
  }

  const hasSub = await prisma.pushSubscription.findFirst()
  if (!hasSub) {
    return { results: [], sentAny: false }
  }

  const results: PushReminderResult[] = []

  const vaccine = await shouldSendVaccineReminder()
  if (vaccine.shouldSend) {
    const result = await sendPushToAll({
      title: vaccine.title,
      body: vaccine.body,
      url: vaccine.url,
    })
    if (result.sent > 0) {
      await markPushSent()
      results.push({ type: 'vaccine', count: result.sent })
    }
  }

  const milk = await sendMilkExpiryPushes()
  if (milk.sent > 0) {
    results.push({ type: 'milk', count: milk.sent })
  }

  const feedingInterval = await getFeedingIntervalMinutes()
  const feeding = await shouldSendFeedingReminder(feedingInterval)
  if (feeding.shouldSend) {
    const title = 'Waktunya menyusui 🍼'
    const body = feeding.babyName
      ? `${feeding.babyName} mungkin sudah lapar — cek jadwal menyusui`
      : 'Sudah waktunya cek jadwal menyusui'
    const result = await sendPushToAll({ title, body })
    if (result.sent > 0) {
      await markPushSent()
      results.push({ type: 'feeding', count: result.sent })
    }
  }

  const diaperInterval = await getDiaperIntervalMinutes()
  const diaper = await shouldSendDiaperReminder(diaperInterval)
  if (diaper.shouldSend) {
    const title = 'Waktunya popok'
    const body = diaper.babyName
      ? `Cek popok ${diaper.babyName} — sudah waktunya`
      : 'Sudah waktunya cek popok'
    const result = await sendPushToAll({ title, body })
    if (result.sent > 0) {
      await markDiaperPushSent()
      results.push({ type: 'diaper', count: result.sent })
    }
  }

  return { results, sentAny: results.length > 0 }
}
