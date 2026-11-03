import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { buildIcs } from '@/lib/calendar-link'

export async function GET(request: NextRequest) {
  const session = await requireAuth()
  if (!session) return new Response('Unauthorized', { status: 401 })

  const query = request.nextUrl.searchParams
  const title = query.get('title')?.trim()
  const start = query.get('start')
  const end = query.get('end')
  if (!title || !start || !end || Number.isNaN(Date.parse(start)) || Number.isNaN(Date.parse(end))) {
    return new Response('Missing event', { status: 400 })
  }

  const ics = buildIcs({
    title,
    start_at: start,
    end_at: end,
    location: query.get('location'),
    meet_with: query.get('meet'),
    notes: query.get('notes'),
  })

  return new Response(ics, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="acara.ics"',
      'Cache-Control': 'no-store',
    },
  })
}
