import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-helpers'
import {
  HOME_VISIBILITY_DEFAULTS,
  HOME_VISIBILITY_SETTING_KEY,
  normalizeHomeVisibility,
  type HomeVisibility,
  type HomeVisibilityKey,
} from '@/lib/home-visibility'

async function readGlobalVisibility(): Promise<HomeVisibility> {
  const row = await prisma.appSetting.findUnique({
    where: { key: HOME_VISIBILITY_SETTING_KEY },
  })
  return normalizeHomeVisibility(row?.value ?? null)
}

export async function GET() {
  return withAuth(async () => {
    const visibility = await readGlobalVisibility()
    return NextResponse.json({ visibility })
  })
}

export async function PATCH(request: NextRequest) {
  return withAuth(async () => {
    const body = await request.json().catch(() => ({}))
    const patch =
      body && typeof body === 'object' && body.visibility
        ? body.visibility
        : body

    if (!patch || typeof patch !== 'object') {
      return NextResponse.json(
        { error: 'visibility object diperlukan' },
        { status: 400 }
      )
    }

    const current = await readGlobalVisibility()
    const next = { ...current }
    for (const [key, value] of Object.entries(patch as Record<string, unknown>)) {
      if (
        key in HOME_VISIBILITY_DEFAULTS &&
        typeof value === 'boolean'
      ) {
        next[key as HomeVisibilityKey] = value
      }
    }

    await prisma.appSetting.upsert({
      where: { key: HOME_VISIBILITY_SETTING_KEY },
      create: {
        key: HOME_VISIBILITY_SETTING_KEY,
        value: next,
      },
      update: { value: next },
    })

    return NextResponse.json({ visibility: next })
  })
}
