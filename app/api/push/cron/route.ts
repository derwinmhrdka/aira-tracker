import { NextRequest, NextResponse } from 'next/server'
import { isPushConfigured } from '@/lib/push-server'
import { runAllPushReminders } from '@/lib/run-push-reminders'

export async function GET(request: NextRequest) {
  const secret = request.headers.get('x-cron-secret')
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!isPushConfigured()) {
    return NextResponse.json({ sent: false, reason: 'not_configured' })
  }

  const { results, sentAny } = await runAllPushReminders()

  if (!sentAny) {
    return NextResponse.json({ sent: false, reason: 'not_due' })
  }

  return NextResponse.json({ sent: true, results })
}
