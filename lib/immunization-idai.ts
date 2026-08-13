import type { Immunization } from '@/lib/api-client'

export type DoseKind = 'routine' | 'booster' | 'catchup'

export type ImmunizationTimelineGroup = {
  weeks: number
  label: string
  sublabel: string
  vaccines: Immunization[]
}

export type IdaiCatchUpRule = {
  order: number
  ageLabel: string
  title: string
  vaccine: string
  rules: string[]
}

/** Catatan catch-up & booster IDAI — referensi UI (Pedoman Imunisasi IDAI). */
export const IDAI_CATCHUP_RULES: IdaiCatchUpRule[] = [
  {
    order: 0,
    ageLabel: 'Baru lahir',
    vaccine: 'BCG',
    title: 'BCG — catch-up',
    rules: [
      'Optimal 0–4 minggu.',
      '≥3 bulan: uji tuberkulin dulu (negatif).',
    ],
  },
  {
    order: 1,
    ageLabel: '2 bulan',
    vaccine: 'Rotavirus',
    title: 'Rotavirus — batas usia ketat',
    rules: [
      'Dosis 1 max usia 14 minggu.',
      'Monovalen: 2 dosis, selesai <24 minggu.',
      'Pentavalen: 3 dosis, selesai <32 minggu.',
    ],
  },
  {
    order: 2,
    ageLabel: '2–15 bulan',
    vaccine: 'PCV',
    title: 'PCV — catch-up jika jadwal awal terlewat',
    rules: [
      '7–12 bln: 2 dosis + booster usia 12 bln.',
      '1–2 thn: 2 dosis, jarak 2 bln.',
      '2–5 thn: PCV10 2 dosis; PCV13/15 1 dosis.',
    ],
  },
  {
    order: 3,
    ageLabel: '2–18 bulan',
    vaccine: 'DPT-HB-Hib',
    title: 'DPT-HB-Hib — skema & catch-up',
    rules: [
      'DTPw: 2–3–4 bln + booster 18 bln & 5–7 thn.',
      'DTPa/hexa: 2–4–6 bln + booster 18 bln & 5–7 thn.',
      'Terlewat: konsultasi dokter untuk interval.',
    ],
  },
  {
    order: 4,
    ageLabel: '4–18 bulan',
    vaccine: 'Polio',
    title: 'Polio — catch-up',
    rules: [
      'IPV min 1 dosis bersama Polio-3 (4 bln).',
      'IPV ke-2 di usia 9 bln.',
      'Booster 18 bln & 5–7 thn.',
    ],
  },
  {
    order: 5,
    ageLabel: '9 bulan – 7 tahun',
    vaccine: 'Campak/MMR',
    title: 'Campak/MR/MMR — catch-up',
    rules: [
      'Terlewat MR 9 bln → MMR/MR di 12 bln.',
      'Booster 15 bln: jarak min 6 bln dari dosis sebelumnya.',
      'Booster MR 5–7 thn (BIAS).',
    ],
  },
  {
    order: 6,
    ageLabel: '12 bulan+',
    vaccine: 'Hepatitis A & Varisela',
    title: 'Hep A & Varisela — booster/seri',
    rules: [
      'Hep A: 2 dosis, jarak 6–12 bln.',
      'Varisela: 2 dosis setelah 12 bln.',
    ],
  },
  {
    order: 7,
    ageLabel: '6 bulan+',
    vaccine: 'Influenza & JE',
    title: 'Influenza & Japanese Encephalitis',
    rules: [
      'Influenza <9 thn: 2 dosis awal, lalu tahunan.',
      'JE: booster 1–2 thn (endemis).',
      'Tifoid: ulang 3 thn sekali.',
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

export function formatTimelineSublabel(_weeks: number): string {
  return ''
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
  catchup: 'Kejar',
}

export const DOSE_KIND_STYLE: Record<DoseKind, string> = {
  routine: 'bg-secondary text-muted-foreground',
  booster: 'bg-violet-100 text-violet-800 dark:bg-violet-950/50 dark:text-violet-300',
  catchup: 'bg-orange-100 text-orange-800 dark:bg-orange-950/50 dark:text-orange-300',
}

export function formatVaccineRange(
  minWeeks?: number | null,
  maxWeeks?: number | null,
  scheduledWeeks?: number | null
): string | null {
  if (minWeeks != null && maxWeeks != null) {
    return `${minWeeks}–${maxWeeks} mg`
  }
  if (maxWeeks != null && scheduledWeeks != null && maxWeeks !== scheduledWeeks) {
    return `≤${maxWeeks} mg`
  }
  if (minWeeks != null && scheduledWeeks != null && minWeeks !== scheduledWeeks) {
    return `≥${minWeeks} mg`
  }
  if (scheduledWeeks != null && scheduledWeeks > 0) {
    return `${scheduledWeeks} mg`
  }
  return null
}

/** @deprecated use formatVaccineRange */
export const formatVaccineWindow = formatVaccineRange

export function getCatchUpRulesForVaccine(vaccineName: string): IdaiCatchUpRule[] {
  const n = vaccineName.toLowerCase()

  const matchesRule = (rule: IdaiCatchUpRule): boolean => {
    const rv = rule.vaccine.toLowerCase()
    const keywords = rv
      .split(/[&/,]| dan /i)
      .map((s) => s.trim())
      .filter((s) => s.length >= 3)

    for (const kw of keywords) {
      const kwNorm = kw.replace(/\([^)]*\)/g, '').trim()
      const nameBase = n.split('(')[0].trim()
      if (n.includes(kwNorm) || kwNorm.includes(nameBase)) return true
    }

    if (/bcg/.test(n) && /bcg/.test(rv)) return true
    if (/rotavirus|\brv\b/.test(n) && /rotavirus/.test(rv)) return true
    if (/pcv|pneumococ/.test(n) && /pcv/.test(rv)) return true
    if (/dpt|dtp|pentavalen|hexavalen/.test(n) && /dpt/.test(rv)) return true
    if (/^hib\b|\bhib\b/.test(n) && /dpt|hib/.test(rv)) return true
    if (/polio|ipv|opv/.test(n) && /polio/.test(rv)) return true
    if (/campak|mmr|\bmr\b/.test(n) && /campak|mmr|mr/.test(rv)) return true
    if (/hepatitis\s*a/.test(n) && /hepatitis/.test(rv)) return true
    if (/varisela|varicella/.test(n) && /varisela/.test(rv)) return true
    if (/influenza|\bflu\b/.test(n) && /influenza/.test(rv)) return true
    if (/japanese|encephalitis|\bje\b/.test(n) && /\bje\b|japanese/.test(rv)) return true

    return false
  }

  return IDAI_CATCHUP_RULES.filter(matchesRule).sort((a, b) => a.order - b.order)
}

export function getCatchUpRuleLines(vaccineName: string): string[] {
  const seen = new Set<string>()
  const lines: string[] = []
  for (const rule of getCatchUpRulesForVaccine(vaccineName)) {
    for (const line of rule.rules) {
      if (!seen.has(line)) {
        seen.add(line)
        lines.push(line)
      }
    }
  }
  return lines
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
