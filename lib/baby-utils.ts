export function ageInMonths(birthDate: string, refDate?: string): number {
  const birth = new Date(birthDate)
  const ref = refDate ? new Date(refDate) : new Date()
  const months =
    (ref.getFullYear() - birth.getFullYear()) * 12 +
    (ref.getMonth() - birth.getMonth()) +
    (ref.getDate() - birth.getDate()) / 30
  return Math.max(0, Math.round(months * 10) / 10)
}

/** Completed whole weeks since birth (floor). */
export function ageInWeeks(birthDate: string, refDate?: string): number {
  const birth = new Date(birthDate)
  const ref = refDate ? new Date(refDate) : new Date()
  const ms = ref.getTime() - birth.getTime()
  return Math.max(0, Math.floor(ms / (7 * 24 * 60 * 60 * 1000)))
}

export function formatAge(birthDate: string): string {
  const birth = new Date(birthDate)
  const now = new Date()
  const days = Math.floor((now.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24))
  if (days < 30) return `${days} hari`
  const months = Math.floor(days / 30)
  const remainDays = days % 30
  if (months < 12) {
    return remainDays > 0 ? `${months} bln ${remainDays} hr` : `${months} bulan`
  }
  const years = Math.floor(months / 12)
  const remainMonths = months % 12
  return remainMonths > 0 ? `${years} thn ${remainMonths} bln` : `${years} tahun`
}

export function timeAgoId(iso: string | null | undefined): string {
  if (!iso) return 'Belum'
  const diff = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(minutes / 60)
  if (minutes < 1) return 'Baru saja'
  if (minutes < 60) return `${minutes} menit lalu`
  if (hours < 24) return `${hours} jam lalu`
  return new Date(iso).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatDuration(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

export function formatDurationShort(minutes: number): string {
  const safe = Math.max(0, Math.round(minutes))
  const h = Math.floor(safe / 60)
  const m = safe % 60
  if (h > 0) return `${h}j ${m}m`
  return `${m} menit`
}

export function formatDurationLabel(minutes: number): string {
  const safe = Math.max(0, Math.round(minutes))
  const h = Math.floor(safe / 60)
  const m = safe % 60
  if (h > 0 && m > 0) return `${h} jam ${m} menit`
  if (h > 0) return `${h} jam`
  return `${m} menit`
}
