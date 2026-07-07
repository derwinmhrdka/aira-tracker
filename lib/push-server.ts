import webpush from 'web-push'
import { prisma } from '@/lib/prisma'
import { ageInMonths } from '@/lib/baby-utils'
import { getVaccineStatus } from '@/lib/immunization-utils'

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

  const overdue = await prisma.immunization.findMany({
    where: { isDone: false },
    orderBy: { scheduledAgeMonths: 'asc' },
  })

  const overdueList = overdue.filter(
    (v) => getVaccineStatus(false, v.scheduledAgeMonths, babyAge) === 'overdue'
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

export async function shouldSendFeedingReminder(intervalHours: number) {
  const lastFeed = await prisma.feedingLog.findFirst({
    orderBy: { timestampStart: 'desc' },
  })
  if (!lastFeed) return { shouldSend: false, babyName: null as string | null }

  const hoursSince =
    (Date.now() - lastFeed.timestampStart.getTime()) / (1000 * 60 * 60)
  if (hoursSince < intervalHours) {
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

export async function markPushSent() {
  await prisma.pushSubscription.updateMany({
    data: { lastNotifiedAt: new Date() },
  })
}
