import { NextRequest, NextResponse } from 'next/server'
import { getSession, verifyPin } from '@/lib/auth'
import { parseLoggedBy } from '@/lib/api-helpers'
import { checkRateLimit, resetRateLimit } from '@/lib/rate-limit'

function clientIp(request: NextRequest) {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  )
}

export async function POST(request: NextRequest) {
  try {
    const ip = clientIp(request)
    const limit = checkRateLimit(`login:${ip}`)
    if (!limit.allowed) {
      return NextResponse.json(
        {
          error: `Terlalu banyak percobaan. Coba lagi dalam ${limit.retryAfterSec} detik.`,
        },
        { status: 429 }
      )
    }

    const body = await request.json()
    const { pin, logged_by: loggedByRaw } = body

    if (!pin || typeof pin !== 'string') {
      return NextResponse.json({ error: 'PIN required' }, { status: 400 })
    }

    const valid = await verifyPin(pin)
    if (!valid) {
      return NextResponse.json({ error: 'PIN salah' }, { status: 401 })
    }

    resetRateLimit(`login:${ip}`)

    const session = await getSession()
    session.isLoggedIn = true
    session.loggedBy = parseLoggedBy(loggedByRaw)
    await session.save()

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Login failed' }, { status: 500 })
  }
}
