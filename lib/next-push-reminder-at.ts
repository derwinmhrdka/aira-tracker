import { prisma } from '@/lib/prisma'
import { resolveSlotReminder } from '@/lib/milk-storage'
import { getMilkReminderSettingsFromDb } from '@/lib/push-server'
import {
  DEFAULT_DIAPER_INTERVAL_MINUTES,
  DEFAULT_FEEDING_INTERVAL_MINUTES,
  envReminderMinutes,
  storedHoursToReminderMinutes,
} from '@/lib/reminder'

const FEEDING_COOLDOWN_MS = 30 * 60 * 1000
const DIAPER_COOLDOWN_MS = 30 * 60 * 1000
/** Re-evaluate at least every minute (data bisa berubah). */
export const PUSH_SCHEDULER_MAX_WAIT_MS = 60_000
/** Saat ≤60 detik menuju jadwal, tunggu tepat waktu. */
export const PUSH_SCHEDULER_PRECISION_MS = 60_000

async function getFeedingIntervalMinutes(): Promise<number> {
  const sub = await prisma.pushSubscription.findFirst({
    where: { feedingReminderHours: { not: null } },
    select: { feedingReminderHours: true, feedingReminderEnabled: true },
  })
  if (!sub?.feedingReminderEnabled) return 0
  if (sub.feedingReminderHours != null) {
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
  if (!sub) return 0
  if (sub.diaperReminderHours != null) {
    return storedHoursToReminderMinutes(sub.diaperReminderHours)
  }
  return envReminderMinutes(
    'DIAPER_REMINDER_MINUTES',
    'DIAPER_REMINDER_HOURS',
    DEFAULT_DIAPER_INTERVAL_MINUTES
  )
}

function minTime(candidates: number[]): number | null {
  const future = candidates.filter((t) => Number.isFinite(t))
  if (future.length === 0) return null
  return Math.min(...future)
}

/** Waktu (ms) reminder push berikutnya; null jika tidak ada jadwal aktif. */
export async function getNextReminderDueAt(now = Date.now()): Promise<number | null> {
  const hasSub = await prisma.pushSubscription.findFirst()
  if (!hasSub) return null

  const candidates: number[] = []

  const milkSettings = await getMilkReminderSettingsFromDb()
  if (milkSettings.enabled) {
    const slots = await prisma.milkStorageSlot.findMany({
      where: {
        expiresAt: { not: null },
        amountMl: { gt: 0 },
        filledAt: { not: null },
      },
      select: {
        expiresAt: true,
        expiryPushNotifiedFor: true,
        reminderEnabled: true,
        warnBeforeMinutes: true,
      },
    })

    for (const slot of slots) {
      if (!slot.expiresAt) continue
      const resolved = resolveSlotReminder(
        {
          reminder_enabled: slot.reminderEnabled,
          warn_before_minutes: slot.warnBeforeMinutes,
        },
        milkSettings
      )
      if (!resolved.enabled) continue

      const exp = slot.expiresAt.getTime()
      if (slot.expiryPushNotifiedFor?.getTime() === exp) continue

      const warnAt = exp - resolved.warnBeforeMinutes * 60_000
      if (now >= warnAt) {
        candidates.push(now)
      } else {
        candidates.push(warnAt)
      }
    }
  }

  const feedingInterval = await getFeedingIntervalMinutes()
  if (feedingInterval > 0) {
    const activeFeed = await prisma.feedingLog.findFirst({
      where: { timestampEnd: null },
      orderBy: { timestampStart: 'desc' },
    })
    if (!activeFeed) {
      const lastCompleted = await prisma.feedingLog.findFirst({
        where: { timestampEnd: { not: null } },
        orderBy: { timestampEnd: 'desc' },
        select: { timestampEnd: true },
      })
      const recentPush = await prisma.pushSubscription.findFirst({
        where: {
          lastNotifiedAt: { gte: new Date(now - FEEDING_COOLDOWN_MS) },
        },
        select: { lastNotifiedAt: true },
      })

      const dueFromFeed = lastCompleted?.timestampEnd
        ? lastCompleted.timestampEnd.getTime() + feedingInterval * 60_000
        : null
      const dueFromCooldown = recentPush?.lastNotifiedAt
        ? recentPush.lastNotifiedAt.getTime() + FEEDING_COOLDOWN_MS
        : null

      if (dueFromFeed != null || dueFromCooldown != null) {
        const due = Math.max(dueFromFeed ?? 0, dueFromCooldown ?? 0)
        candidates.push(due <= now ? now : due)
      }
    }
  }

  const diaperInterval = await getDiaperIntervalMinutes()
  if (diaperInterval > 0) {
    const lastDiaper = await prisma.diaperLog.findFirst({
      orderBy: { timestamp: 'desc' },
      select: { timestamp: true },
    })
    const recentPush = await prisma.pushSubscription.findFirst({
      where: {
        lastDiaperNotifiedAt: { gte: new Date(now - DIAPER_COOLDOWN_MS) },
      },
      select: { lastDiaperNotifiedAt: true },
    })

    if (lastDiaper) {
      const dueFromDiaper =
        lastDiaper.timestamp.getTime() + diaperInterval * 60_000
      const dueFromCooldown = recentPush?.lastDiaperNotifiedAt
        ? recentPush.lastDiaperNotifiedAt.getTime() + DIAPER_COOLDOWN_MS
        : null
      const due = Math.max(dueFromDiaper, dueFromCooldown ?? 0)
      candidates.push(due <= now ? now : due)
    }
  }

  return minTime(candidates)
}

/** Hitung delay ms sebelum cek/s kirim push berikutnya. */
export function computeSchedulerDelay(
  nextDueAt: number | null,
  now = Date.now()
): number {
  if (nextDueAt == null) return PUSH_SCHEDULER_MAX_WAIT_MS
  const until = nextDueAt - now
  if (until <= 0) return 0
  if (until <= PUSH_SCHEDULER_PRECISION_MS) return until
  return PUSH_SCHEDULER_MAX_WAIT_MS
}
