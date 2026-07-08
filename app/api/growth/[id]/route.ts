import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-helpers'
import {
  formatGrowth,
  growthApiError,
  parseGrowthUpdateBody,
} from '@/lib/growth-api'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(async () => {
    try {
      const { id } = await params
      const body = (await request.json()) as Record<string, unknown>
      const parsed = parseGrowthUpdateBody(body)
      if (parsed.error) return parsed.error

      const updated = await prisma.growthLog.update({
        where: { id },
        data: parsed.data!,
      })

      return NextResponse.json(formatGrowth(updated))
    } catch (error) {
      return growthApiError(error)
    }
  })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(async () => {
    try {
      const { id } = await params
      await prisma.growthLog.delete({ where: { id } })
      return NextResponse.json({ success: true })
    } catch (error) {
      return growthApiError(error)
    }
  })
}
