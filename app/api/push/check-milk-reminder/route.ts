import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-helpers'
import { isPushConfigured, sendMilkExpiryPushes } from '@/lib/push-server'

export async function POST() {
  return withAuth(async () => {
    if (!isPushConfigured()) {
      return NextResponse.json({ sent: false, reason: 'not_configured' })
    }

    const result = await sendMilkExpiryPushes()
    return NextResponse.json({
      sent: result.sent > 0,
      count: result.sent,
      type: 'milk',
    })
  })
}
