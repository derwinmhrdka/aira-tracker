import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

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

function resolveBottleNumber(
  row: { bottleNumber: number | null; amountMl: number | null; filledAt: Date | null },
  slotIndex: number
): number | null {
  if (!isFilled(row)) return null
  return row.bottleNumber ?? slotIndex + 1
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
  slotIndex: number
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
    bottleNumber: resolveBottleNumber(row, slotIndex),
    loggedBy: row.loggedBy,
  }
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
    const [fromRow, toRow] = await Promise.all([
      tx.milkStorageSlot.findUnique({ where: { slotIndex: fromIndex } }),
      tx.milkStorageSlot.findUnique({ where: { slotIndex: toIndex } }),
    ])

    const fromData = fromRow ? toPayload(fromRow, fromIndex) : null
    const toData = toRow ? toPayload(toRow, toIndex) : null

    await writeSlot(tx, fromIndex, toData)
    await writeSlot(tx, toIndex, fromData)
  })
}
