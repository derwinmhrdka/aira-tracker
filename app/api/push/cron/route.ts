import { NextRequest, NextResponse } from 'next/server'
import {
  isPushConfigured,
  sendPushToAll,
  shouldSendFeedingReminder,
  shouldSendVaccineReminder,
  markPushSent,
} from '@/lib/push-server'

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

  const intervalHours = Number(
    request.nextUrl.searchParams.get('hours') ??
      process.env.FEEDING_REMINDER_HOURS ??
      3
  )

  const feeding = await shouldSendFeedingReminder(intervalHours)
  if (!feeding.shouldSend) {
    return NextResponse.json({ sent: false, reason: 'not_due' })
  }

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
