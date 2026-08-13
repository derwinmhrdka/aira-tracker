import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { dedupeBottleNumberUpdates, assignUniqueBottleNumbers } from '@/lib/milk-bottle-number'

const CLEAR_FIELDS = {
  amountMl: null,
  filledAt: null,
  expiresAt: null,
  expiryPushNotifiedFor: null,
  reminderEnabled: null,
  warnBeforeMinutes: null,
  note: null,
  bottleNumber: null,
  loggedBy: null,
} as const

type FilledPayload = {
  amountMl: number
  filledAt: Date
  expiresAt: Date | null
  expiryPushNotifiedFor: Date | null
  reminderEnabled: boolean | null
  warnBeforeMinutes: number | null
  note: string | null
  bottleNumber: number | null
  loggedBy: string | null
}

type Tx = Prisma.TransactionClient

function isFilled(row: {
  amountMl: number | null
  filledAt: Date | null
}): row is { amountMl: number; filledAt: Date } {
  return row.amountMl != null && row.amountMl > 0 && row.filledAt != null
}

function toPayload(
  row: {
    amountMl: number | null
    filledAt: Date | null
    expiresAt: Date | null
    expiryPushNotifiedFor: Date | null
    reminderEnabled: boolean | null
    warnBeforeMinutes: number | null
    note: string | null
    bottleNumber: number | null
    loggedBy: string | null
  },
  bottleNumber: number
): FilledPayload | null {
  if (!isFilled(row)) return null
  return {
    amountMl: row.amountMl,
    filledAt: row.filledAt,
    expiresAt: row.expiresAt,
    expiryPushNotifiedFor: row.expiryPushNotifiedFor,
    reminderEnabled: row.reminderEnabled,
    warnBeforeMinutes: row.warnBeforeMinutes,
    note: row.note,
    bottleNumber,
    loggedBy: row.loggedBy,
  }
}

async function ensureUniqueBottleNumbers(tx: Tx) {
  const rows = await tx.milkStorageSlot.findMany({
    orderBy: { slotIndex: 'asc' },
  })
  const updates = dedupeBottleNumberUpdates(rows)
  if (updates.length === 0) return rows

  await Promise.all(
    updates.map((u) =>
      tx.milkStorageSlot.update({
        where: { slotIndex: u.slotIndex },
        data: { bottleNumber: u.bottleNumber },
      })
    )
  )

  return tx.milkStorageSlot.findMany({ orderBy: { slotIndex: 'asc' } })
}

async function writeSlot(tx: Tx, index: number, data: FilledPayload | null) {
  if (!data) {
    const existing = await tx.milkStorageSlot.findUnique({
      where: { slotIndex: index },
    })
    if (existing) {
      await tx.milkStorageSlot.update({
        where: { slotIndex: index },
        data: { ...CLEAR_FIELDS },
      })
    }
    return
  }

  await tx.milkStorageSlot.upsert({
    where: { slotIndex: index },
    create: { slotIndex: index, ...data },
    update: { ...data },
  })
}

export async function swapMilkStorageSlots(fromIndex: number, toIndex: number) {
  if (fromIndex === toIndex) return

  await prisma.$transaction(async (tx) => {
    const rows = await ensureUniqueBottleNumbers(tx)
    const numberBySlot = assignUniqueBottleNumbers(rows)

    const fromRow = rows.find((row) => row.slotIndex === fromIndex) ?? null
    const toRow = rows.find((row) => row.slotIndex === toIndex) ?? null

    const fromData =
      fromRow && numberBySlot.has(fromIndex)
        ? toPayload(fromRow, numberBySlot.get(fromIndex)!)
        : null
    const toData =
      toRow && numberBySlot.has(toIndex)
        ? toPayload(toRow, numberBySlot.get(toIndex)!)
        : null

    await writeSlot(tx, fromIndex, toData)
    await writeSlot(tx, toIndex, fromData)
  })
}
