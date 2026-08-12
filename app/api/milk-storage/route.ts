import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, parseLoggedBy } from '@/lib/api-helpers'
import {
  MILK_STORAGE_LAYOUT_DEFAULTS,
  MILK_STORAGE_LAYOUT_KEY,
  milkSlotCount,
  normalizeMilkStorageLayout,
} from '@/lib/milk-storage'

function formatSlot(s: {
  id: string
  slotIndex: number
  amountMl: number | null
  filledAt: Date | null
  note: string | null
  loggedBy: string | null
}) {
  const filled = s.amountMl != null && s.amountMl > 0 && s.filledAt != null
  return {
    id: s.id,
    slot_index: s.slotIndex,
    amount_ml: filled ? s.amountMl : null,
    filled_at: filled ? s.filledAt!.toISOString() : null,
    note: s.note,
    logged_by: s.loggedBy,
    is_filled: filled,
  }
}

async function readLayout() {
  const row = await prisma.appSetting.findUnique({
    where: { key: MILK_STORAGE_LAYOUT_KEY },
  })
  return normalizeMilkStorageLayout(row?.value ?? null)
}

export async function GET() {
  return withAuth(async () => {
    const layout = await readLayout()
    const slots = await prisma.milkStorageSlot.findMany({
      orderBy: { slotIndex: 'asc' },
    })
    const byIndex = new Map(slots.map((s) => [s.slotIndex, s]))
    const total = milkSlotCount(layout)
    const items = Array.from({ length: total }, (_, i) => {
      const existing = byIndex.get(i)
      if (existing) return formatSlot(existing)
      return {
        id: null as string | null,
        slot_index: i,
        amount_ml: null as number | null,
        filled_at: null as string | null,
        note: null as string | null,
        logged_by: null as string | null,
        is_filled: false,
      }
    })

    return NextResponse.json({ layout, slots: items })
  })
}

export async function PATCH(request: NextRequest) {
  return withAuth(async (sessionLoggedBy) => {
    const body = await request.json().catch(() => ({}))

    // Update layout: { layout: { rows, cols } }
    if (body.layout && typeof body.layout === 'object') {
      const layout = normalizeMilkStorageLayout({
        ...MILK_STORAGE_LAYOUT_DEFAULTS,
        ...body.layout,
      })
      await prisma.appSetting.upsert({
        where: { key: MILK_STORAGE_LAYOUT_KEY },
        create: { key: MILK_STORAGE_LAYOUT_KEY, value: layout },
        update: { value: layout },
      })
      return NextResponse.json({ layout })
    }

    // Update / fill / clear slot: { slot_index, amount_ml?, filled_at?, clear? }
    const slotIndex = Number(body.slot_index)
    if (!Number.isInteger(slotIndex) || slotIndex < 0 || slotIndex > 23) {
      return NextResponse.json({ error: 'slot_index tidak valid' }, { status: 400 })
    }

    const clear = body.clear === true
    if (clear) {
      const existing = await prisma.milkStorageSlot.findUnique({
        where: { slotIndex },
      })
      if (existing) {
        const cleared = await prisma.milkStorageSlot.update({
          where: { slotIndex },
          data: {
            amountMl: null,
            filledAt: null,
            note: null,
            loggedBy: null,
          },
        })
        return NextResponse.json({ slot: formatSlot(cleared) })
      }
      return NextResponse.json({
        slot: {
          id: null,
          slot_index: slotIndex,
          amount_ml: null,
          filled_at: null,
          note: null,
          logged_by: null,
          is_filled: false,
        },
      })
    }

    const amountMl = Number(body.amount_ml)
    if (!Number.isFinite(amountMl) || amountMl <= 0 || amountMl > 2000) {
      return NextResponse.json(
        { error: 'amount_ml harus 1–2000' },
        { status: 400 }
      )
    }

    let filledAt = new Date()
    if (typeof body.filled_at === 'string' && body.filled_at) {
      const parsed = new Date(body.filled_at)
      if (!Number.isNaN(parsed.getTime())) filledAt = parsed
    }

    const note =
      typeof body.note === 'string' ? body.note.trim().slice(0, 200) || null : undefined
    const loggedBy =
      parseLoggedBy(body.logged_by) ?? sessionLoggedBy ?? null

    const slot = await prisma.milkStorageSlot.upsert({
      where: { slotIndex },
      create: {
        slotIndex,
        amountMl: Math.round(amountMl),
        filledAt,
        note: note ?? null,
        loggedBy,
      },
      update: {
        amountMl: Math.round(amountMl),
        filledAt,
        ...(note !== undefined ? { note } : {}),
        loggedBy,
      },
    })

    return NextResponse.json({ slot: formatSlot(slot) })
  })
}
