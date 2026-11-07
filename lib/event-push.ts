import { prisma } from '@/lib/prisma'
import { sendPushToAll } from '@/lib/push-server'

const TZ = 'Asia/Jakarta'
const HOUR_BEFORE_MS = 60 * 60 * 1000

function jakartaDateKey(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

function formatJakartaTime(date: Date): string {
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: TZ,
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

/** 07:00 Asia/Jakarta on the event day, or midnight if the visit is earlier than that. */
export function eventDayReminderAt(startAt: Date): number {
  const key = jakartaDateKey(startAt)
  const morning = new Date(`${key}T07:00:00+07:00`).getTime()
  if (morning < startAt.getTime()) return morning
  return new Date(`${key}T00:00:00+07:00`).getTime()
}

export function eventHourReminderAt(startAt: Date): number {
  return startAt.getTime() - HOUR_BEFORE_MS
}

function eventBody(event: { startAt: Date; location: string | null; meetWith: string | null }) {
  const bits = [formatJakartaTime(event.startAt), event.location, event.meetWith].filter(Boolean)
  return bits.join(' · ')
}

/** Next event reminder instant, including ones already due. */
export async function getNextEventReminderAt(now = Date.now()): Promise<number | null> {
  const events = await prisma.calendarEvent.findMany({
    where: { endAt: { gte: new Date(now) } },
    select: { startAt: true, endAt: true, dayNotifiedAt: true, hourNotifiedAt: true },
  })

  let next: number | null = null
  for (const event of events) {
    const due: number[] = []
    if (!event.dayNotifiedAt) due.push(eventDayReminderAt(event.startAt))
    if (!event.hourNotifiedAt && eventHourReminderAt(event.startAt) < event.startAt.getTime()) {
      due.push(eventHourReminderAt(event.startAt))
    }
    for (const at of due) {
      if (at >= event.endAt.getTime()) continue
      const when = at <= now ? now : at
      if (next == null || when < next) next = when
    }
  }
  return next
}

/** Hari H and 1 hour before. Each event sends each kind once. */
export async function sendEventReminders(now = Date.now()): Promise<{ sent: number }> {
  const events = await prisma.calendarEvent.findMany({
    where: { endAt: { gte: new Date(now) } },
  })

  let sent = 0
  const todayKey = jakartaDateKey(new Date(now))

  for (const event of events) {
    const start = event.startAt.getTime()
    const end = event.endAt.getTime()
    const dayAt = eventDayReminderAt(event.startAt)
    const hourAt = eventHourReminderAt(event.startAt)
    const body = eventBody(event)
    const url = '/?p=events'

    if (
      !event.dayNotifiedAt &&
      jakartaDateKey(event.startAt) === todayKey &&
      now >= dayAt &&
      now < end
    ) {
      const result = await sendPushToAll({
        title: `Hari ini: ${event.title}`,
        body: body || 'Ada jadwal hari ini',
        url,
      })
      if (result.sent > 0) {
        await prisma.calendarEvent.update({
          where: { id: event.id },
          data: { dayNotifiedAt: new Date(now) },
        })
        sent += result.sent
      }
    }

    if (!event.hourNotifiedAt && now >= hourAt && now < start) {
      const result = await sendPushToAll({
        title: `1 jam lagi: ${event.title}`,
        body: body || 'Jadwal mulai sekitar 1 jam lagi',
        url,
      })
      if (result.sent > 0) {
        await prisma.calendarEvent.update({
          where: { id: event.id },
          data: { hourNotifiedAt: new Date(now) },
        })
        sent += result.sent
      }
    }
  }

  return { sent }
}
