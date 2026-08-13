type BottleRow = {
  slotIndex: number
  amountMl: number | null
  filledAt: Date | null
  bottleNumber: number | null
}

export function isFilledMilkRow(row: {
  amountMl: number | null
  filledAt: Date | null
}): boolean {
  return row.amountMl != null && row.amountMl > 0 && row.filledAt != null
}

/** Nomor botol berikutnya yang belum dipakai (1–24). */
export function nextBottleNumber(rows: BottleRow[]): number {
  const used = new Set<number>()
  for (const row of rows) {
    if (!isFilledMilkRow(row)) continue
    if (row.bottleNumber != null) used.add(row.bottleNumber)
  }
  for (let n = 1; n <= 24; n++) {
    if (!used.has(n)) return n
  }
  return used.size + 1
}

/** Nomor unik per slot terisi (slotIndex → bottleNumber). */
export function assignUniqueBottleNumbers(
  rows: BottleRow[]
): Map<number, number> {
  const filled = rows
    .filter(isFilledMilkRow)
    .sort((a, b) => a.slotIndex - b.slotIndex)

  const used = new Set<number>()
  const result = new Map<number, number>()

  for (const row of filled) {
    let num = row.bottleNumber ?? row.slotIndex + 1
    while (used.has(num)) num++
    used.add(num)
    result.set(row.slotIndex, num)
  }

  return result
}

/** Perbaiki nomor botol duplikat / null — urut slotIndex, nomor unik naik. */
export function dedupeBottleNumberUpdates(
  rows: BottleRow[]
): Array<{ slotIndex: number; bottleNumber: number }> {
  const assigned = assignUniqueBottleNumbers(rows)
  const updates: Array<{ slotIndex: number; bottleNumber: number }> = []

  for (const row of rows) {
    if (!isFilledMilkRow(row)) continue
    const num = assigned.get(row.slotIndex)!
    if (row.bottleNumber !== num) {
      updates.push({ slotIndex: row.slotIndex, bottleNumber: num })
    }
  }

  return updates
}
