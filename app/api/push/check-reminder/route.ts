import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-helpers'
import {
  isPushConfigured,
  sendPushToAll,
  shouldSendFeedingReminder,
  markPushSent,
} from '@/lib/push-server'

export async function POST(request: NextRequest) {
  return withAuth(async () => {
    if (!isPushConfigured()) {
      return NextResponse.json({ sent: false, reason: 'not_configured' })
    }

    const body = await request.json().catch(() => ({}))
    const intervalHours = Number(body.interval_hours ?? 3)

    const { shouldSend, babyName } = await shouldSendFeedingReminder(intervalHours)
    if (!shouldSend) {
      return NextResponse.json({ sent: false, reason: 'not_due' })
    }

    const title = 'Waktunya menyusui 🍼'
    const bodyText = babyName
      ? `${babyName} mungkin sudah lapar — cek jadwal menyusui`
      : 'Sudah waktunya cek jadwal menyusui'

    const result = await sendPushToAll({ title, body: bodyText })
    if (result.sent > 0) {
      await markPushSent()
    }

    return NextResponse.json({ sent: result.sent > 0, count: result.sent })
  })
}
