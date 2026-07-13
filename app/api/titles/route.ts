import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-helpers'

function formatTitle(t: {
  id: string
  category: string
  name: string
  emoji: string
  description: string
  isUnlocked: boolean
  unlockedAt: Date | null
}) {
  return {
    id: t.id,
    category: t.category,
    name: t.name,
    emoji: t.emoji,
    description: t.description,
    is_unlocked: t.isUnlocked,
    unlocked_at: t.unlockedAt?.toISOString() ?? null,
  }
}

export async function GET() {
  return withAuth(async () => {
    const titles = await prisma.title.findMany({
      orderBy: { category: 'asc' },
    })
    return NextResponse.json(titles.map(formatTitle))
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

    return NextResponse.json(formatTitle(updated))
  })
}
