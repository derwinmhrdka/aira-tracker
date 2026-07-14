import { ageInMonths } from '@/lib/baby-utils'

export type VaccineStatus = 'done' | 'overdue' | 'due' | 'upcoming'

export function getVaccineStatus(
  isDone: boolean,
  scheduledAgeMonths: number,
  babyAgeMonths: number
): VaccineStatus {
  if (isDone) return 'done'
  if (babyAgeMonths >= scheduledAgeMonths) return 'overdue'
  if (babyAgeMonths >= scheduledAgeMonths - 1) return 'due'
  return 'upcoming'
}

export function getNextVaccine(
  vaccines: {
    vaccineName: string
    scheduledAgeMonths: number
    isDone: boolean
  }[],
  birthDate: string | null
) {
  if (!birthDate) return null

  const age = ageInMonths(birthDate)
  const pending = vaccines
    .filter((v) => !v.isDone)
    .map((v) => ({
      ...v,
      status: getVaccineStatus(false, v.scheduledAgeMonths, age),
    }))
    .sort((a, b) => a.scheduledAgeMonths - b.scheduledAgeMonths)

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
