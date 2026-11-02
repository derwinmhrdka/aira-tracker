import type { BabyProfile, GrowthLog } from '@/lib/api-client'
import {
  getMetricHistoryFromLogs,
  getMetricPreviousMeasurement,
  type GrowthMetricPoint,
} from '@/lib/growth-mini'
import type { GrowthMetric } from '@/lib/who-growth'

export type GrowthMetricCell = {
  metric: GrowthMetric
  value: number
  measureDate: string
  previous?: GrowthMetricPoint
}

function buildMetricsFromLogs(logs: GrowthLog[]): GrowthMetricCell[] {
  const metrics: GrowthMetric[] = ['weight', 'height', 'head']
  const cells: GrowthMetricCell[] = []

  for (const metric of metrics) {
    const history = getMetricHistoryFromLogs(logs, metric)
    if (history.length === 0) continue
    const current = history[0]
    cells.push({
      metric,
      value: current.value,
      measureDate: current.date,
      previous: getMetricPreviousMeasurement(history) ?? undefined,
    })
  }

  return cells
}

function buildMetricsFromProfile(profile: BabyProfile): GrowthMetricCell[] {
  const cells: GrowthMetricCell[] = []
  if (profile.latest_weight_kg != null && profile.latest_growth_date) {
    cells.push({
      metric: 'weight',
      value: profile.latest_weight_kg,
      measureDate: profile.latest_growth_date,
    })
  }
  if (profile.latest_height_cm != null && profile.latest_growth_date) {
    cells.push({
      metric: 'height',
      value: profile.latest_height_cm,
      measureDate: profile.latest_growth_date,
    })
  }
  if (
    profile.latest_head_circumference_cm != null &&
    profile.latest_head_circumference_cm > 0 &&
    profile.latest_head_date
  ) {
    cells.push({
      metric: 'head',
      value: profile.latest_head_circumference_cm,
      measureDate: profile.latest_head_date,
    })
  }
  return cells
}

export function buildGrowthMetrics(logs: GrowthLog[], profile: BabyProfile | null): GrowthMetricCell[] {
  if (logs.length > 0) return buildMetricsFromLogs(logs)
  if (profile) return buildMetricsFromProfile(profile)
  return []
}
