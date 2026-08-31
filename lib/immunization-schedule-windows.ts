/** Rentang pemberian vaksin (minggu) — jadwal 0–18 bulan (batas aman maksimal). */
export const IMMUNIZATION_WEEK_WINDOWS = {
  hb0: { min: 0, max: 1 },
  polio0: { min: 0, max: 4 },
  bcg: { min: 0, max: 12 },
  dpt1: { min: 6, max: 12 },
  polio1: { min: 6, max: 12 },
  pcv1: { min: 6, max: 12 },
  rota1: { min: 6, max: 14 },
  dpt2: { min: 10, max: 18 },
  polio2: { min: 10, max: 18 },
  dpt3: { min: 14, max: 24 },
  polio3: { min: 14, max: 24 },
  ipv1: { min: 14, max: 24 },
  pcv2: { min: 14, max: 24 },
  rota2: { min: 10, max: 24 },
  rota3: { min: 14, max: 32 },
  flu1: { min: 26, max: 52 },
  flu2: { min: 30, max: 56 },
  ipv2: { min: 39, max: 52 },
  mr1: { min: 39, max: 52 },
  je1: { min: 39, max: 52 },
  pcvBooster: { min: 52, max: 104 },
  varisela1: { min: 52, max: 104 },
  hepA1: { min: 52, max: 104 },
  dptBooster: { min: 78, max: 104 },
  polioBooster: { min: 78, max: 104 },
  mrBooster: { min: 78, max: 104 },
} as const

export type ImmunizationWeekWindowKey = keyof typeof IMMUNIZATION_WEEK_WINDOWS

export function weekWindow(key: ImmunizationWeekWindowKey): {
  minWeeks: number
  maxWeeks: number
} {
  const w = IMMUNIZATION_WEEK_WINDOWS[key]
  return { minWeeks: w.min, maxWeeks: w.max }
}

type ScheduleWindowLookup = {
  vaccineName: string
  doseLabel: string
  scheduledAgeWeeks: number
  windowKey: ImmunizationWeekWindowKey
}

const SCHEDULE_WINDOW_LOOKUP: ScheduleWindowLookup[] = [
  { vaccineName: 'Hepatitis B0 (monovalen)', doseLabel: 'HB0', scheduledAgeWeeks: 0, windowKey: 'hb0' },
  { vaccineName: 'Polio 0 (OPV)', doseLabel: 'Polio 0', scheduledAgeWeeks: 0, windowKey: 'polio0' },
  { vaccineName: 'BCG', doseLabel: 'BCG 1', scheduledAgeWeeks: 0, windowKey: 'bcg' },
  { vaccineName: 'DPT-HB-Hib (Pentavalen/Hexavalen)', doseLabel: 'DPT 1', scheduledAgeWeeks: 8, windowKey: 'dpt1' },
  { vaccineName: 'Polio 1 (OPV)', doseLabel: 'Polio 1', scheduledAgeWeeks: 8, windowKey: 'polio1' },
  { vaccineName: 'PCV', doseLabel: 'PCV 1', scheduledAgeWeeks: 8, windowKey: 'pcv1' },
  {
    vaccineName: 'Rotavirus (Monovalen atau Pentavalen)',
    doseLabel: 'Rotavirus 1',
    scheduledAgeWeeks: 8,
    windowKey: 'rota1',
  },
  { vaccineName: 'DPT-HB-Hib (Pentavalen/Hexavalen)', doseLabel: 'DPT 2', scheduledAgeWeeks: 12, windowKey: 'dpt2' },
  { vaccineName: 'Polio 2 (OPV)', doseLabel: 'Polio 2', scheduledAgeWeeks: 12, windowKey: 'polio2' },
  { vaccineName: 'DPT-HB-Hib (Pentavalen/Hexavalen)', doseLabel: 'DPT 3', scheduledAgeWeeks: 16, windowKey: 'dpt3' },
  { vaccineName: 'Polio 3 (OPV)', doseLabel: 'Polio 3', scheduledAgeWeeks: 16, windowKey: 'polio3' },
  { vaccineName: 'IPV (Polio suntik)', doseLabel: 'IPV 1', scheduledAgeWeeks: 16, windowKey: 'ipv1' },
  { vaccineName: 'PCV', doseLabel: 'PCV 2', scheduledAgeWeeks: 16, windowKey: 'pcv2' },
  {
    vaccineName: 'Rotavirus (Monovalen)',
    doseLabel: 'Rotavirus 2 (Rotarix)',
    scheduledAgeWeeks: 16,
    windowKey: 'rota2',
  },
  {
    vaccineName: 'Rotavirus (Pentavalen)',
    doseLabel: 'Rotavirus 2 (Rotateq)',
    scheduledAgeWeeks: 16,
    windowKey: 'rota2',
  },
  {
    vaccineName: 'Rotavirus (Pentavalen)',
    doseLabel: 'Rotavirus 3 (Rotateq)',
    scheduledAgeWeeks: 26,
    windowKey: 'rota3',
  },
  { vaccineName: 'Influenza', doseLabel: 'Flu 1', scheduledAgeWeeks: 26, windowKey: 'flu1' },
  { vaccineName: 'Influenza', doseLabel: 'Flu 2', scheduledAgeWeeks: 30, windowKey: 'flu2' },
  { vaccineName: 'IPV (Polio suntik)', doseLabel: 'IPV 2', scheduledAgeWeeks: 36, windowKey: 'ipv2' },
  { vaccineName: 'Campak/MR', doseLabel: 'MR 1', scheduledAgeWeeks: 36, windowKey: 'mr1' },
  { vaccineName: 'Japanese Encephalitis', doseLabel: 'JE 1', scheduledAgeWeeks: 36, windowKey: 'je1' },
  { vaccineName: 'PCV', doseLabel: 'Booster PCV 3', scheduledAgeWeeks: 52, windowKey: 'pcvBooster' },
  { vaccineName: 'Varisela', doseLabel: 'Varisela 1', scheduledAgeWeeks: 52, windowKey: 'varisela1' },
  { vaccineName: 'Hepatitis A', doseLabel: 'Hepatitis A 1', scheduledAgeWeeks: 52, windowKey: 'hepA1' },
  { vaccineName: 'DPT-HB-Hib', doseLabel: 'Booster DPT 1', scheduledAgeWeeks: 78, windowKey: 'dptBooster' },
  { vaccineName: 'Polio (OPV/IPV)', doseLabel: 'Booster Polio 3', scheduledAgeWeeks: 78, windowKey: 'polioBooster' },
  { vaccineName: 'MMR/MR', doseLabel: 'Booster MR 2', scheduledAgeWeeks: 78, windowKey: 'mrBooster' },
]

function scheduleLookupKey(
  vaccineName: string,
  doseLabel: string,
  scheduledAgeWeeks: number
): string {
  return `${vaccineName}|${doseLabel}|${scheduledAgeWeeks}`
}

const WINDOW_BY_SCHEDULE = new Map(
  SCHEDULE_WINDOW_LOOKUP.map((row) => [
    scheduleLookupKey(row.vaccineName, row.doseLabel, row.scheduledAgeWeeks),
    weekWindow(row.windowKey),
  ])
)

export function lookupImmunizationWeekWindow(input: {
  vaccine_name: string
  dose_label?: string | null
  scheduled_age_weeks?: number | null
  scheduled_age_months?: number
}): { minWeeks: number; maxWeeks: number } | null {
  const doseLabel = input.dose_label ?? ''
  const scheduled =
    input.scheduled_age_weeks ??
    (input.scheduled_age_months && input.scheduled_age_months > 0
      ? input.scheduled_age_months * 4
      : 0)

  return WINDOW_BY_SCHEDULE.get(scheduleLookupKey(input.vaccine_name, doseLabel, scheduled)) ?? null
}
