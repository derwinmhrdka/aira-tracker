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
  /** Jenis buatan pengguna (bisa diedit di pengaturan) */
  isCustom?: boolean
  /** Kata kunci vaksin jadwal, dipisah koma — khusus custom */
  matchKeywords?: string
}

export const MANUAL_CATALOG_ID = '__manual__'

export const MANUAL_CATALOG_ITEM: VaccineCatalogItem = {
  id: MANUAL_CATALOG_ID,
  name: 'Lainnya',
  priceMinIdr: 0,
  priceMaxIdr: 0,
  isBasic: false,
  atPuskesmas: false,
}

export const BUILTIN_CATALOG_VACCINES: Record<string, string> = {
  hepb0: 'HB0',
  'polio-0': 'Polio 0',
  bcg: 'BCG',
  pentavalen: 'DPT-HB-Hib',
  hexaxim: 'DPT-HB-Hib (Hexavalen)',
  'polio-opv': 'Polio OPV',
  ipv: 'IPV',
  pcv13: 'PCV',
  rotarix: 'Rotavirus (Rotarix)',
  rotateq: 'Rotavirus (Rotateq)',
  mr: 'MR / MMR',
  influenza: 'Influenza',
}

export const VACCINE_CATALOG: VaccineCatalogItem[] = [
  {
    id: 'hepb0',
    name: 'Hepatitis B',
    brand: 'HB0',
    priceMinIdr: 0,
    priceMaxIdr: 0,
    isBasic: true,
    atPuskesmas: true,
    preferredPayment: 'INHEALTH',
  },
  {
    id: 'polio-0',
    name: 'Polio Tetes',
    brand: 'Polio 0',
    priceMinIdr: 0,
    priceMaxIdr: 0,
    isBasic: true,
    atPuskesmas: true,
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
    id: 'pentavalen',
    name: 'DPT-HepB-Hib',
    brand: 'Pentavalen',
    priceMinIdr: 0,
    priceMaxIdr: 0,
    isBasic: true,
    atPuskesmas: true,
    preferredPayment: 'PUSKESMAS',
  },
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
    id: 'rotateq',
    name: 'Rotavirus',
    brand: 'Rotateq',
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

export type StrategyVisitVaccine = {
  id: string
  immunizationId?: string | null
  vaccineCatalogId: string
  vaccineName: string
  vaccineProduct?: string | null
  vaccineCostIdr: number
}

export type VaccineStrategyVisit = {
  id: string
  order: number
  paymentMethod: VaccinePaymentMethod
  dsaCostIdr: number
  vaccineCostIdr: number
  estimatedCostIdr: number
  targetDate?: string | null
  vaccines: StrategyVisitVaccine[]
  /** @deprecated single-vaccine legacy */
  immunizationId?: string | null
  vaccineCatalogId?: string
  vaccineName?: string
  vaccineProduct?: string | null
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
  /** Jenis vaksin tambahan dari pengaturan */
  customCatalog?: VaccineCatalogItem[]
  insuranceRules: InsuranceRule[]
  visits: VaccineStrategyVisit[]
}

export type StrategyCatalogContext = Pick<
  VaccineStrategySettings,
  'customCatalog' | 'catalogPrices'
>

export const DEFAULT_VACCINE_STRATEGY: VaccineStrategySettings = {
  clinicName: 'RS Columbia Asia BSD',
  doctorName: 'dr. Rita, Sp.A',
  rotavirusType: 'Rotarix (RV1)',
  visitGapWeeks: 3,
  fullertonUsedBeforeTrackingIdr: 0,
  insuranceRules: DEFAULT_INSURANCE_RULES,
  visits: [],
}

export function getBuiltinCatalogItem(id: string): VaccineCatalogItem | undefined {
  return VACCINE_CATALOG.find((c) => c.id === id)
}

export function getMergedCatalog(
  settings?: Pick<VaccineStrategySettings, 'customCatalog'>
): VaccineCatalogItem[] {
  return [...VACCINE_CATALOG, ...(settings?.customCatalog ?? [])]
}

export function getCatalogItem(
  id: string,
  settings?: Pick<VaccineStrategySettings, 'customCatalog'>
): VaccineCatalogItem | undefined {
  if (id === MANUAL_CATALOG_ID) return MANUAL_CATALOG_ITEM
  return (
    getBuiltinCatalogItem(id) ?? settings?.customCatalog?.find((c) => c.id === id)
  )
}

export function isManualCatalogId(id: string): boolean {
  return id === MANUAL_CATALOG_ID
}

export function matchesCatalogKeywords(text: string, keywords: string): boolean {
  const hay = text.toLowerCase()
  return keywords
    .split(',')
    .map((k) => k.trim().toLowerCase())
    .filter(Boolean)
    .some((kw) => hay.includes(kw))
}

export function getCatalogVaccineLabel(item: VaccineCatalogItem): string {
  if (item.isCustom && item.matchKeywords?.trim()) {
    return item.matchKeywords
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean)
      .join(', ')
  }
  return BUILTIN_CATALOG_VACCINES[item.id] ?? item.name
}

export function getCatalogPrice(
  catalogId: string,
  catalogPrices?: Record<string, number>,
  settings?: Pick<VaccineStrategySettings, 'customCatalog'>
): number {
  const item = getCatalogItem(catalogId, settings)
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
  if (catalog.id === MANUAL_CATALOG_ID) {
    return ['INHEALTH', 'FULLERTON', 'PUSKESMAS', 'CASH']
  }
  const methods: VaccinePaymentMethod[] = ['INHEALTH', 'FULLERTON', 'PUSKESMAS', 'CASH']
  return methods.filter((m) => {
    if (m === 'INHEALTH' && !catalog.isBasic) return false
    if (m === 'PUSKESMAS' && !catalog.atPuskesmas) return false
    return true
  })
}

export function getCatalogIdsForImmunization(
  vaccineName: string,
  doseLabel?: string | null
): string[] {
  const text = `${vaccineName} ${doseLabel ?? ''}`.toLowerCase()

  if (/hepatitis\s*b|\bhb0\b|hep\.?\s*b\s*0/.test(text)) return ['hepb0']
  if (/polio\s*0|opv\s*0/.test(text)) return ['polio-0']
  if (/\bbcg\b/.test(text)) return ['bcg']

  // Rotavirus sebelum DPT — nama "Monovalen/Pentavalen" ikut kata pentavalen
  if (/rotavirus|rotarix|rotateq/.test(text)) {
    if (/rotateq/.test(text) && !/rotarix/.test(text)) return ['rotateq']
    if (/monovalen/.test(text) && !/pentavalen/.test(text)) return ['rotarix']
    if (/pentavalen/.test(text) && !/monovalen/.test(text) && !/atau/.test(text)) {
      return ['rotateq']
    }
    return ['rotarix', 'rotateq']
  }

  if (/dpt|hexavalen|pentavalen|hib/.test(text)) return ['pentavalen', 'hexaxim']
  if (/ipv|polio suntik/.test(text)) return ['ipv']
  if (/polio/.test(text)) return ['polio-opv']
  if (/pcv|pneumococ/.test(text)) return ['pcv13']
  if (/campak|mmr|\bmr\b/.test(text)) return ['mr']
  if (/influenza|\bflu\b/.test(text)) return ['influenza']

  return []
}

export function getCatalogOptionsForImmunization(
  vaccineName: string,
  doseLabel?: string | null,
  settings?: Pick<VaccineStrategySettings, 'customCatalog'>
): VaccineCatalogItem[] {
  const builtIn = getCatalogIdsForImmunization(vaccineName, doseLabel)
    .map((id) => getBuiltinCatalogItem(id))
    .filter((item): item is VaccineCatalogItem => !!item)

  const text = `${vaccineName} ${doseLabel ?? ''}`
  const custom = (settings?.customCatalog ?? []).filter(
    (item) => item.matchKeywords && matchesCatalogKeywords(text, item.matchKeywords)
  )

  const seen = new Set<string>()
  return [...builtIn, ...custom].filter((item) => {
    if (seen.has(item.id)) return false
    seen.add(item.id)
    return true
  })
}

export function suggestCatalogForImmunization(
  vaccineName: string,
  doseLabel?: string | null,
  settings?: Pick<VaccineStrategySettings, 'customCatalog'>
): VaccineCatalogItem | null {
  const text = `${vaccineName} ${doseLabel ?? ''}`.toLowerCase()
  const allowed = getCatalogOptionsForImmunization(vaccineName, doseLabel, settings)
  if (allowed.length === 0) return null
  if (allowed.length === 1) return allowed[0]

  if (/hexavalen|hexaxim/.test(text)) {
    return getBuiltinCatalogItem('hexaxim') ?? allowed[0]
  }
  if (/rotateq/.test(text) && /rota/.test(text)) {
    return getBuiltinCatalogItem('rotateq') ?? allowed[0]
  }
  if (/rotarix|monovalen/.test(text) && /rota/.test(text)) {
    return getBuiltinCatalogItem('rotarix') ?? allowed[0]
  }
  if (/dpt|hib|pentavalen|hexavalen/.test(text) && !/rota/.test(text)) {
    return getBuiltinCatalogItem('pentavalen') ?? allowed[0]
  }

  return allowed[0]
}

/** @deprecated use suggestCatalogForImmunization(name, doseLabel) */
export function suggestCatalogFromName(name: string): VaccineCatalogItem | null {
  return suggestCatalogForImmunization(name)
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
        dsaCostIdr,
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

export function estimateVisitCost(
  vaccines: { catalogId: string; vaccinePriceIdr: number }[],
  payment: VaccinePaymentMethod,
  dsaCostIdr: number,
  catalogPrices?: Record<string, number>,
  settings?: Pick<VaccineStrategySettings, 'customCatalog'>
): CostEstimate {
  let vaccineTotal = 0
  for (const row of vaccines) {
    const price =
      row.vaccinePriceIdr > 0
        ? row.vaccinePriceIdr
        : getCatalogPrice(row.catalogId, catalogPrices, settings)
    vaccineTotal += price
  }

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
        vaccineCostIdr: vaccineTotal,
        dsaCostIdr,
        totalOutOfPocketIdr: dsaCostIdr,
        plafonImpactIdr: vaccineTotal,
      }
    case 'CASH':
      return {
        vaccineCostIdr: vaccineTotal,
        dsaCostIdr,
        totalOutOfPocketIdr: vaccineTotal + dsaCostIdr,
        plafonImpactIdr: vaccineTotal + dsaCostIdr,
      }
  }
}

/** Total biaya kunjungan untuk tampilan (vaksin + DSA). */
export function getVisitDisplayTotal(visit: VaccineStrategyVisit): number {
  if (visit.paymentMethod === 'INHEALTH' || visit.paymentMethod === 'PUSKESMAS') {
    return 0
  }
  return getVisitVaccineCostTotal(visit) + (visit.dsaCostIdr ?? 0)
}

/** Dampak ke plafon asuransi (vaksin saja, tanpa DSA cash). */
export function getVisitPlafonImpact(visit: VaccineStrategyVisit): number {
  if (visit.paymentMethod === 'FULLERTON') {
    return getVisitVaccineCostTotal(visit)
  }
  if (visit.paymentMethod === 'CASH') {
    return getVisitDisplayTotal(visit)
  }
  return 0
}

/** Urutkan rencana kunjungan berdasarkan tanggal (naik), tanpa tanggal di akhir. */
export function sortVisitsByDateAsc(visits: VaccineStrategyVisit[]): VaccineStrategyVisit[] {
  return [...visits]
    .sort((a, b) => {
      const dateA = a.targetDate ?? ''
      const dateB = b.targetDate ?? ''
      if (dateA && dateB) {
        const cmp = dateA.localeCompare(dateB)
        if (cmp !== 0) return cmp
      } else if (dateA && !dateB) {
        return -1
      } else if (!dateA && dateB) {
        return 1
      }
      return a.order - b.order
    })
    .map((visit, index) => ({ ...visit, order: index + 1 }))
}

function migrateLegacyVisit(raw: Record<string, unknown>, order: number): VaccineStrategyVisit {
  if (Array.isArray(raw.vaccines) && raw.vaccines.length > 0) {
    const vaccines = (raw.vaccines as Record<string, unknown>[]).map((v, i) => ({
      id: String(v.id ?? `vv-${order}-${i}`),
      immunizationId: (v.immunizationId as string) ?? null,
      vaccineCatalogId: String(v.vaccineCatalogId),
      vaccineName: String(v.vaccineName),
      vaccineProduct: (v.vaccineProduct as string) ?? null,
      vaccineCostIdr: Number(v.vaccineCostIdr ?? 0),
    }))
    return {
      id: String(raw.id ?? `v-${order}`),
      order: Number(raw.order ?? order),
      paymentMethod: raw.paymentMethod as VaccinePaymentMethod,
      dsaCostIdr: Number(raw.dsaCostIdr ?? 0),
      vaccineCostIdr: Number(raw.vaccineCostIdr ?? 0),
      estimatedCostIdr: Number(raw.estimatedCostIdr ?? 0),
      targetDate: (raw.targetDate as string) ?? null,
      vaccines,
    }
  }

  if (raw.vaccineCatalogId && raw.vaccineName) {
    const vaccine: StrategyVisitVaccine = {
      id: `vv-${order}-0`,
      immunizationId: (raw.immunizationId as string) ?? null,
      vaccineCatalogId: String(raw.vaccineCatalogId),
      vaccineName: String(raw.vaccineName),
      vaccineProduct: (raw.vaccineProduct as string) ?? null,
      vaccineCostIdr: Number(raw.vaccineCostIdr ?? 0),
    }
    return {
      id: String(raw.id ?? `v-${order}`),
      order: Number(raw.order ?? order),
      paymentMethod: raw.paymentMethod as VaccinePaymentMethod,
      dsaCostIdr: Number(raw.dsaCostIdr ?? 0),
      vaccineCostIdr: Number(raw.vaccineCostIdr ?? raw.estimatedCostIdr ?? 0),
      estimatedCostIdr: Number(raw.estimatedCostIdr ?? 0),
      targetDate: (raw.targetDate as string) ?? null,
      vaccines: [vaccine],
      immunizationId: vaccine.immunizationId,
      vaccineCatalogId: vaccine.vaccineCatalogId,
      vaccineName: vaccine.vaccineName,
      vaccineProduct: vaccine.vaccineProduct,
    }
  }

  const actions = String(raw.actions ?? '')
  const catalog = suggestCatalogForImmunization(actions) ?? VACCINE_CATALOG[0]
  const payment = (raw.paymentMethod as VaccinePaymentMethod) ?? 'FULLERTON'
  const est = estimateStrategyCost(catalog, payment, 0)
  const vaccine: StrategyVisitVaccine = {
    id: `vv-${order}-0`,
    vaccineCatalogId: catalog.id,
    vaccineName: catalog.name,
    vaccineProduct: catalog.brand ?? null,
    vaccineCostIdr: est.vaccineCostIdr,
  }

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
    vaccines: [vaccine],
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
    customCatalog: Array.isArray(o.customCatalog)
      ? o.customCatalog.map((item) => ({
          id: String((item as VaccineCatalogItem).id),
          name: String((item as VaccineCatalogItem).name),
          brand: (item as VaccineCatalogItem).brand,
          priceMinIdr: Number((item as VaccineCatalogItem).priceMinIdr ?? 0),
          priceMaxIdr: Number((item as VaccineCatalogItem).priceMaxIdr ?? 0),
          isBasic: Boolean((item as VaccineCatalogItem).isBasic),
          atPuskesmas: Boolean((item as VaccineCatalogItem).atPuskesmas),
          preferredPayment: (item as VaccineCatalogItem).preferredPayment,
          isCustom: true,
          matchKeywords: (item as VaccineCatalogItem).matchKeywords,
        }))
      : [],
    insuranceRules:
      Array.isArray(o.insuranceRules) && o.insuranceRules.length > 0
        ? o.insuranceRules
        : DEFAULT_INSURANCE_RULES,
    visits: sortVisitsByDateAsc(
      visits.map((visit) => reconcileVisitTotals(visit))
    ),
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
  /** Vaksin rencana yang mengurangi plafon */
  plannedPlafonIdr: number
  /** DSA rencana (cash, tidak mengurangi plafon Fullerton) */
  plannedDsaIdr: number
  /** Total rencana tampilan (vaksin + DSA) */
  plannedIdr: number
  remainingIdr: number | null
  periodLabel: string
  unlimited: boolean
}

function sumPlafonImpact(visits: VaccineStrategyVisit[], method: VaccinePaymentMethod): number {
  return visits
    .filter((v) => v.paymentMethod === method)
    .reduce((sum, v) => sum + getVisitPlafonImpact(v), 0)
}

function sumPlannedDsa(visits: VaccineStrategyVisit[], method: VaccinePaymentMethod): number {
  return visits
    .filter((v) => v.paymentMethod === method)
    .reduce((sum, v) => sum + (v.dsaCostIdr ?? 0), 0)
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
        plannedPlafonIdr: 0,
        plannedDsaIdr: 0,
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

      const plannedPlafonIdr = sumPlafonImpact(planned, 'FULLERTON')
      const plannedDsaIdr = sumPlannedDsa(planned, 'FULLERTON')
      const plannedIdr = plannedPlafonIdr + plannedDsaIdr
      const usedIdr = usedFromLogs + opening
      const remainingIdr = Math.max(0, rule.annualLimitIdr - usedIdr - plannedPlafonIdr)

      summaries.push({
        method: 'FULLERTON',
        label: rule.label,
        limitIdr: rule.annualLimitIdr,
        usedIdr,
        plannedPlafonIdr,
        plannedDsaIdr,
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
      const cashVisits = planned.filter((v) => v.paymentMethod === 'CASH')
      const plannedPlafonIdr = cashVisits.reduce(
        (sum, v) => sum + getVisitDisplayTotal(v),
        0
      )
      const plannedDsaIdr = sumPlannedDsa(planned, 'CASH')
      const plannedIdr = plannedPlafonIdr

      summaries.push({
        method: 'CASH',
        label: rule.label,
        limitIdr: null,
        usedIdr,
        plannedPlafonIdr,
        plannedDsaIdr,
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
        plannedPlafonIdr: 0,
        plannedDsaIdr: 0,
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

export function getVisitVaccines(visit: VaccineStrategyVisit): StrategyVisitVaccine[] {
  if (visit.vaccines?.length) return visit.vaccines
  if (visit.vaccineCatalogId && visit.vaccineName) {
    return [
      {
        id: `${visit.id}-legacy`,
        immunizationId: visit.immunizationId ?? null,
        vaccineCatalogId: visit.vaccineCatalogId,
        vaccineName: visit.vaccineName,
        vaccineProduct: visit.vaccineProduct ?? null,
        vaccineCostIdr: visit.vaccineCostIdr ?? 0,
      },
    ]
  }
  return []
}

/** Total harga vaksin — jumlahkan dari baris vaksin jika ada. */
export function getVisitVaccineCostTotal(visit: VaccineStrategyVisit): number {
  const rows = getVisitVaccines(visit)
  if (rows.length > 0) {
    return rows.reduce((sum, row) => sum + (row.vaccineCostIdr ?? 0), 0)
  }
  return visit.vaccineCostIdr ?? 0
}

export function reconcileVisitTotals(visit: VaccineStrategyVisit): VaccineStrategyVisit {
  const vaccineCostIdr = getVisitVaccineCostTotal(visit)
  const dsa = visit.dsaCostIdr ?? 0
  const estimatedCostIdr =
    visit.paymentMethod === 'INHEALTH' || visit.paymentMethod === 'PUSKESMAS'
      ? 0
      : vaccineCostIdr + dsa
  return { ...visit, vaccineCostIdr, estimatedCostIdr }
}

export function visitDisplayLabel(visit: VaccineStrategyVisit): string {
  const vaccines = getVisitVaccines(visit)
  if (vaccines.length === 0) return 'Kunjungan'
  if (vaccines.length === 1) {
    const v = vaccines[0]
    const product = v.vaccineProduct?.trim()
    if (product) return `${v.vaccineName} · ${product}`
    return v.vaccineName
  }
  return vaccines.map((v) => v.vaccineName).join(' + ')
}

export function visitVaccineDetail(visit: VaccineStrategyVisit): string {
  const vaccines = getVisitVaccines(visit)
  if (vaccines.length <= 1) return ''
  return vaccines
    .map((v) => {
      const product = v.vaccineProduct?.trim()
      return product ? `${v.vaccineName} (${product})` : v.vaccineName
    })
    .join(' · ')
}

export type BuildStrategyVisitVaccineInput = {
  id?: string
  immunizationId?: string | null
  vaccineCatalogId: string
  vaccineName: string
  vaccineProduct?: string | null
  vaccinePriceIdr?: number
}

export function buildStrategyVisit(input: {
  id?: string
  vaccines: BuildStrategyVisitVaccineInput[]
  paymentMethod: VaccinePaymentMethod
  dsaCostIdr: number
  catalogPrices?: Record<string, number>
  customCatalog?: VaccineCatalogItem[]
  targetDate?: string | null
  order: number
}): VaccineStrategyVisit {
  const catalogCtx = {
    customCatalog: input.customCatalog,
    catalogPrices: input.catalogPrices,
  }
  const vaccineRows = input.vaccines.map((row, index) => {
    const catalog =
      getCatalogItem(row.vaccineCatalogId, catalogCtx) ?? VACCINE_CATALOG[0]
    const vaccinePrice =
      row.vaccinePriceIdr ??
      getCatalogPrice(row.vaccineCatalogId, input.catalogPrices, catalogCtx)
    return {
      id: row.id ?? `vv-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 5)}`,
      immunizationId: row.immunizationId ?? null,
      vaccineCatalogId: row.vaccineCatalogId,
      vaccineName: row.vaccineName,
      vaccineProduct: row.vaccineProduct ?? catalog.brand ?? null,
      vaccineCostIdr: vaccinePrice,
    }
  })

  const est = estimateVisitCost(
    vaccineRows.map((v) => ({
      catalogId: v.vaccineCatalogId,
      vaccinePriceIdr: v.vaccineCostIdr,
    })),
    input.paymentMethod,
    input.dsaCostIdr,
    input.catalogPrices,
    catalogCtx
  )

  const first = vaccineRows[0]
  const savedVisit: VaccineStrategyVisit = {
    id: input.id ?? `v-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    order: input.order,
    paymentMethod: input.paymentMethod,
    dsaCostIdr: input.dsaCostIdr,
    vaccineCostIdr: est.vaccineCostIdr,
    estimatedCostIdr: 0,
    targetDate: input.targetDate ?? null,
    vaccines: vaccineRows,
    immunizationId: first?.immunizationId ?? null,
    vaccineCatalogId: first?.vaccineCatalogId,
    vaccineName: first?.vaccineName,
    vaccineProduct: first?.vaccineProduct ?? null,
  }
  savedVisit.estimatedCostIdr = getVisitDisplayTotal(savedVisit)
  return reconcileVisitTotals(savedVisit)
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
  if (!visit.targetDate) return null
  for (const row of getVisitVaccines(visit)) {
    if (!row.immunizationId) continue
    const item = immunizations.find((i) => i.id === row.immunizationId)
    if (!item) continue
    const warning = getVaccinePlanRangeWarning(item, birthDate, visit.targetDate)
    if (warning) return warning
  }
  return null
}

export function getVisitPlanRangeWarnings(
  visit: VaccineStrategyVisit,
  immunizations: Immunization[],
  birthDate: string | null | undefined
): VaccinePlanRangeWarning[] {
  if (!visit.targetDate) return []
  const warnings: VaccinePlanRangeWarning[] = []
  for (const row of getVisitVaccines(visit)) {
    if (!row.immunizationId) continue
    const item = immunizations.find((i) => i.id === row.immunizationId)
    if (!item) continue
    const warning = getVaccinePlanRangeWarning(item, birthDate, visit.targetDate)
    if (warning) warnings.push(warning)
  }
  return warnings
}

export function getCatalogOptionsForPlan(
  vaccineName: string,
  doseLabel: string | null | undefined,
  paymentMethod: VaccinePaymentMethod,
  otherCatalogIds: string[],
  settings?: Pick<VaccineStrategySettings, 'customCatalog'>
): VaccineCatalogItem[] {
  return getCatalogOptionsForImmunization(vaccineName, doseLabel, settings).filter(
    (catalog) => {
      if (!getAllowedPayments(catalog).includes(paymentMethod)) return false
      return getAllowedPaymentsForVaccines(
        [...otherCatalogIds, catalog.id],
        settings
      ).includes(paymentMethod)
    }
  )
}

export function supportsManualEntryForPlan(
  paymentMethod: VaccinePaymentMethod,
  otherCatalogIds: string[],
  settings?: Pick<VaccineStrategySettings, 'customCatalog'>
): boolean {
  return getAllowedPaymentsForVaccines(
    [...otherCatalogIds, MANUAL_CATALOG_ID],
    settings
  ).includes(paymentMethod)
}

export function isImmunizationCompatibleWithPlan(
  vaccineName: string,
  doseLabel: string | null | undefined,
  paymentMethod: VaccinePaymentMethod,
  otherCatalogIds: string[],
  settings?: Pick<VaccineStrategySettings, 'customCatalog'>
): boolean {
  if (
    getCatalogOptionsForPlan(
      vaccineName,
      doseLabel,
      paymentMethod,
      otherCatalogIds,
      settings
    ).length > 0
  ) {
    return true
  }
  return supportsManualEntryForPlan(paymentMethod, otherCatalogIds, settings)
}

export function pickCatalogForPlan(
  vaccineName: string,
  doseLabel: string | null | undefined,
  paymentMethod: VaccinePaymentMethod,
  otherCatalogIds: string[],
  settings?: Pick<VaccineStrategySettings, 'customCatalog'>
): VaccineCatalogItem | null {
  const options = getCatalogOptionsForPlan(
    vaccineName,
    doseLabel,
    paymentMethod,
    otherCatalogIds,
    settings
  )
  if (options.length === 0) return null
  const suggested = suggestCatalogForImmunization(vaccineName, doseLabel, settings)
  if (suggested && options.some((o) => o.id === suggested.id)) return suggested
  return options[0]
}

export function getReferencedImmunizationIds(
  visits: VaccineStrategyVisit[]
): Set<string> {
  const ids = new Set<string>()
  for (const visit of visits) {
    for (const row of getVisitVaccines(visit)) {
      if (row.immunizationId) ids.add(row.immunizationId)
    }
  }
  return ids
}

/** Tambahkan kunjungan otomatis untuk vaksin selesai yang belum ada di rencana. */
export function syncCompletedImmunizationVisits(
  immunizations: Immunization[],
  settings: VaccineStrategySettings
): { visits: VaccineStrategyVisit[]; added: boolean } {
  const referencedIds = getReferencedImmunizationIds(settings.visits)
  const doneUnlinked = immunizations.filter(
    (item) => item.is_done && !referencedIds.has(item.id)
  )

  if (doneUnlinked.length === 0) {
    return { visits: settings.visits, added: false }
  }

  const byDate = new Map<string, Immunization[]>()
  for (const item of doneUnlinked) {
    const date = item.date_given ?? new Date().toISOString().split('T')[0]
    const list = byDate.get(date) ?? []
    list.push(item)
    byDate.set(date, list)
  }

  const sortedDates = [...byDate.keys()].sort()
  const visits = [...settings.visits]
  let order = visits.length

  for (const date of sortedDates) {
    const items = byDate.get(date)!
    order += 1
    const vaccines = items.map((item) => {
      const catalog = suggestCatalogForImmunization(
        item.vaccine_name,
        item.dose_label,
        settings
      )
      const catalogId = catalog?.id ?? MANUAL_CATALOG_ID
      return {
        immunizationId: item.id,
        vaccineCatalogId: catalogId,
        vaccineName: item.vaccine_name,
        vaccineProduct:
          item.vaccine_product?.trim() ||
          (catalog ? catalog.brand ?? null : item.vaccine_name),
        vaccinePriceIdr: 0,
      }
    })

    visits.push(
      buildStrategyVisit({
        vaccines,
        paymentMethod: 'CASH',
        dsaCostIdr: 0,
        catalogPrices: settings.catalogPrices,
        customCatalog: settings.customCatalog,
        targetDate: date,
        order,
      })
    )
  }

  return {
    visits: sortVisitsByDateAsc(visits),
    added: true,
  }
}

export function getAllowedPaymentsForVaccines(
  catalogIds: string[],
  settings?: Pick<VaccineStrategySettings, 'customCatalog'>
): VaccinePaymentMethod[] {
  const ids = catalogIds.filter(Boolean)
  if (ids.length === 0) return ['INHEALTH', 'FULLERTON', 'PUSKESMAS', 'CASH']
  const methods = ids.map((id) => {
    const catalog = getCatalogItem(id, settings)
    if (!catalog) return [] as VaccinePaymentMethod[]
    return getAllowedPayments(catalog)
  })
  return methods.reduce(
    (acc, list) => acc.filter((m) => list.includes(m)),
    methods[0] ?? []
  )
}
