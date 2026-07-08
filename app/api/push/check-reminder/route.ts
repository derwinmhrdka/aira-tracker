import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-helpers'
import {
  isPushConfigured,
  sendPushToAll,
  shouldSendFeedingReminder,
  shouldSendDiaperReminder,
  markPushSent,
  markDiaperPushSent,
} from '@/lib/push-server'
import {
  parseReminderMinutes,
  DEFAULT_FEEDING_INTERVAL_MINUTES,
  DEFAULT_DIAPER_INTERVAL_MINUTES,
} from '@/lib/reminder'

export async function POST(request: NextRequest) {
  return withAuth(async () => {
    if (!isPushConfigured()) {
      return NextResponse.json({ sent: false, reason: 'not_configured' })
    }

    const body = await request.json().catch(() => ({}))
    const type = body.type === 'diaper' ? 'diaper' : 'feeding'
    const intervalMinutes = parseReminderMinutes(
      body.interval_minutes,
      body.interval_hours,
      type === 'diaper' ? DEFAULT_DIAPER_INTERVAL_MINUTES : DEFAULT_FEEDING_INTERVAL_MINUTES
    )

    if (type === 'diaper') {
      const { shouldSend, babyName } = await shouldSendDiaperReminder(intervalMinutes)
      if (!shouldSend) {
        return NextResponse.json({ sent: false, reason: 'not_due' })
      }

      const title = 'Waktunya popok 🔄'
      const bodyText = babyName
        ? `Cek popok ${babyName} — sudah waktunya`
        : 'Sudah waktunya cek popok'

      const result = await sendPushToAll({ title, body: bodyText })
      if (result.sent > 0) await markDiaperPushSent()

      return NextResponse.json({ sent: result.sent > 0, count: result.sent, type: 'diaper' })
    }

    const { shouldSend, babyName } = await shouldSendFeedingReminder(intervalMinutes)
    if (!shouldSend) {
      return NextResponse.json({ sent: false, reason: 'not_due' })
    }

    const title = 'Waktunya menyusui 🍼'
    const bodyText = babyName
      ? `${babyName} mungkin sudah lapar — cek jadwal menyusui`
      : 'Sudah waktunya cek jadwal menyusui'

    const result = await sendPushToAll({ title, body: bodyText })
    if (result.sent > 0) await markPushSent()

    return NextResponse.json({ sent: result.sent > 0, count: result.sent, type: 'feeding' })
  })
}
