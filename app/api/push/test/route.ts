import { NextRequest, NextResponse } from 'next/server'
import { isPushConfigured, sendPushToAll } from '@/lib/push-server'

function verifyCronSecret(request: NextRequest): boolean {
  const secret = request.headers.get('x-cron-secret')
  return Boolean(process.env.CRON_SECRET && secret === process.env.CRON_SECRET)
}

export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!isPushConfigured()) {
    return NextResponse.json({ sent: false, reason: 'not_configured' })
  }

  const params = request.nextUrl.searchParams
  const title = params.get('title')?.trim() || '🧪 Test push'
  const body =
    params.get('body')?.trim() || 'Notifikasi uji dari Aira Tracker — push berhasil.'
  const url = params.get('url')?.trim() || '/'

  const result = await sendPushToAll({ title, body, url })

  return NextResponse.json({
    sent: result.sent > 0,
    count: result.sent,
    total: result.total,
    type: 'test',
  })
}
