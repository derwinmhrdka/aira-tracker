import type { SessionOptions } from 'iron-session'
import type { LoggedBy } from '@prisma/client'

export interface SessionData {
  isLoggedIn: boolean
  loggedBy?: LoggedBy
}

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET!,
  cookieName: 'baby_tracker_session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  },
}
