import type { Immunization } from '@/lib/api-client'

export type DoseKind = 'routine' | 'booster' | 'catchup'

export type ImmunizationTimelineGroup = {
  weeks: number
  label: string
  sublabel: string
  vaccines: Immunization[]
}

export type IdaiCatchUpRule = {
  title: string
  vaccine: string
  rules: string[]
}

/** Catatan catch-up & booster IDAI — referensi UI (Pedoman Imunisasi IDAI). */
export const IDAI_CATCHUP_RULES: IdaiCatchUpRule[] = [
  {
    vaccine: 'PCV',
    title: 'PCV — catch-up jika jadwal awal terlewat',
    rules: [
      'Belum vaksin sampai usia 7–12 bulan: 2 dosis PCV (interval 1 bulan), lalu booster setelah usia 12 bulan (interval 2 bulan dari dosis terakhir).',
      'Belum vaksin usia 1–2 tahun: 2 dosis PCV, interval minimal 2 bulan (tanpa booster tambahan).',
      'Belum vaksin usia 2–5 tahun: PCV10 → 2 dosis interval 2 bulan; PCV13/PCV15 → cukup 1 dosis.',
      'Usia >5 tahun dengan risiko tinggi yang belum pernah vaksin PCV: 1 dosis PCV13/PCV15.',
    ],
  },
  {
    vaccine: 'Rotavirus',
    title: 'Rotavirus — batas usia ketat',
    rules: [
      'Dosis pertama tidak boleh diberikan usia ≥15 minggu.',
      'Jika bayi sudah lewat 14 minggu dan belum mulai, seri rotavirus tidak bisa dimulai/dikejar menurut jadwal IDAI.',
      'Monovalen: 2 dosis total, selesai sebelum 24 minggu.',
      'Pentavalen: 3 dosis total, selesai sebelum 32 minggu.',
    ],
  },
  {
    vaccine: 'BCG',
    title: 'BCG — catch-up',
    rules: [
      'Optimal usia 0–4 minggu (idealnya sebelum 2 bulan).',
      'Jika diberikan usia ≥3 bulan, wajib didahului uji tuberkulin (hasil negatif).',
    ],
  },
  {
    vaccine: 'DPT-HB-Hib',
    title: 'DPT-HB-Hib — skema & catch-up',
    rules: [
      'Skema DTPw (program): dosis di usia 2, 3, 4 bulan + booster 18 bulan & 5–7 tahun.',
      'Skema DTPa/hexavalen (swasta): dosis di usia 2, 4, 6 bulan + booster 18 bulan & 5–7 tahun.',
      'Catch-up: konsultasikan dokter untuk interval minimal antar dosis jika terlewat.',
    ],
  },
  {
    vaccine: 'Campak/MMR',
    title: 'Campak/MR/MMR — catch-up',
    rules: [
      'Jika belum dapat Campak/MR di usia 9 bulan, bisa langsung MMR/MR di usia 12 bulan.',
      'Booster MMR/MR usia 15 bulan: interval minimal 6 bulan dari dosis sebelumnya.',
      'Booster MR usia 5–7 tahun (program BIAS di SD).',
    ],
  },
  {
    vaccine: 'Polio',
    title: 'Polio — catch-up',
    rules: [
      'Minimal 1 dosis IPV harus diberikan bersamaan dengan Polio-3 (usia 4 bulan).',
      'IPV dosis ke-2 di usia 9 bulan (IDAI 2024).',
      'Booster OPV/IPV usia 18 bulan dan 5–7 tahun.',
    ],
  },
  {
    vaccine: 'Hepatitis A & Varisela',
    title: 'Hep A & Varisela — booster/seri',
    rules: [
      'Hepatitis A: 2 dosis total, interval 6–12 bulan.',
      'Varisela: 2 dosis setelah usia 12 bulan (interval 6 minggu–3 bulan).',
      'Varisela usia ≥13 tahun: interval minimal 4–6 minggu.',
    ],
  },
  {
    vaccine: 'Influenza & JE',
    title: 'Influenza & Japanese Encephalitis',
    rules: [
      'Influenza (<9 tahun): 2 dosis pertama interval 4 minggu, lalu 1× setahun.',
      'Japanese Encephalitis: booster 1–2 tahun kemudian (daerah endemis / sebelum bepergian).',
      'Tifoid: diulang setiap 3 tahun.',
    ],
  },
]

function weeksToScheduledMonths(weeks: number): number {
  const map: Record<number, number> = {
    0: 0,
    8: 2,
    12: 3,
    16: 4,
    26: 6,
    36: 9,
    52: 12,
    65: 15,
    78: 18,
    104: 24,
    260: 60,
  }
  if (weeks in map) return map[weeks]
  return Math.max(0, Math.round((weeks * 12) / 52))
}

const MILESTONE_LABEL: Record<number, string> = {
  0: 'Baru lahir',
  8: '2 bulan',
  12: '3 bulan',
  16: '4 bulan',
  26: '6 bulan',
  36: '9 bulan',
  52: '12 bulan',
  65: '15 bulan',
  78: '18 bulan',
  104: '2 tahun',
  260: '5–7 tahun',
}

export function getTimelineMilestoneLabel(weeks: number): string {
  if (weeks in MILESTONE_LABEL) return MILESTONE_LABEL[weeks]
  const months = weeksToScheduledMonths(weeks)
  if (months >= 12) {
    const years = Math.floor(months / 12)
    const rem = months % 12
    if (rem === 0) return `${years} tahun`
    return `${years} thn ${rem} bln`
  }
  if (months > 0) return `${months} bulan`
  return `${weeks} minggu`
}

export function formatTimelineSublabel(weeks: number): string {
  if (weeks === 0) return '0 minggu · segera setelah lahir'
  const months = weeksToScheduledMonths(weeks)
  if (months > 0 && weeks > 0) {
    return `${weeks} minggu · ~${months} bulan`
  }
  return `${weeks} minggu`
}

export function getDoseKind(doseLabel?: string | null): DoseKind {
  const label = (doseLabel ?? '').toLowerCase()
  if (label.includes('booster')) return 'booster'
  if (label.includes('catch') || label.includes('kejar')) return 'catchup'
  return 'routine'
}

export const DOSE_KIND_LABEL: Record<DoseKind, string> = {
  routine: 'Rutin',
  booster: 'Booster',
  catchup: 'Catch-up',
}

export const DOSE_KIND_STYLE: Record<DoseKind, string> = {
  routine: 'bg-secondary text-muted-foreground',
  booster: 'bg-violet-100 text-violet-800 dark:bg-violet-950/50 dark:text-violet-300',
  catchup: 'bg-orange-100 text-orange-800 dark:bg-orange-950/50 dark:text-orange-300',
}

export function formatVaccineWindow(
  minWeeks?: number | null,
  maxWeeks?: number | null,
  scheduledWeeks?: number | null
): string | null {
  if (minWeeks != null && maxWeeks != null) {
    return `Jendela: ${minWeeks}–${maxWeeks} minggu`
  }
  if (maxWeeks != null && scheduledWeeks != null && maxWeeks !== scheduledWeeks) {
    return `Maks. ${maxWeeks} minggu`
  }
  if (minWeeks != null && scheduledWeeks != null && minWeeks !== scheduledWeeks) {
    return `Mulai ${minWeeks} minggu`
  }
  return null
}

export function groupImmunizationsTimeline(
  items: Immunization[]
): ImmunizationTimelineGroup[] {
  const map = new Map<number, Immunization[]>()

  for (const item of items) {
    const weekKey =
      item.scheduled_age_weeks ??
      (item.scheduled_age_months > 0 ? item.scheduled_age_months * 4 : 0)
    const list = map.get(weekKey) ?? []
    list.push(item)
    map.set(weekKey, list)
  }

  return [...map.entries()]
    .sort(([a], [b]) => a - b)
    .map(([weeks, vaccines]) => ({
      weeks,
      label: getTimelineMilestoneLabel(weeks),
      sublabel: formatTimelineSublabel(weeks),
      vaccines: vaccines.sort((a, b) =>
        a.vaccine_name.localeCompare(b.vaccine_name, 'id')
      ),
    }))
}
