import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-helpers'

export async function GET() {
  return withAuth(async () => {
    const logs = await prisma.growthLog.findMany({
      orderBy: { date: 'asc' },
    })

    return NextResponse.json(
      logs.map((log) => ({
        id: log.id,
        date: log.date.toISOString().split('T')[0],
        weight_kg: log.weightKg,
        height_cm: log.heightCm,
        head_circumference_cm: log.headCircumferenceCm,
        is_jaundice: log.isJaundice,
        bilirubin_level: log.bilirubinLevel,
        notes: log.notes,
      }))
    )
  })
}

export async function POST(request: NextRequest) {
  return withAuth(async () => {
    const body = await request.json()

    if (!body.date || body.weight_kg == null || body.height_cm == null) {
      return NextResponse.json(
        { error: 'date, weight_kg, and height_cm are required' },
        { status: 400 }
      )
    }

    const log = await prisma.growthLog.create({
      data: {
        date: new Date(body.date),
        weightKg: Number(body.weight_kg),
        heightCm: Number(body.height_cm),
        headCircumferenceCm:
          body.head_circumference_cm != null
            ? Number(body.head_circumference_cm)
            : null,
        isJaundice: body.is_jaundice ?? false,
        bilirubinLevel: body.bilirubin_level ?? null,
        notes: body.notes ?? null,
      },
    })

    return NextResponse.json({
      id: log.id,
      date: log.date.toISOString().split('T')[0],
      weight_kg: log.weightKg,
      height_cm: log.heightCm,
    })
  })
}
