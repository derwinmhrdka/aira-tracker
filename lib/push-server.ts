import webpush from 'web-push'
import { prisma } from '@/lib/prisma'
import { ageInMonths, ageInWeeks } from '@/lib/baby-utils'
import { getVaccineStatus } from '@/lib/immunization-utils'
import { MILK_REMINDER_SETTINGS_KEY, parseMilkReminderSettings, resolveSlotReminder } from '@/lib/milk-storage'

const publicKey = process.env.VAPID_PUBLIC_KEY
const privateKey = process.env.VAPID_PRIVATE_KEY
const subject = process.env.VAPID_SUBJECT || 'mailto:admin@localhost'

export function isPushConfigured() {
  return Boolean(publicKey && privateKey)
}

export function getVapidPublicKey() {
  return publicKey ?? null
}

function ensureConfigured() {
  if (!publicKey || !privateKey) {
    throw new Error('VAPID keys not configured')
  }
  webpush.setVapidDetails(subject, publicKey, privateKey)
}

export async function sendPushToAll(payload: {
  title: string
  body: string
  url?: string
}) {
  ensureConfigured()

  const subs = await prisma.pushSubscription.findMany()
  const data = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url ?? '/',
  })

  const results = await Promise.allSettled(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          data
        )
        return sub.id
      } catch (err: unknown) {
        const status = (err as { statusCode?: number })?.statusCode
        if (status === 404 || status === 410) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } })
        }
        throw err
      }
    })
  )

  const sent = results.filter((r) => r.status === 'fulfilled').length
  return { sent, total: subs.length }
}

export async function shouldSendVaccineReminder() {
  const profile = await prisma.babyProfile.findFirst()
  if (!profile) return { shouldSend: false as const }

  const birthDate = profile.birthDate.toISOString().split('T')[0]
  const babyAge = ageInMonths(birthDate)
  const babyAgeWeeks = ageInWeeks(birthDate)

  const overdue = await prisma.immunization.findMany({
    where: { isDone: false },
    orderBy: { scheduledAgeMonths: 'asc' },
  })

  const overdueList = overdue.filter(
    (v) =>
      getVaccineStatus(false, v.scheduledAgeMonths, babyAge, {
        scheduledAgeWeeks: v.scheduledAgeWeeks,
        minWeeks: v.minWeeks,
        maxWeeks: v.maxWeeks,
        babyAgeWeeks,
      }) === 'overdue'
  )

  if (overdueList.length === 0) {
    return { shouldSend: false as const }
  }

  const recentPush = await prisma.pushSubscription.findFirst({
    where: {
      lastNotifiedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    },
  })
  if (recentPush) {
    return { shouldSend: false as const }
  }

  const names = overdueList.slice(0, 2).map((v) => v.vaccineName).join(', ')
  const extra = overdueList.length > 2 ? ` +${overdueList.length - 2} lainnya` : ''

  return {
    shouldSend: true as const,
    babyName: profile.name,
    title: '⚠️ Vaksin terlambat',
    body: `${profile.name}: ${names}${extra} — segera ke puskesmas/RS`,
    url: '/?p=immunizations',
  }
}

export async function shouldSendFeedingReminder(intervalMinutes: number) {
  const sub = await prisma.pushSubscription.findFirst({
    where: { feedingReminderEnabled: true },
  })
  if (!sub) return { shouldSend: false, babyName: null as string | null }

  // Do not remind while a feeding session is still active.
  const activeFeed = await prisma.feedingLog.findFirst({
    where: { timestampEnd: null },
    orderBy: { timestampStart: 'desc' },
  })
  if (activeFeed) return { shouldSend: false, babyName: null as string | null }

  // Trigger from latest completed feeding action (timestampEnd).
  const lastCompletedFeed = await prisma.feedingLog.findFirst({
    where: { timestampEnd: { not: null } },
    orderBy: { timestampEnd: 'desc' },
  })
  if (!lastCompletedFeed?.timestampEnd) {
    return { shouldSend: false, babyName: null as string | null }
  }

  const minutesSince =
    (Date.now() - lastCompletedFeed.timestampEnd.getTime()) / (1000 * 60)
  if (minutesSince < intervalMinutes) {
    return { shouldSend: false, babyName: null as string | null }
  }

  const recentPush = await prisma.pushSubscription.findFirst({
    where: {
      lastNotifiedAt: {
        gte: new Date(Date.now() - 30 * 60 * 1000),
      },
    },
  })
  if (recentPush) {
    return { shouldSend: false, babyName: null as string | null }
  }

  const profile = await prisma.babyProfile.findFirst()
  return { shouldSend: true, babyName: profile?.name ?? null }
}

export async function shouldSendDiaperReminder(intervalMinutes: number) {
  const sub = await prisma.pushSubscription.findFirst({
    where: { diaperReminderEnabled: true },
  })
  if (!sub) return { shouldSend: false, babyName: null as string | null }

  const lastDiaper = await prisma.diaperLog.findFirst({
    orderBy: { timestamp: 'desc' },
  })
  if (!lastDiaper) return { shouldSend: false, babyName: null as string | null }

  const minutesSince =
    (Date.now() - lastDiaper.timestamp.getTime()) / (1000 * 60)
  if (minutesSince < intervalMinutes) {
    return { shouldSend: false, babyName: null as string | null }
  }

  const recentPush = await prisma.pushSubscription.findFirst({
    where: {
      lastDiaperNotifiedAt: {
        gte: new Date(Date.now() - 30 * 60 * 1000),
      },
    },
  })
  if (recentPush) {
    return { shouldSend: false, babyName: null as string | null }
  }

  const profile = await prisma.babyProfile.findFirst()
  return { shouldSend: true, babyName: profile?.name ?? null }
}

export async function markPushSent() {
  await prisma.pushSubscription.updateMany({
    data: { lastNotifiedAt: new Date() },
  })
}

export async function markDiaperPushSent() {
  await prisma.pushSubscription.updateMany({
    data: { lastDiaperNotifiedAt: new Date() },
  })
}

export async function getMilkReminderSettingsFromDb() {
  const row = await prisma.appSetting.findUnique({
    where: { key: MILK_REMINDER_SETTINGS_KEY },
  })
  return parseMilkReminderSettings(row?.value ?? null)
}

export async function sendMilkExpiryPushes(): Promise<{ sent: number }> {
  const settings = await getMilkReminderSettingsFromDb()

  const hasSub = await prisma.pushSubscription.findFirst()
  if (!hasSub) return { sent: 0 }

  const now = Date.now()

  const slots = await prisma.milkStorageSlot.findMany({
    where: {
      expiresAt: { not: null },
      amountMl: { gt: 0 },
      filledAt: { not: null },
    },
    orderBy: { expiresAt: 'asc' },
  })

  let sent = 0
  for (const slot of slots) {
    if (!slot.expiresAt) continue

    const resolved = resolveSlotReminder(
      {
        reminder_enabled: slot.reminderEnabled,
        warn_before_minutes: slot.warnBeforeMinutes,
      },
      settings
    )
    if (!resolved.enabled) continue

    const exp = slot.expiresAt.getTime()
    const warnMs = resolved.warnBeforeMinutes * 60 * 1000
    if (exp - now > warnMs) continue
    if (slot.expiryPushNotifiedFor?.getTime() === exp) continue

    const ml = slot.amountMl ?? 0
    const expired = exp <= now
    const result = await sendPushToAll({
      title: expired
        ? '🥛 ASI sudah melewati batas waktu'
        : '🥛 ASI hampir melewati batas',
      body: expired
        ? `Botol ${slot.slotIndex + 1} (${ml} ml) sudah kadaluarsa — cek freezer`
        : `Botol ${slot.slotIndex + 1} (${ml} ml) mendekati batas waktu`,
      url: '/',
    })

    if (result.sent > 0) {
      await prisma.milkStorageSlot.update({
        where: { id: slot.id },
        data: { expiryPushNotifiedFor: slot.expiresAt },
      })
      sent += result.sent
    }
  }

  return { sent }
}
