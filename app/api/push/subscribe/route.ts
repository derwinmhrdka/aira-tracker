import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-helpers'
import {
  parseReminderMinutes,
  reminderMinutesToStoredHours,
  MIN_REMINDER_MINUTES,
  MAX_REMINDER_MINUTES,
  DEFAULT_FEEDING_INTERVAL_MINUTES,
  DEFAULT_DIAPER_INTERVAL_MINUTES,
} from '@/lib/reminder'

function validateIntervalMinutes(minutes: number) {
  return minutes >= MIN_REMINDER_MINUTES && minutes <= MAX_REMINDER_MINUTES
}

export async function POST(request: NextRequest) {
  return withAuth(async () => {
    const body = await request.json()
    const endpoint = body.endpoint as string
    const keys = body.keys as { p256dh: string; auth: string }
    const feedingMinutes = parseReminderMinutes(
      body.feeding_reminder_minutes,
      body.feeding_reminder_hours,
      DEFAULT_FEEDING_INTERVAL_MINUTES
    )
    const diaperMinutes = parseReminderMinutes(
      body.diaper_reminder_minutes,
      body.diaper_reminder_hours,
      DEFAULT_DIAPER_INTERVAL_MINUTES
    )
    const feedingEnabled = body.feeding_reminder_enabled !== false
    const diaperEnabled = Boolean(body.diaper_reminder_enabled)

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 })
    }

    if (!validateIntervalMinutes(feedingMinutes) || !validateIntervalMinutes(diaperMinutes)) {
      return NextResponse.json({ error: 'Invalid reminder interval' }, { status: 400 })
    }

    await prisma.pushSubscription.upsert({
      where: { endpoint },
      create: {
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        feedingReminderHours: reminderMinutesToStoredHours(feedingMinutes),
        feedingReminderEnabled: feedingEnabled,
        diaperReminderHours: reminderMinutesToStoredHours(diaperMinutes),
        diaperReminderEnabled: diaperEnabled,
      },
      update: {
        p256dh: keys.p256dh,
        auth: keys.auth,
        feedingReminderHours: reminderMinutesToStoredHours(feedingMinutes),
        feedingReminderEnabled: feedingEnabled,
        diaperReminderHours: reminderMinutesToStoredHours(diaperMinutes),
        diaperReminderEnabled: diaperEnabled,
      },
    })

    return NextResponse.json({ success: true })
  })
}

export async function PATCH(request: NextRequest) {
  return withAuth(async () => {
    const body = await request.json()
    const data: {
      feedingReminderHours?: number
      feedingReminderEnabled?: boolean
      diaperReminderHours?: number
      diaperReminderEnabled?: boolean
    } = {}

    if (body.feeding_reminder_minutes != null || body.feeding_reminder_hours != null) {
      const minutes = parseReminderMinutes(
        body.feeding_reminder_minutes,
        body.feeding_reminder_hours,
        DEFAULT_FEEDING_INTERVAL_MINUTES
      )
      if (!validateIntervalMinutes(minutes)) {
        return NextResponse.json({ error: 'Invalid feeding interval' }, { status: 400 })
      }
      data.feedingReminderHours = reminderMinutesToStoredHours(minutes)
    }

    if (body.feeding_reminder_enabled != null) {
      data.feedingReminderEnabled = Boolean(body.feeding_reminder_enabled)
    }

    if (body.diaper_reminder_minutes != null || body.diaper_reminder_hours != null) {
      const minutes = parseReminderMinutes(
        body.diaper_reminder_minutes,
        body.diaper_reminder_hours,
        DEFAULT_DIAPER_INTERVAL_MINUTES
      )
      if (!validateIntervalMinutes(minutes)) {
        return NextResponse.json({ error: 'Invalid diaper interval' }, { status: 400 })
      }
      data.diaperReminderHours = reminderMinutesToStoredHours(minutes)
    }

    if (body.diaper_reminder_enabled != null) {
      data.diaperReminderEnabled = Boolean(body.diaper_reminder_enabled)
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    await prisma.pushSubscription.updateMany({ data })

    return NextResponse.json({ success: true })
  })
}

export async function DELETE(request: NextRequest) {
  return withAuth(async () => {
    const body = await request.json().catch(() => ({}))
    const endpoint = body.endpoint as string | undefined

    if (endpoint) {
      await prisma.pushSubscription.deleteMany({ where: { endpoint } })
    } else {
      await prisma.pushSubscription.deleteMany()
    }

    return NextResponse.json({ success: true })
  })
}
