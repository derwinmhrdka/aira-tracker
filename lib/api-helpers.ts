import { NextResponse } from 'next/server'
import type { LoggedBy } from '@prisma/client'
import { requireAuth } from './auth'

export async function withAuth<T>(
  handler: (loggedBy?: LoggedBy) => Promise<NextResponse<T>>
) {
  const session = await requireAuth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return handler(session.loggedBy)
}

export function parseLoggedBy(value: unknown): LoggedBy | undefined {
  if (value === 'AYAH' || value === 'IBU' || value === 'PENGASUH') {
    return value
  }
  return undefined
}

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}
