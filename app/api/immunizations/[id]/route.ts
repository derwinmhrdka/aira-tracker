import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-helpers'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(async () => {
    const { id } = await params
    const item = await prisma.immunization.findUnique({ where: { id } })

    if (!item) {
      return NextResponse.json({ error: 'Vaksin tidak ditemukan' }, { status: 404 })
    }
    if (!item.isCustom) {
      return NextResponse.json(
        { error: 'Hanya vaksin custom yang bisa dihapus' },
        { status: 400 }
      )
    }

    await prisma.immunization.delete({ where: { id } })
    return NextResponse.json({ success: true })
  })
}
