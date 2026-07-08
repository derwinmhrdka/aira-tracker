import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-helpers'

export async function POST(request: NextRequest) {
  return withAuth(async () => {
    const body = await request.json()
    const endpoint = body.endpoint as string
    const keys = body.keys as { p256dh: string; auth: string }
    const intervalHours = Number(body.feeding_reminder_hours ?? 3)

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 })
    }

    await prisma.pushSubscription.upsert({
      where: { endpoint },
      create: {
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        feedingReminderHours: intervalHours,
      },
      update: {
        p256dh: keys.p256dh,
        auth: keys.auth,
        feedingReminderHours: intervalHours,
      },
    })

    return NextResponse.json({ success: true })
  })
}

export async function PATCH(request: NextRequest) {
  return withAuth(async () => {
    const body = await request.json()
    const intervalHours = Number(body.feeding_reminder_hours)
    if (!intervalHours || intervalHours < 1 || intervalHours > 12) {
      return NextResponse.json({ error: 'Invalid interval' }, { status: 400 })
    }

    await prisma.pushSubscription.updateMany({
      data: { feedingReminderHours: intervalHours },
    })

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
