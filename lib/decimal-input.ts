/** Sanitize user typing — allows digits and one comma or dot as decimal separator */
export function sanitizeDecimalInput(value: string): string {
  let out = ''
  let sepUsed = false
  for (const ch of value) {
    if (ch >= '0' && ch <= '9') {
      out += ch
    } else if ((ch === '.' || ch === ',') && !sepUsed) {
      out += ch
      sepUsed = true
    }
  }
  return out
}

export function parseDecimal(value: string): number | null {
  const normalized = value.trim().replace(',', '.')
  if (!normalized) return null
  const n = Number.parseFloat(normalized)
  return Number.isFinite(n) ? n : null
}

export function isValidDecimal(value: string): boolean {
  return parseDecimal(value) !== null
}
