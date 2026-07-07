import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-helpers'
import { ageInMonths } from '@/lib/baby-utils'
import { getVaccineStatus } from '@/lib/immunization-utils'

function formatItem(
  i: {
    id: string
    vaccineName: string
    scheduledAgeMonths: number
    isDone: boolean
    dateGiven: Date | null
    notes: string | null
    isCustom: boolean
  },
  babyAgeMonths: number
) {
  return {
    id: i.id,
    vaccine_name: i.vaccineName,
    scheduled_age_months: i.scheduledAgeMonths,
    is_done: i.isDone,
    date_given: i.dateGiven?.toISOString().split('T')[0] ?? null,
    notes: i.notes,
    is_custom: i.isCustom,
    status: getVaccineStatus(i.isDone, i.scheduledAgeMonths, babyAgeMonths),
  }
}

export async function GET() {
  return withAuth(async () => {
    const [items, profile] = await Promise.all([
      prisma.immunization.findMany({
        orderBy: [{ scheduledAgeMonths: 'asc' }, { vaccineName: 'asc' }],
      }),
      prisma.babyProfile.findFirst(),
    ])

    const birthDate = profile?.birthDate.toISOString().split('T')[0] ?? null
    const babyAgeMonths = birthDate ? ageInMonths(birthDate) : 0

    return NextResponse.json(items.map((i) => formatItem(i, babyAgeMonths)))
  })
}

export async function POST(request: NextRequest) {
  return withAuth(async () => {
    const body = await request.json()
    const name = String(body.vaccine_name || '').trim()
    const ageMonths = Number(body.scheduled_age_months)

    if (!name) {
      return NextResponse.json({ error: 'Nama vaksin wajib' }, { status: 400 })
    }
    if (!Number.isFinite(ageMonths) || ageMonths < 0) {
      return NextResponse.json({ error: 'Usia vaksin tidak valid' }, { status: 400 })
    }

    const item = await prisma.immunization.create({
      data: {
        vaccineName: name,
        scheduledAgeMonths: Math.round(ageMonths),
        notes: body.notes?.trim() || null,
        isCustom: true,
      },
    })

    const profile = await prisma.babyProfile.findFirst()
    const birthDate = profile?.birthDate.toISOString().split('T')[0] ?? null
    const babyAgeMonths = birthDate ? ageInMonths(birthDate) : 0

    return NextResponse.json(formatItem(item, babyAgeMonths))
  })
}

export async function PATCH(request: NextRequest) {
  return withAuth(async () => {
    const body = await request.json()

    if (!body.id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    const item = await prisma.immunization.update({
      where: { id: body.id },
      data: {
        isDone: body.is_done ?? undefined,
        dateGiven:
          body.date_given === null
            ? null
            : body.date_given
              ? new Date(body.date_given)
              : undefined,
        notes: body.notes !== undefined ? body.notes : undefined,
      },
    })

    const profile = await prisma.babyProfile.findFirst()
    const birthDate = profile?.birthDate.toISOString().split('T')[0] ?? null
    const babyAgeMonths = birthDate ? ageInMonths(birthDate) : 0

    return NextResponse.json(formatItem(item, babyAgeMonths))
  })
}
