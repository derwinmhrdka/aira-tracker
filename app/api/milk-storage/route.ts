import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, parseLoggedBy } from '@/lib/api-helpers'
import {
  MILK_STORAGE_LAYOUT_DEFAULTS,
  MILK_STORAGE_LAYOUT_KEY,
  MILK_REMINDER_SETTINGS_KEY,
  clampMilkWarnMinutes,
  milkSlotCount,
  milkReminderSettingsToJson,
  normalizeMilkStorageLayout,
  parseMilkReminderSettings,
} from '@/lib/milk-storage'
import { swapMilkStorageSlots } from '@/lib/milk-slot-swap'

function formatSlot(s: {
  id: string
  slotIndex: number
  amountMl: number | null
  filledAt: Date | null
  expiresAt: Date | null
  reminderEnabled: boolean | null
  warnBeforeMinutes: number | null
  note: string | null
  loggedBy: string | null
}) {
  const filled = s.amountMl != null && s.amountMl > 0 && s.filledAt != null
  return {
    id: s.id,
    slot_index: s.slotIndex,
    amount_ml: filled ? s.amountMl : null,
    filled_at: filled ? s.filledAt!.toISOString() : null,
    expires_at: filled && s.expiresAt ? s.expiresAt.toISOString() : null,
    reminder_enabled: filled ? s.reminderEnabled : null,
    warn_before_minutes: filled ? s.warnBeforeMinutes : null,
    note: s.note,
    logged_by: s.loggedBy,
    is_filled: filled,
  }
}

const emptySlot = (slotIndex: number) => ({
  id: null as string | null,
  slot_index: slotIndex,
  amount_ml: null as number | null,
  filled_at: null as string | null,
  expires_at: null as string | null,
  reminder_enabled: null as boolean | null,
  warn_before_minutes: null as number | null,
  note: null as string | null,
  logged_by: null as string | null,
  is_filled: false,
})

async function readLayout() {
  const row = await prisma.appSetting.findUnique({
    where: { key: MILK_STORAGE_LAYOUT_KEY },
  })
  return normalizeMilkStorageLayout(row?.value ?? null)
}

async function readReminderSettings() {
  const row = await prisma.appSetting.findUnique({
    where: { key: MILK_REMINDER_SETTINGS_KEY },
  })
  return parseMilkReminderSettings(row?.value ?? null)
}

export async function GET() {
  return withAuth(async () => {
    const layout = await readLayout()
    const reminder = await readReminderSettings()
    const slots = await prisma.milkStorageSlot.findMany({
      orderBy: { slotIndex: 'asc' },
    })
    const byIndex = new Map(slots.map((s) => [s.slotIndex, s]))
    const total = milkSlotCount(layout)
    const items = Array.from({ length: total }, (_, i) => {
      const existing = byIndex.get(i)
      return existing ? formatSlot(existing) : emptySlot(i)
    })

    return NextResponse.json({
      layout,
      slots: items,
      reminder: {
        enabled: reminder.enabled,
        warn_before_minutes: reminder.warnBeforeMinutes,
      },
    })
  })
}

export async function PATCH(request: NextRequest) {
  return withAuth(async (sessionLoggedBy) => {
    const body = await request.json().catch(() => ({}))

    if (body.reminder && typeof body.reminder === 'object') {
      const current = await readReminderSettings()
      const next = parseMilkReminderSettings({
        ...current,
        enabled:
          typeof body.reminder.enabled === 'boolean'
            ? body.reminder.enabled
            : current.enabled,
        warnBeforeMinutes:
          body.reminder.warn_before_minutes ?? body.reminder.warnBeforeMinutes,
      })
      await prisma.appSetting.upsert({
        where: { key: MILK_REMINDER_SETTINGS_KEY },
        create: {
          key: MILK_REMINDER_SETTINGS_KEY,
          value: milkReminderSettingsToJson(next),
        },
        update: { value: milkReminderSettingsToJson(next) },
      })
      return NextResponse.json({
        reminder: {
          enabled: next.enabled,
          warn_before_minutes: next.warnBeforeMinutes,
        },
      })
    }

    if (body.swap && typeof body.swap === 'object') {
      const fromIndex = Number(body.swap.from_index)
      const toIndex = Number(body.swap.to_index)
      if (
        !Number.isInteger(fromIndex) ||
        !Number.isInteger(toIndex) ||
        fromIndex < 0 ||
        toIndex < 0 ||
        fromIndex > 23 ||
        toIndex > 23
      ) {
        return NextResponse.json({ error: 'Indeks swap tidak valid' }, { status: 400 })
      }
      await swapMilkStorageSlots(fromIndex, toIndex)
      const layout = await readLayout()
      const slots = await prisma.milkStorageSlot.findMany({
        orderBy: { slotIndex: 'asc' },
      })
      const byIndex = new Map(slots.map((s) => [s.slotIndex, s]))
      const total = milkSlotCount(layout)
      const items = Array.from({ length: total }, (_, i) => {
        const existing = byIndex.get(i)
        return existing ? formatSlot(existing) : emptySlot(i)
      })
      return NextResponse.json({ slots: items })
    }

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

    const slotIndex = Number(body.slot_index)
    if (!Number.isInteger(slotIndex) || slotIndex < 0 || slotIndex > 23) {
      return NextResponse.json({ error: 'slot_index tidak valid' }, { status: 400 })
    }

    if (body.clear === true) {
      const existing = await prisma.milkStorageSlot.findUnique({
        where: { slotIndex },
      })
      if (existing) {
        const cleared = await prisma.milkStorageSlot.update({
          where: { slotIndex },
          data: {
            amountMl: null,
            filledAt: null,
            expiresAt: null,
            expiryPushNotifiedFor: null,
            reminderEnabled: null,
            warnBeforeMinutes: null,
            note: null,
            loggedBy: null,
          },
        })
        return NextResponse.json({ slot: formatSlot(cleared) })
      }
      return NextResponse.json({ slot: emptySlot(slotIndex) })
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

    let expiresAt: Date | null = null
    if (body.expires_at === null || body.expires_at === '') {
      expiresAt = null
    } else if (typeof body.expires_at === 'string' && body.expires_at) {
      const parsed = new Date(body.expires_at)
      if (!Number.isNaN(parsed.getTime())) expiresAt = parsed
    }

    const note =
      typeof body.note === 'string'
        ? body.note.trim().slice(0, 200) || null
        : undefined
    const loggedBy =
      parseLoggedBy(body.logged_by) ?? sessionLoggedBy ?? null

    let reminderEnabled: boolean | null | undefined = undefined
    if (body.reminder_enabled === null) {
      reminderEnabled = null
    } else if (typeof body.reminder_enabled === 'boolean') {
      reminderEnabled = body.reminder_enabled
    }

    let warnBeforeMinutes: number | null | undefined = undefined
    if (body.warn_before_minutes === null) {
      warnBeforeMinutes = null
    } else if (body.warn_before_minutes != null) {
      const parsed = Number(body.warn_before_minutes)
      if (Number.isFinite(parsed)) {
        warnBeforeMinutes = clampMilkWarnMinutes(parsed)
      }
    }

    const existing = await prisma.milkStorageSlot.findUnique({
      where: { slotIndex },
    })
    const expiryChanged =
      existing?.expiresAt?.getTime() !== expiresAt?.getTime()

    const slot = await prisma.milkStorageSlot.upsert({
      where: { slotIndex },
      create: {
        slotIndex,
        amountMl: Math.round(amountMl),
        filledAt,
        expiresAt,
        reminderEnabled: null,
        warnBeforeMinutes: warnBeforeMinutes ?? null,
        note: note ?? null,
        loggedBy,
      },
      update: {
        amountMl: Math.round(amountMl),
        filledAt,
        expiresAt,
        ...(expiryChanged ? { expiryPushNotifiedFor: null } : {}),
        ...(reminderEnabled !== undefined ? { reminderEnabled } : {}),
        ...(warnBeforeMinutes !== undefined ? { warnBeforeMinutes } : {}),
        ...(note !== undefined ? { note } : {}),
        loggedBy,
      },
    })

    return NextResponse.json({ slot: formatSlot(slot) })
  })
}
