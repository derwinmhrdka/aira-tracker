import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-helpers'
import {
  formatTitleWithProgress,
  listTitlesWithProgress,
} from '@/lib/development-titles'

export async function GET() {
  return withAuth(async () => {
    const titles = await listTitlesWithProgress()
    return NextResponse.json(titles)
  })
}

export async function PATCH(request: NextRequest) {
  return withAuth(async () => {
    const body = await request.json().catch(() => ({}))
    const id = typeof body.id === 'string' ? body.id : ''

    if (!id) {
      return NextResponse.json({ error: 'id diperlukan' }, { status: 400 })
    }

    const existing = await prisma.title.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Title tidak ditemukan' }, { status: 404 })
    }

    const nextUnlocked = !existing.isUnlocked
    const updated = await prisma.title.update({
      where: { id },
      data: {
        isUnlocked: nextUnlocked,
        unlockedAt: nextUnlocked ? new Date() : null,
      },
    })

    return NextResponse.json(await formatTitleWithProgress(updated))
  })
}
