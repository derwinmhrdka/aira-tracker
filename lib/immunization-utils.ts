import { ageInMonths, ageInWeeks } from '@/lib/baby-utils'

export type VaccineStatus = 'done' | 'overdue' | 'due' | 'upcoming'

export type VaccineScheduleHints = {
  scheduledAgeWeeks?: number | null
  maxWeeks?: number | null
  babyAgeWeeks?: number | null
}

/**
 * Status vaksin.
 * Jika ada usia minggu + jadwal minggu: hormati jendela maxWeeks (mis. BCG 0–4 minggu).
 * Fallback bulan: usia 0 bulan tidak langsung "terlambat" sampai ~1 bulan.
 */
export function getVaccineStatus(
  isDone: boolean,
  scheduledAgeMonths: number,
  babyAgeMonths: number,
  hints?: VaccineScheduleHints
): VaccineStatus {
  if (isDone) return 'done'

  const babyWeeks = hints?.babyAgeWeeks
  const scheduledWeeks = hints?.scheduledAgeWeeks
  const maxWeeks = hints?.maxWeeks

  if (babyWeeks != null && scheduledWeeks != null) {
    const overdueAfter = maxWeeks != null ? maxWeeks : scheduledWeeks
    if (babyWeeks > overdueAfter) return 'overdue'
    if (babyWeeks >= scheduledWeeks) return 'due'
    // Window "akan jatuh tempo": 4 minggu sebelum jadwal
    if (babyWeeks >= Math.max(0, scheduledWeeks - 4)) return 'due'
    return 'upcoming'
  }

  // Month fallback — jangan overdue-kan vaksin newborn (bulan 0) terlalu agresif
  if (scheduledAgeMonths <= 0) {
    if (babyAgeMonths >= 1) return 'overdue'
    return 'due'
  }

  if (babyAgeMonths >= scheduledAgeMonths) return 'overdue'
  if (babyAgeMonths >= scheduledAgeMonths - 1) return 'due'
  return 'upcoming'
}

export function getNextVaccine(
  vaccines: {
    vaccineName: string
    scheduledAgeMonths: number
    scheduledAgeWeeks?: number | null
    maxWeeks?: number | null
    isDone: boolean
  }[],
  birthDate: string | null
) {
  if (!birthDate) return null

  const ageMonths = ageInMonths(birthDate)
  const ageWeeks = ageInWeeks(birthDate)
  const pending = vaccines
    .filter((v) => !v.isDone)
    .map((v) => ({
      ...v,
      status: getVaccineStatus(false, v.scheduledAgeMonths, ageMonths, {
        scheduledAgeWeeks: v.scheduledAgeWeeks,
        maxWeeks: v.maxWeeks,
        babyAgeWeeks: ageWeeks,
      }),
    }))
    .sort((a, b) => {
      const wa = a.scheduledAgeWeeks ?? a.scheduledAgeMonths * 4
      const wb = b.scheduledAgeWeeks ?? b.scheduledAgeMonths * 4
      return wa - wb
    })

  const overdue = pending.find((v) => v.status === 'overdue')
  if (overdue) {
    return {
      name: overdue.vaccineName,
      age_months: overdue.scheduledAgeMonths,
      status: 'overdue' as const,
    }
  }

  const due = pending.find((v) => v.status === 'due')
  if (due) {
    return {
      name: due.vaccineName,
      age_months: due.scheduledAgeMonths,
      status: 'due' as const,
    }
  }

  const upcoming = pending[0]
  if (upcoming) {
    return {
      name: upcoming.vaccineName,
      age_months: upcoming.scheduledAgeMonths,
      status: 'upcoming' as const,
    }
  }

  return null
}

export const STATUS_LABEL: Record<VaccineStatus, string> = {
  done: 'Selesai',
  overdue: 'Terlambat',
  due: 'Jatuh tempo',
  upcoming: 'Mendatang',
}

export const STATUS_STYLE: Record<VaccineStatus, string> = {
  done: 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300',
  overdue: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300',
  due: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  upcoming: 'bg-secondary text-muted-foreground',
}
