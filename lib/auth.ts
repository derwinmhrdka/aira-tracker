import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from './prisma'
import { sessionOptions, type SessionData } from './session'

export async function getSession() {
  const cookieStore = await cookies()
  return getIronSession<SessionData>(cookieStore, sessionOptions)
}

export async function getSessionFromRequest(
  request: NextRequest,
  response: NextResponse
) {
  return getIronSession<SessionData>(request, response, sessionOptions)
}

export async function requireAuth() {
  const session = await getSession()
  if (!session.isLoggedIn) {
    return null
  }
  return session
}

export async function verifyPin(pin: string): Promise<boolean> {
  const user = await prisma.user.findFirst()
  if (!user) return false
  return bcrypt.compare(pin, user.pinHash)
}

export async function hashPin(pin: string): Promise<string> {
  return bcrypt.hash(pin, 12)
}

export function unauthorizedResponse() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
