import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-helpers'

export async function GET() {
  return withAuth(async () => {
    const items = await prisma.developmentChecklist.findMany({
      orderBy: [
        { ageGroupMonths: 'asc' },
        { category: 'asc' },
        { question: 'asc' },
      ],
    })

    return NextResponse.json(
      items.map((i) => ({
        id: i.id,
        age_group_months: i.ageGroupMonths,
        category: i.category,
        question: i.question,
        is_checked: i.isChecked,
        date_checked: i.dateChecked?.toISOString().split('T')[0] ?? null,
      }))
    )
  })
}

export async function PATCH(request: NextRequest) {
  return withAuth(async () => {
    const body = await request.json()

    if (!body.id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    const isChecked = body.is_checked ?? false

    const item = await prisma.developmentChecklist.update({
      where: { id: body.id },
      data: {
        isChecked,
        dateChecked: isChecked ? new Date() : null,
      },
    })

    return NextResponse.json({
      id: item.id,
      is_checked: item.isChecked,
      date_checked: item.dateChecked?.toISOString().split('T')[0] ?? null,
    })
  })
}
