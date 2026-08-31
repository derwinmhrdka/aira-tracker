import type { Immunization, VaccinePaymentMethod } from '@/lib/api-client'
import { ageInWeeks } from '@/lib/baby-utils'
import { getImmunizationWeekRange } from '@/lib/immunization-utils'
import { formatVaccineRange, formatWeeks } from '@/lib/immunization-idai'

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

export const DEFAULT_DSA_COST_IDR = 450_000

export type VaccineCatalogItem = {
  id: string
  name: string
  brand?: string
  priceMinIdr: number
  priceMaxIdr: number
  /** Imunisasi dasar — boleh Inhealth & Puskesmas */
  isBasic: boolean
  /** Tersedia di Puskesmas */
  atPuskesmas: boolean
  preferredPayment?: VaccinePaymentMethod
}

export const VACCINE_CATALOG: VaccineCatalogItem[] = [
  {
    id: 'hexaxim',
    name: 'DPT-HepB-Hib',
    brand: 'Hexaxim',
    priceMinIdr: 0,
    priceMaxIdr: 0,
    isBasic: true,
    atPuskesmas: false,
    preferredPayment: 'INHEALTH',
  },
  {
    id: 'polio-opv',
    name: 'Polio Tetes',
    brand: 'bOPV',
    priceMinIdr: 0,
    priceMaxIdr: 0,
    isBasic: true,
    atPuskesmas: true,
    preferredPayment: 'INHEALTH',
  },
  {
    id: 'ipv',
    name: 'Polio IPV',
    priceMinIdr: 0,
    priceMaxIdr: 150_000,
    isBasic: true,
    atPuskesmas: false,
    preferredPayment: 'INHEALTH',
  },
  {
    id: 'bcg',
    name: 'BCG',
    priceMinIdr: 0,
    priceMaxIdr: 0,
    isBasic: true,
    atPuskesmas: true,
    preferredPayment: 'PUSKESMAS',
  },
  {
    id: 'mr',
    name: 'MR / MMR',
    priceMinIdr: 0,
    priceMaxIdr: 0,
    isBasic: true,
    atPuskesmas: true,
    preferredPayment: 'PUSKESMAS',
  },
  {
    id: 'pcv13',
    name: 'PCV13',
    brand: 'Prevenar',
    priceMinIdr: 900_000,
    priceMaxIdr: 1_100_000,
    isBasic: false,
    atPuskesmas: false,
    preferredPayment: 'FULLERTON',
  },
  {
    id: 'rotarix',
    name: 'Rotavirus',
    brand: 'Rotarix',
    priceMinIdr: 450_000,
    priceMaxIdr: 550_000,
    isBasic: false,
    atPuskesmas: false,
    preferredPayment: 'FULLERTON',
  },
  {
    id: 'influenza',
    name: 'Influenza',
    priceMinIdr: 350_000,
    priceMaxIdr: 450_000,
    isBasic: false,
    atPuskesmas: false,
    preferredPayment: 'FULLERTON',
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
    notes: ['Dasar + DSA 100%.'],
  },
  {
    id: 'FULLERTON',
    label: 'Fullerton',
    annualLimitIdr: 5_000_000,
    resetMonth: 1,
    resetDay: 1,
    notes: ['Plafon Rp5 jt/tahun.'],
  },
  {
    id: 'PUSKESMAS',
    label: 'Puskesmas',
    notes: ['Dasar gratis.'],
  },
  {
    id: 'CASH',
    label: 'Cash',
    notes: ['Bayar sendiri.'],
  },
]

export type VaccineStrategyVisit = {
  id: string
  order: number
  immunizationId?: string | null
  vaccineCatalogId: string
  vaccineName: string
  vaccineProduct?: string | null
  paymentMethod: VaccinePaymentMethod
  dsaCostIdr: number
  vaccineCostIdr: number
  estimatedCostIdr: number
  targetDate?: string | null
  /** @deprecated legacy display */
  title?: string
  actions?: string
  notes?: string | null
  ageLabel?: string
  targetDateEnd?: string | null
}

export type VaccineStrategySettings = {
  clinicName?: string
  doctorName?: string
  rotavirusType?: string
  visitGapWeeks?: number
  fullertonUsedBeforeTrackingIdr?: number
  /** Harga custom per jenis vaksin (catalog id → Rp) */
  catalogPrices?: Record<string, number>
  insuranceRules: InsuranceRule[]
  visits: VaccineStrategyVisit[]
}

export const DEFAULT_VACCINE_STRATEGY: VaccineStrategySettings = {
  clinicName: 'RS Columbia Asia BSD',
  doctorName: 'dr. Rita, Sp.A',
  rotavirusType: 'Rotarix (RV1)',
  visitGapWeeks: 3,
  fullertonUsedBeforeTrackingIdr: 0,
  insuranceRules: DEFAULT_INSURANCE_RULES,
  visits: [],
}

export function getCatalogItem(id: string): VaccineCatalogItem | undefined {
  return VACCINE_CATALOG.find((c) => c.id === id)
}

export function getCatalogPrice(
  catalogId: string,
  catalogPrices?: Record<string, number>
): number {
  const item = getCatalogItem(catalogId)
  if (!item) return 0
  const saved = catalogPrices?.[catalogId]
  if (saved != null && saved >= 0) return saved
  return catalogMidPrice(item)
}

export function getCatalogRecommendedLabel(catalog: VaccineCatalogItem): string {
  if (catalog.priceMinIdr === 0 && catalog.priceMaxIdr === 0) return 'Rp0'
  if (catalog.priceMinIdr === catalog.priceMaxIdr) {
    return formatIdr(catalog.priceMinIdr)
  }
  return `${formatIdr(catalog.priceMinIdr)} – ${formatIdr(catalog.priceMaxIdr)}`
}

export function catalogMidPrice(item: VaccineCatalogItem): number {
  return Math.round((item.priceMinIdr + item.priceMaxIdr) / 2)
}

export function getAllowedPayments(catalog: VaccineCatalogItem): VaccinePaymentMethod[] {
  const methods: VaccinePaymentMethod[] = ['INHEALTH', 'FULLERTON', 'PUSKESMAS', 'CASH']
  return methods.filter((m) => {
    if (m === 'INHEALTH' && !catalog.isBasic) return false
    if (m === 'PUSKESMAS' && !catalog.atPuskesmas) return false
    return true
  })
}

export function suggestCatalogForImmunization(name: string): VaccineCatalogItem | null {
  const n = name.toLowerCase()
  const rules: [RegExp, string][] = [
    [/dpt|hexavalen|pentavalen|hib/, 'hexaxim'],
    [/pcv|pneumococ/, 'pcv13'],
    [/rotavirus|rotarix|rotateq/, 'rotarix'],
    [/polio.*tetes|\bopv\b/, 'polio-opv'],
    [/ipv|polio suntik/, 'ipv'],
    [/influenza|\bflu\b/, 'influenza'],
    [/bcg/, 'bcg'],
    [/campak|mmr|\bmr\b/, 'mr'],
  ]
  for (const [re, id] of rules) {
    if (re.test(n)) return getCatalogItem(id) ?? null
  }
  return null
}

export type CostEstimate = {
  vaccineCostIdr: number
  dsaCostIdr: number
  totalOutOfPocketIdr: number
  plafonImpactIdr: number
}

export function estimateStrategyCost(
  catalog: VaccineCatalogItem,
  payment: VaccinePaymentMethod,
  dsaCostIdr: number,
  vaccinePriceIdr?: number
): CostEstimate {
  const vaccineCostIdr = vaccinePriceIdr ?? catalogMidPrice(catalog)

  switch (payment) {
    case 'INHEALTH':
    case 'PUSKESMAS':
      return {
        vaccineCostIdr: 0,
        dsaCostIdr: 0,
        totalOutOfPocketIdr: 0,
        plafonImpactIdr: 0,
      }
    case 'FULLERTON':
      return {
        vaccineCostIdr,
        dsaCostIdr: 0,
        totalOutOfPocketIdr: dsaCostIdr,
        plafonImpactIdr: vaccineCostIdr,
      }
    case 'CASH':
      return {
        vaccineCostIdr,
        dsaCostIdr,
        totalOutOfPocketIdr: vaccineCostIdr + dsaCostIdr,
        plafonImpactIdr: vaccineCostIdr + dsaCostIdr,
      }
  }
}

function migrateLegacyVisit(raw: Record<string, unknown>, order: number): VaccineStrategyVisit {
  if (raw.vaccineCatalogId && raw.vaccineName) {
    return {
      id: String(raw.id ?? `v-${order}`),
      order: Number(raw.order ?? order),
      immunizationId: (raw.immunizationId as string) ?? null,
      vaccineCatalogId: String(raw.vaccineCatalogId),
      vaccineName: String(raw.vaccineName),
      vaccineProduct: (raw.vaccineProduct as string) ?? null,
      paymentMethod: raw.paymentMethod as VaccinePaymentMethod,
      dsaCostIdr: Number(raw.dsaCostIdr ?? 0),
      vaccineCostIdr: Number(raw.vaccineCostIdr ?? raw.estimatedCostIdr ?? 0),
      estimatedCostIdr: Number(raw.estimatedCostIdr ?? 0),
      targetDate: (raw.targetDate as string) ?? null,
    }
  }

  const actions = String(raw.actions ?? '')
  const catalog = suggestCatalogForImmunization(actions) ?? VACCINE_CATALOG[0]
  const payment = (raw.paymentMethod as VaccinePaymentMethod) ?? 'FULLERTON'
  const est = estimateStrategyCost(catalog, payment, 0)

  return {
    id: String(raw.id ?? `v-${order}`),
    order: Number(raw.order ?? order),
    vaccineCatalogId: catalog.id,
    vaccineName: catalog.name,
    vaccineProduct: catalog.brand ?? null,
    paymentMethod: payment,
    dsaCostIdr: 0,
    vaccineCostIdr: est.vaccineCostIdr,
    estimatedCostIdr: Number(raw.estimatedCostIdr ?? est.plafonImpactIdr),
    targetDate: (raw.targetDate as string) ?? null,
    title: raw.title as string | undefined,
    actions,
    notes: raw.notes as string | null | undefined,
    ageLabel: raw.ageLabel as string | undefined,
    targetDateEnd: raw.targetDateEnd as string | null | undefined,
  }
}

export function parseStrategySettings(raw: unknown): VaccineStrategySettings {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_VACCINE_STRATEGY }
  const o = raw as Partial<VaccineStrategySettings> & { visits?: unknown[] }
  const visits = Array.isArray(o.visits)
    ? o.visits.map((v, i) => migrateLegacyVisit(v as Record<string, unknown>, i + 1))
    : []

  return {
    clinicName: o.clinicName ?? DEFAULT_VACCINE_STRATEGY.clinicName,
    doctorName: o.doctorName ?? DEFAULT_VACCINE_STRATEGY.doctorName,
    rotavirusType: o.rotavirusType ?? DEFAULT_VACCINE_STRATEGY.rotavirusType,
    visitGapWeeks: o.visitGapWeeks ?? DEFAULT_VACCINE_STRATEGY.visitGapWeeks,
    fullertonUsedBeforeTrackingIdr:
      o.fullertonUsedBeforeTrackingIdr ??
      DEFAULT_VACCINE_STRATEGY.fullertonUsedBeforeTrackingIdr,
    catalogPrices:
      o.catalogPrices && typeof o.catalogPrices === 'object' ? o.catalogPrices : {},
    insuranceRules:
      Array.isArray(o.insuranceRules) && o.insuranceRules.length > 0
        ? o.insuranceRules
        : DEFAULT_INSURANCE_RULES,
    visits: [...visits].sort((a, b) => a.order - b.order),
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
  plannedIdr: number
  remainingIdr: number | null
  periodLabel: string
  unlimited: boolean
}

function sumPlanned(visits: VaccineStrategyVisit[], method: VaccinePaymentMethod): number {
  return visits
    .filter((v) => v.paymentMethod === method)
    .reduce((sum, v) => sum + (v.estimatedCostIdr ?? 0), 0)
}

export function computePlafonSummaries(
  immunizations: Immunization[],
  settings: VaccineStrategySettings,
  refDate = new Date()
): PlafonSummary[] {
  const summaries: PlafonSummary[] = []
  const planned = settings.visits

  for (const rule of settings.insuranceRules) {
    if (rule.id === 'INHEALTH') {
      summaries.push({
        method: 'INHEALTH',
        label: rule.label,
        limitIdr: null,
        usedIdr: 0,
        plannedIdr: 0,
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

      const plannedIdr = sumPlanned(planned, 'FULLERTON')
      const usedIdr = usedFromLogs + opening
      const remainingIdr = Math.max(0, rule.annualLimitIdr - usedIdr - plannedIdr)

      summaries.push({
        method: 'FULLERTON',
        label: rule.label,
        limitIdr: rule.annualLimitIdr,
        usedIdr,
        plannedIdr,
        remainingIdr,
        periodLabel: `${period.start.getFullYear()}`,
        unlimited: false,
      })
      continue
    }

    if (rule.id === 'CASH') {
      const usedIdr = immunizations
        .filter((i) => i.is_done && i.payment_method === 'CASH' && i.cost_idr)
        .reduce((sum, i) => sum + (i.cost_idr ?? 0), 0)
      const plannedIdr = sumPlanned(planned, 'CASH')

      summaries.push({
        method: 'CASH',
        label: rule.label,
        limitIdr: null,
        usedIdr,
        plannedIdr,
        remainingIdr: null,
        periodLabel: 'Total',
        unlimited: true,
      })
      continue
    }

    if (rule.id === 'PUSKESMAS') {
      summaries.push({
        method: 'PUSKESMAS',
        label: rule.label,
        limitIdr: null,
        usedIdr: 0,
        plannedIdr: 0,
        remainingIdr: null,
        periodLabel: 'Gratis',
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

/** Angka dengan pemisah ribuan (tanpa Rp) — untuk input/display */
export function formatIdrInput(amount: number): string {
  if (!Number.isFinite(amount) || amount <= 0) return ''
  return new Intl.NumberFormat('id-ID').format(amount)
}

export function parseIdrInput(value: string): number {
  const digits = value.replace(/\D/g, '')
  if (!digits) return 0
  return Math.max(0, parseInt(digits, 10))
}

export function formatPriceRange(item: VaccineCatalogItem): string {
  if (item.priceMinIdr === 0 && item.priceMaxIdr === 0) return 'Rp0'
  if (item.priceMinIdr === item.priceMaxIdr) return formatIdr(item.priceMinIdr)
  return `${formatIdr(item.priceMinIdr)}–${formatIdr(item.priceMaxIdr)}`
}

export function formatVisitDate(visit: VaccineStrategyVisit): string {
  if (!visit.targetDate) return '—'
  return new Date(visit.targetDate).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function visitDisplayLabel(visit: VaccineStrategyVisit): string {
  const product = visit.vaccineProduct?.trim()
  if (product) return `${visit.vaccineName} · ${product}`
  return visit.vaccineName
}

export function buildStrategyVisit(input: {
  immunizationId?: string | null
  vaccineCatalogId: string
  vaccineName: string
  vaccineProduct?: string | null
  paymentMethod: VaccinePaymentMethod
  dsaCostIdr: number
  vaccinePriceIdr?: number
  targetDate?: string | null
  order: number
}): VaccineStrategyVisit {
  const catalog = getCatalogItem(input.vaccineCatalogId) ?? VACCINE_CATALOG[0]
  const vaccinePrice = input.vaccinePriceIdr ?? catalogMidPrice(catalog)
  const est = estimateStrategyCost(
    catalog,
    input.paymentMethod,
    input.dsaCostIdr,
    vaccinePrice
  )

  return {
    id: `v-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    order: input.order,
    immunizationId: input.immunizationId ?? null,
    vaccineCatalogId: input.vaccineCatalogId,
    vaccineName: input.vaccineName,
    vaccineProduct: input.vaccineProduct ?? catalog.brand ?? null,
    paymentMethod: input.paymentMethod,
    dsaCostIdr: est.dsaCostIdr,
    vaccineCostIdr: est.vaccineCostIdr,
    estimatedCostIdr: est.plafonImpactIdr,
    targetDate: input.targetDate ?? null,
  }
}

export function getVaccineInclusiveWeekRange(item: Immunization): {
  minWeeks: number
  maxWeeks: number
} {
  return getImmunizationWeekRange(item)
}

export type VaccinePlanRangeWarning = {
  kind: 'early' | 'late'
  ageWeeks: number
  rangeLabel: string
  message: string
  shortMessage: string
}

export function getVaccinePlanRangeWarning(
  item: Immunization,
  birthDate: string | null | undefined,
  targetDate: string | null | undefined
): VaccinePlanRangeWarning | null {
  if (!birthDate || !targetDate) return null

  const ageWeeks = ageInWeeks(birthDate, targetDate)
  const { minWeeks, maxWeeks } = getVaccineInclusiveWeekRange(item)
  const rangeLabel =
    formatVaccineRange(minWeeks, maxWeeks, item.scheduled_age_weeks) ??
    `${formatWeeks(minWeeks)}–${formatWeeks(maxWeeks)}`

  if (ageWeeks < minWeeks) {
    return {
      kind: 'early',
      ageWeeks,
      rangeLabel,
      message: `${formatWeeks(ageWeeks)} di luar rentang ${rangeLabel}`,
      shortMessage: `${formatWeeks(ageWeeks)} ∉ ${rangeLabel}`,
    }
  }

  if (ageWeeks > maxWeeks) {
    return {
      kind: 'late',
      ageWeeks,
      rangeLabel,
      message: `${formatWeeks(ageWeeks)} di luar rentang ${rangeLabel}`,
      shortMessage: `${formatWeeks(ageWeeks)} ∉ ${rangeLabel}`,
    }
  }

  return null
}

export function getVisitPlanRangeWarning(
  visit: VaccineStrategyVisit,
  immunizations: Immunization[],
  birthDate: string | null | undefined
): VaccinePlanRangeWarning | null {
  if (!visit.immunizationId || !visit.targetDate) return null
  const item = immunizations.find((i) => i.id === visit.immunizationId)
  if (!item) return null
  return getVaccinePlanRangeWarning(item, birthDate, visit.targetDate)
}
