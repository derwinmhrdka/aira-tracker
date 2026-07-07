import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-helpers'

export async function GET() {
  return withAuth(async () => {
    const milestones = await prisma.milestone.findMany({
      orderBy: { date: 'desc' },
    })

    return NextResponse.json(
      milestones.map((m) => ({
        id: m.id,
        date: m.date.toISOString().split('T')[0],
        title: m.title,
        description: m.description,
        photo_url: m.photoUrl,
      }))
    )
  })
}

export async function POST(request: NextRequest) {
  return withAuth(async () => {
    const body = await request.json()

    if (!body.date || !body.title) {
      return NextResponse.json(
        { error: 'date and title are required' },
        { status: 400 }
      )
    }

    const milestone = await prisma.milestone.create({
      data: {
        date: new Date(body.date),
        title: body.title,
        description: body.description ?? null,
        photoUrl: body.photo_url ?? null,
      },
    })

    return NextResponse.json({
      id: milestone.id,
      date: milestone.date.toISOString().split('T')[0],
      title: milestone.title,
    })
  })
}
