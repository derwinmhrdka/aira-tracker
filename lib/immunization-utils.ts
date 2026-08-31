import { ageInMonths, ageInWeeks } from '@/lib/baby-utils'
import { formatVaccineRange } from '@/lib/immunization-idai'
import { lookupImmunizationWeekWindow } from '@/lib/immunization-schedule-windows'
import type { Immunization } from '@/lib/api-client'

export type VaccineStatus = 'done' | 'overdue' | 'due' | 'upcoming'

export type VaccineScheduleHints = {
  scheduledAgeWeeks?: number | null
  minWeeks?: number | null
  maxWeeks?: number | null
  babyAgeWeeks?: number | null
}

export type VaccineInput = {
  vaccineName: string
  scheduledAgeMonths: number
  scheduledAgeWeeks?: number | null
  minWeeks?: number | null
  maxWeeks?: number | null
  doseLabel?: string | null
  isDone: boolean
}

export type VaccineBrief = {
  status: Exclude<VaccineStatus, 'done'>
  schedule_label: string
  scheduled_age_weeks: number | null
  scheduled_age_months: number
  vaccines: { name: string; dose_label: string | null; range_label: string | null }[]
}

const DEFAULT_OVERDUE_GRACE_WEEKS = 4

/**
 * Status vaksin.
 * - due: usia bayi sudah masuk jendela (minWeeks atau scheduledWeeks)
 * - overdue: lewat maxWeeks, atau lewat scheduled + grace jika tidak ada max
 * - upcoming: belum waktunya
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
  const minWeeks = hints?.minWeeks
  const maxWeeks = hints?.maxWeeks

  if (babyWeeks != null && scheduledWeeks != null) {
    const dueFrom = minWeeks ?? scheduledWeeks
    const overdueAfter =
      maxWeeks != null
        ? maxWeeks
        : scheduledWeeks + DEFAULT_OVERDUE_GRACE_WEEKS

    if (babyWeeks > overdueAfter) return 'overdue'
    if (babyWeeks >= dueFrom) return 'due'
    return 'upcoming'
  }

  // Fallback bulan — jangan tandai jatuh tempo 1 bulan sebelum jadwal
  if (scheduledAgeMonths <= 0) {
    if (babyAgeMonths >= 1) return 'overdue'
    return 'due'
  }

  if (babyAgeMonths > scheduledAgeMonths) return 'overdue'
  if (babyAgeMonths >= scheduledAgeMonths) return 'due'
  return 'upcoming'
}

export function formatVaccineScheduleLabel(
  scheduledAgeWeeks: number | null | undefined,
  scheduledAgeMonths: number
): string {
  if (scheduledAgeWeeks === 0 || scheduledAgeWeeks == null) return 'Baru lahir'
  if (scheduledAgeWeeks >= 260) return '5–7 tahun'
  if (scheduledAgeMonths >= 12) {
    const years = Math.floor(scheduledAgeMonths / 12)
    if (years >= 2) return `${years} tahun`
    return `${scheduledAgeMonths} bulan`
  }
  if (scheduledAgeMonths >= 2) return `${scheduledAgeMonths} bulan`
  return `${scheduledAgeWeeks} minggu`
}

export function getImmunizationWeekRange(
  item: Pick<
    Immunization,
    | 'vaccine_name'
    | 'dose_label'
    | 'scheduled_age_weeks'
    | 'scheduled_age_months'
    | 'min_weeks'
    | 'max_weeks'
  >
): { minWeeks: number; maxWeeks: number } {
  const scheduled =
    item.scheduled_age_weeks ??
    (item.scheduled_age_months > 0 ? item.scheduled_age_months * 4 : 0)

  if (item.min_weeks != null && item.max_weeks != null) {
    return { minWeeks: item.min_weeks, maxWeeks: item.max_weeks }
  }

  if (item.min_weeks != null || item.max_weeks != null) {
    return {
      minWeeks: item.min_weeks ?? scheduled,
      maxWeeks: item.max_weeks ?? scheduled,
    }
  }

  const fromSchedule = lookupImmunizationWeekWindow(item)
  if (fromSchedule) return fromSchedule

  return { minWeeks: scheduled, maxWeeks: scheduled }
}

function sortKey(v: VaccineInput): number {
  return v.scheduledAgeWeeks ?? v.scheduledAgeMonths * 4
}

export function getVaccineBrief(
  vaccines: VaccineInput[],
  birthDate: string | null
): VaccineBrief | null {
  if (!birthDate) return null

  const ageMonths = ageInMonths(birthDate)
  const ageWeeks = ageInWeeks(birthDate)

  const pending = vaccines
    .filter((v) => !v.isDone)
    .map((v) => ({
      ...v,
      status: getVaccineStatus(false, v.scheduledAgeMonths, ageMonths, {
        scheduledAgeWeeks: v.scheduledAgeWeeks,
        minWeeks: v.minWeeks,
        maxWeeks: v.maxWeeks,
        babyAgeWeeks: ageWeeks,
      }),
    }))

  for (const priority of ['overdue', 'due', 'upcoming'] as const) {
    const matches = pending
      .filter((v) => v.status === priority)
      .sort((a, b) => sortKey(a) - sortKey(b))

    if (matches.length === 0) continue

    const anchorWeeks = matches[0].scheduledAgeWeeks ?? null
    const bucket = matches.filter(
      (v) => (v.scheduledAgeWeeks ?? null) === anchorWeeks
    )

    return {
      status: priority,
      schedule_label: formatVaccineScheduleLabel(
        bucket[0].scheduledAgeWeeks,
        bucket[0].scheduledAgeMonths
      ),
      scheduled_age_weeks: bucket[0].scheduledAgeWeeks ?? null,
      scheduled_age_months: bucket[0].scheduledAgeMonths,
      vaccines: bucket.map((v) => ({
        name: v.vaccineName,
        dose_label: v.doseLabel ?? null,
        range_label: formatVaccineRange(v.minWeeks, v.maxWeeks, v.scheduledAgeWeeks),
      })),
    }
  }

  return null
}

/** @deprecated Prefer getVaccineBrief — kept for compact home line */
export function getNextVaccine(
  vaccines: VaccineInput[],
  birthDate: string | null
) {
  const brief = getVaccineBrief(vaccines, birthDate)
  if (!brief) return null

  const first = brief.vaccines[0]
  const name =
    brief.vaccines.length > 1
      ? `${brief.vaccines.length} vaksin`
      : first.name

  return {
    name,
    age_months: brief.scheduled_age_months,
    status: brief.status,
    schedule_label: brief.schedule_label,
    scheduled_age_weeks: brief.scheduled_age_weeks,
    vaccines: brief.vaccines,
  }
}

export const STATUS_LABEL: Record<VaccineStatus, string> = {
  done: 'Selesai',
  overdue: 'Terlambat',
  due: 'Sudah waktunya',
  upcoming: 'Mendatang',
}

export const STATUS_STYLE: Record<VaccineStatus, string> = {
  done: 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300',
  overdue: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300',
  due: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  upcoming: 'bg-secondary text-muted-foreground',
}
