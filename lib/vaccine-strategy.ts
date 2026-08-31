import type { Immunization, VaccinePaymentMethod } from '@/lib/api-client'

export const VACCINE_STRATEGY_SETTING_KEY = 'vaccine_strategy'

export const PAYMENT_METHOD_LABEL: Record<VaccinePaymentMethod, string> = {
  INHEALTH: 'Inhealth',
  FULLERTON: 'Fullerton',
  PUSKESMAS: 'Puskesmas',
  CASH: 'Cash',
}

export const PAYMENT_METHOD_STYLE: Record<VaccinePaymentMethod, string> = {
  INHEALTH: 'bg-sky-100 text-sky-800 dark:bg-sky-950/50 dark:text-sky-300',
  FULLERTON: 'bg-violet-100 text-violet-800 dark:bg-violet-950/50 dark:text-violet-300',
  PUSKESMAS: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300',
  CASH: 'bg-secondary text-muted-foreground',
}

export type VaccineCatalogItem = {
  id: string
  name: string
  brand?: string
  priceMinIdr: number
  priceMaxIdr: number
  preferredPayment?: VaccinePaymentMethod
}

export const VACCINE_CATALOG: VaccineCatalogItem[] = [
  {
    id: 'hexaxim',
    name: 'DPT-HepB-Hib',
    brand: 'Hexaxim',
    priceMinIdr: 0,
    priceMaxIdr: 0,
    preferredPayment: 'INHEALTH',
  },
  {
    id: 'pcv13',
    name: 'PCV13',
    priceMinIdr: 900_000,
    priceMaxIdr: 1_100_000,
    preferredPayment: 'FULLERTON',
  },
  {
    id: 'rotarix',
    name: 'Rotarix (RV1)',
    priceMinIdr: 450_000,
    priceMaxIdr: 550_000,
    preferredPayment: 'FULLERTON',
  },
  {
    id: 'polio-opv',
    name: 'Polio Tetes',
    priceMinIdr: 0,
    priceMaxIdr: 50_000,
    preferredPayment: 'INHEALTH',
  },
  {
    id: 'ipv',
    name: 'Polio IPV',
    priceMinIdr: 0,
    priceMaxIdr: 150_000,
    preferredPayment: 'INHEALTH',
  },
  {
    id: 'influenza',
    name: 'Influenza',
    priceMinIdr: 350_000,
    priceMaxIdr: 450_000,
    preferredPayment: 'FULLERTON',
  },
  {
    id: 'dsa',
    name: 'Jasa Dokter Sp.A',
    priceMinIdr: 400_000,
    priceMaxIdr: 500_000,
  },
  {
    id: 'bcg',
    name: 'BCG',
    priceMinIdr: 0,
    priceMaxIdr: 100_000,
    preferredPayment: 'PUSKESMAS',
  },
]

export type InsuranceRule = {
  id: VaccinePaymentMethod
  label: string
  annualLimitIdr?: number
  resetMonth?: number
  resetDay?: number
  notes: string[]
}

export const DEFAULT_INSURANCE_RULES: InsuranceRule[] = [
  {
    id: 'INHEALTH',
    label: 'Inhealth',
    notes: [
      'Cover 100% imunisasi dasar + Hexaxim non-demam.',
      'Cover 100% jasa dokter Sp.A tanpa plafon.',
      'Khusus kunjungan DPT combo — jangan digabung asuransi lain.',
    ],
  },
  {
    id: 'FULLERTON',
    label: 'Fullerton',
    annualLimitIdr: 5_000_000,
    resetMonth: 1,
    resetDay: 1,
    notes: [
      'Cover semua vaksin (PCV, Rotavirus, Influenza, dll).',
      'Plafon Rp5.000.000/tahun, reset 1 Januari.',
      'Khusus kunjungan PCV/Rotavirus/Influenza — pisah hari dari Inhealth.',
    ],
  },
  {
    id: 'PUSKESMAS',
    label: 'Puskesmas',
    notes: ['Program imunisasi dasar gratis/bersubsidi.'],
  },
  {
    id: 'CASH',
    label: 'Cash',
    notes: ['Bayar pribadi di luar asuransi.'],
  },
]

export type VaccineStrategyVisit = {
  id: string
  order: number
  title: string
  targetDate?: string | null
  targetDateEnd?: string | null
  ageLabel?: string
  actions: string
  paymentMethod: VaccinePaymentMethod
  estimatedCostIdr?: number | null
  notes?: string | null
}

export type VaccineStrategySettings = {
  clinicName?: string
  doctorName?: string
  rotavirusType?: string
  visitGapWeeks?: number
  /** Biaya sudah terpakai sebelum tracking di app (per tahun kalender). */
  fullertonUsedBeforeTrackingIdr?: number
  insuranceRules: InsuranceRule[]
  visits: VaccineStrategyVisit[]
}

export const DEFAULT_VACCINE_STRATEGY: VaccineStrategySettings = {
  clinicName: 'RS Columbia Asia BSD',
  doctorName: 'dr. Rita, Sp.A',
  rotavirusType: 'Rotarix (RV1, 2 dosis)',
  visitGapWeeks: 3,
  fullertonUsedBeforeTrackingIdr: 575_000,
  insuranceRules: DEFAULT_INSURANCE_RULES,
  visits: [
    {
      id: 'v1',
      order: 1,
      title: 'Kunjungan 1',
      targetDate: '2026-09-19',
      ageLabel: '2 bln 25 hr',
      actions: 'PCV13 dosis 1 + Rotarix dosis 1',
      paymentMethod: 'FULLERTON',
      estimatedCostIdr: 1_950_000,
      notes: 'Sisa plafon ~Rp2.475.000',
    },
    {
      id: 'v2',
      order: 2,
      title: 'Kunjungan 2',
      targetDate: '2026-10-10',
      targetDateEnd: '2026-10-17',
      ageLabel: '3,5 bln',
      actions: 'DPT-HepB-Hib 2 (Hexaxim) + Polio Tetes',
      paymentMethod: 'INHEALTH',
      estimatedCostIdr: 0,
      notes: 'Plafon Fullerton utuh',
    },
    {
      id: 'v3',
      order: 3,
      title: 'Kunjungan 3',
      targetDate: '2026-11-07',
      targetDateEnd: '2026-11-14',
      ageLabel: '4,5 bln',
      actions: 'PCV13 dosis 2 + Rotarix dosis 2 (lunas)',
      paymentMethod: 'FULLERTON',
      estimatedCostIdr: 1_950_000,
      notes: 'Sisa plafon ~Rp525.000',
    },
    {
      id: 'v4',
      order: 4,
      title: 'Kunjungan 4',
      targetDate: '2026-12-05',
      targetDateEnd: '2026-12-12',
      ageLabel: '5,5 bln',
      actions: 'DPT-HepB-Hib 3 (Hexaxim) + Polio IPV',
      paymentMethod: 'INHEALTH',
      estimatedCostIdr: 0,
    },
    {
      id: 'v5',
      order: 5,
      title: 'Kunjungan 5',
      targetDate: '2027-01-15',
      ageLabel: '6,5 bln',
      actions: 'Influenza dosis 1',
      paymentMethod: 'FULLERTON',
      estimatedCostIdr: 850_000,
      notes: 'Plafon baru Rp5.000.000',
    },
  ],
}

export function parseStrategySettings(raw: unknown): VaccineStrategySettings {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_VACCINE_STRATEGY }
  const o = raw as Partial<VaccineStrategySettings>
  return {
    clinicName: o.clinicName ?? DEFAULT_VACCINE_STRATEGY.clinicName,
    doctorName: o.doctorName ?? DEFAULT_VACCINE_STRATEGY.doctorName,
    rotavirusType: o.rotavirusType ?? DEFAULT_VACCINE_STRATEGY.rotavirusType,
    visitGapWeeks: o.visitGapWeeks ?? DEFAULT_VACCINE_STRATEGY.visitGapWeeks,
    fullertonUsedBeforeTrackingIdr:
      o.fullertonUsedBeforeTrackingIdr ??
      DEFAULT_VACCINE_STRATEGY.fullertonUsedBeforeTrackingIdr,
    insuranceRules:
      Array.isArray(o.insuranceRules) && o.insuranceRules.length > 0
        ? o.insuranceRules
        : DEFAULT_INSURANCE_RULES,
    visits:
      Array.isArray(o.visits) && o.visits.length > 0
        ? [...o.visits].sort((a, b) => a.order - b.order)
        : DEFAULT_VACCINE_STRATEGY.visits,
  }
}

function yearPeriodStart(year: number, month: number, day: number): Date {
  return new Date(year, month - 1, day)
}

function getInsurancePeriod(
  method: VaccinePaymentMethod,
  rules: InsuranceRule[],
  refDate: Date
): { start: Date; end: Date; limitIdr: number | null } | null {
  const rule = rules.find((r) => r.id === method)
  if (!rule?.annualLimitIdr) return null

  const resetMonth = rule.resetMonth ?? 1
  const resetDay = rule.resetDay ?? 1
  const y = refDate.getFullYear()
  const m = refDate.getMonth() + 1
  const d = refDate.getDate()

  let periodYear = y
  if (m < resetMonth || (m === resetMonth && d < resetDay)) {
    periodYear = y - 1
  }

  const start = yearPeriodStart(periodYear, resetMonth, resetDay)
  const end = yearPeriodStart(periodYear + 1, resetMonth, resetDay)
  end.setDate(end.getDate() - 1)

  return { start, end, limitIdr: rule.annualLimitIdr }
}

export type PlafonSummary = {
  method: VaccinePaymentMethod
  label: string
  limitIdr: number | null
  usedIdr: number
  remainingIdr: number | null
  periodLabel: string
  unlimited: boolean
}

export function computePlafonSummaries(
  immunizations: Immunization[],
  settings: VaccineStrategySettings,
  refDate = new Date()
): PlafonSummary[] {
  const summaries: PlafonSummary[] = []

  for (const rule of settings.insuranceRules) {
    if (rule.id === 'INHEALTH') {
      summaries.push({
        method: 'INHEALTH',
        label: rule.label,
        limitIdr: null,
        usedIdr: 0,
        remainingIdr: null,
        periodLabel: 'Tanpa plafon',
        unlimited: true,
      })
      continue
    }

    if (rule.id === 'FULLERTON' && rule.annualLimitIdr) {
      const period = getInsurancePeriod('FULLERTON', settings.insuranceRules, refDate)
      if (!period) continue

      const usedFromLogs = immunizations
        .filter(
          (i) =>
            i.is_done &&
            i.payment_method === 'FULLERTON' &&
            i.cost_idr != null &&
            i.cost_idr > 0 &&
            i.date_given
        )
        .filter((i) => {
          const given = new Date(i.date_given!)
          return given >= period.start && given <= period.end
        })
        .reduce((sum, i) => sum + (i.cost_idr ?? 0), 0)

      const periodYear = period.start.getFullYear()
      const refYear = refDate.getFullYear()
      const opening =
        periodYear === refYear || periodYear === refYear - 1
          ? settings.fullertonUsedBeforeTrackingIdr ?? 0
          : 0

      const usedIdr = usedFromLogs + opening
      const remainingIdr = Math.max(0, rule.annualLimitIdr - usedIdr)

      summaries.push({
        method: 'FULLERTON',
        label: rule.label,
        limitIdr: rule.annualLimitIdr,
        usedIdr,
        remainingIdr,
        periodLabel: `${period.start.getFullYear()}–${period.end.getFullYear()}`,
        unlimited: false,
      })
      continue
    }

    if (rule.id === 'PUSKESMAS' || rule.id === 'CASH') {
      const usedIdr = immunizations
        .filter((i) => i.is_done && i.payment_method === rule.id && i.cost_idr)
        .reduce((sum, i) => sum + (i.cost_idr ?? 0), 0)

      summaries.push({
        method: rule.id,
        label: rule.label,
        limitIdr: null,
        usedIdr,
        remainingIdr: null,
        periodLabel: 'Total tercatat',
        unlimited: true,
      })
    }
  }

  return summaries
}

export function formatIdr(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatPriceRange(item: VaccineCatalogItem): string {
  if (item.priceMinIdr === 0 && item.priceMaxIdr === 0) return 'Rp0 (asuransi)'
  if (item.priceMinIdr === item.priceMaxIdr) return formatIdr(item.priceMinIdr)
  return `${formatIdr(item.priceMinIdr)}–${formatIdr(item.priceMaxIdr)}`
}

export function formatVisitDateRange(visit: VaccineStrategyVisit): string {
  if (!visit.targetDate) return '—'
  const start = new Date(visit.targetDate).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
  if (!visit.targetDateEnd || visit.targetDateEnd === visit.targetDate) return start
  const end = new Date(visit.targetDateEnd).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
  })
  return `${start} – ${end}`
}
