import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-helpers'
import {
  DEFAULT_VACCINE_STRATEGY,
  parseStrategySettings,
  VACCINE_STRATEGY_SETTING_KEY,
  type VaccineStrategySettings,
} from '@/lib/vaccine-strategy'

async function loadStrategy(): Promise<VaccineStrategySettings> {
  const row = await prisma.appSetting.findUnique({
    where: { key: VACCINE_STRATEGY_SETTING_KEY },
  })
  if (!row?.value) return { ...DEFAULT_VACCINE_STRATEGY }
  return parseStrategySettings(row.value)
}

export async function GET() {
  return withAuth(async () => {
    const strategy = await loadStrategy()
    return NextResponse.json(strategy)
  })
}

export async function PATCH(request: NextRequest) {
  return withAuth(async () => {
    const body = await request.json()
    const current = await loadStrategy()

    const next: VaccineStrategySettings = {
      ...current,
      clinicName:
        body.clinic_name !== undefined ? String(body.clinic_name) : current.clinicName,
      doctorName:
        body.doctor_name !== undefined ? String(body.doctor_name) : current.doctorName,
      rotavirusType:
        body.rotavirus_type !== undefined
          ? String(body.rotavirus_type)
          : current.rotavirusType,
      visitGapWeeks:
        body.visit_gap_weeks !== undefined
          ? Number(body.visit_gap_weeks) || 3
          : current.visitGapWeeks,
      fullertonUsedBeforeTrackingIdr:
        body.fullerton_used_before_tracking_idr !== undefined
          ? Math.max(0, Number(body.fullerton_used_before_tracking_idr) || 0)
          : current.fullertonUsedBeforeTrackingIdr,
      catalogPrices:
        body.catalog_prices !== undefined && typeof body.catalog_prices === 'object'
          ? { ...(current.catalogPrices ?? {}), ...(body.catalog_prices as Record<string, number>) }
          : current.catalogPrices,
      insuranceRules: Array.isArray(body.insurance_rules)
        ? body.insurance_rules
        : current.insuranceRules,
      visits: Array.isArray(body.visits) ? body.visits : current.visits,
    }

    await prisma.appSetting.upsert({
      where: { key: VACCINE_STRATEGY_SETTING_KEY },
      create: { key: VACCINE_STRATEGY_SETTING_KEY, value: next as object },
      update: { value: next as object },
    })

    return NextResponse.json(parseStrategySettings(next))
  })
}
