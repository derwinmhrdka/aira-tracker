import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-helpers'

function formatGrowth(log: {
  id: string
  date: Date
  weightKg: number
  heightCm: number
  headCircumferenceCm: number | null
  isJaundice: boolean
  bilirubinLevel: number | null
  notes: string | null
}) {
  return {
    id: log.id,
    date: log.date.toISOString().split('T')[0],
    weight_kg: log.weightKg,
    height_cm: log.heightCm,
    head_circumference_cm: log.headCircumferenceCm,
    is_jaundice: log.isJaundice,
    bilirubin_level: log.bilirubinLevel,
    notes: log.notes,
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(async () => {
    const { id } = await params
    const body = await request.json()

    const updated = await prisma.growthLog.update({
      where: { id },
      data: {
        date: body.date ? new Date(body.date) : undefined,
        weightKg: body.weight_kg != null ? Number(body.weight_kg) : undefined,
        heightCm: body.height_cm != null ? Number(body.height_cm) : undefined,
        headCircumferenceCm:
          body.head_circumference_cm !== undefined
            ? body.head_circumference_cm
            : undefined,
        isJaundice: body.is_jaundice ?? undefined,
        bilirubinLevel:
          body.bilirubin_level !== undefined
            ? body.bilirubin_level
            : undefined,
        notes: body.notes !== undefined ? body.notes : undefined,
      },
    })

    return NextResponse.json(formatGrowth(updated))
  })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(async () => {
    const { id } = await params
    await prisma.growthLog.delete({ where: { id } })
    return NextResponse.json({ success: true })
  })
}
