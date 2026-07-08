import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-helpers'
import {
  formatGrowth,
  growthApiError,
  parseGrowthCreateBody,
} from '@/lib/growth-api'

export async function GET() {
  return withAuth(async () => {
    try {
      const logs = await prisma.growthLog.findMany({
        orderBy: { date: 'asc' },
      })

      return NextResponse.json(logs.map(formatGrowth))
    } catch (error) {
      return growthApiError(error)
    }
  })
}

export async function POST(request: NextRequest) {
  return withAuth(async () => {
    try {
      const body = (await request.json()) as Record<string, unknown>
      const parsed = parseGrowthCreateBody(body)
      if (parsed.error) return parsed.error

      const log = await prisma.growthLog.create({
        data: parsed.data!,
      })

      return NextResponse.json(formatGrowth(log))
    } catch (error) {
      return growthApiError(error)
    }
  })
}
