import { NextRequest, NextResponse } from 'next/server'
import { getSession, verifyPin } from '@/lib/auth'
import { parseLoggedBy } from '@/lib/api-helpers'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { pin, logged_by: loggedByRaw } = body

    if (!pin || typeof pin !== 'string') {
      return NextResponse.json({ error: 'PIN required' }, { status: 400 })
    }

    const valid = await verifyPin(pin)
    if (!valid) {
      return NextResponse.json({ error: 'PIN salah' }, { status: 401 })
    }

    const session = await getSession()
    session.isLoggedIn = true
    session.loggedBy = parseLoggedBy(loggedByRaw)
    await session.save()

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Login failed' }, { status: 500 })
  }
}
