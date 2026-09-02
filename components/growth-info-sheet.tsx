'use client'

import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, Check, Circle, Ruler, Scale } from 'lucide-react'
import {
  formatGrowthIdealRange,
  formatGrowthValueWithUnit,
  formatGrowthVelocityStatusLabel,
  formatGrowthVelocitySummary,
  getGrowthTrend,
  getGrowthVelocityTrend,
  getOverallMonthlyGrowthStatus,
  GROWTH_TREND_LABEL,
  growthMetricFullLabel,
  type GrowthMetricPoint,
  type GrowthTrend,
} from '@/lib/growth-mini'
import type { Gender, GrowthMetric } from '@/lib/who-growth'

export type GrowthInfoItem = {
  metric: GrowthMetric
  value: number
  measureDate: string
  previous?: GrowthMetricPoint
}

const TREND_STYLE: Record<GrowthTrend, { pill: string; text: string }> = {
  normal: {
    pill: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
    text: 'text-emerald-700 dark:text-emerald-300',
  },
  under: {
    pill: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
    text: 'text-amber-700 dark:text-amber-300',
  },
  over: {
    pill: 'bg-orange-500/15 text-orange-700 dark:text-orange-300',
    text: 'text-orange-700 dark:text-orange-300',
  },
}

const METRIC_ICON: Record<GrowthMetric, typeof Scale> = {
  weight: Scale,
  height: Ruler,
  head: Circle,
}

type GrowthInfoSheetProps = {
  open: boolean
  items: GrowthInfoItem[]
  birthDate: string
  gender: Gender
  onClose: () => void
}

function GrowthInfoRow({
  item,
  birthDate,
  gender,
}: {
  item: GrowthInfoItem
  birthDate: string
  gender: Gender
}) {
  const trend = getGrowthTrend(item.value, birthDate, item.measureDate, item.metric, gender)
  const ideal = formatGrowthIdealRange(birthDate, item.measureDate, item.metric, gender)
  const velocity = item.previous
    ? getGrowthVelocityTrend(
        { value: item.value, date: item.measureDate },
        item.previous,
        birthDate,
        item.metric,
        gender
      )
    : null
  const velocitySummary =
    item.previous != null
      ? formatGrowthVelocitySummary(
          { value: item.value, date: item.measureDate },
          item.previous,
          birthDate,
          item.metric,
          gender
        )
      : null
  const style = TREND_STYLE[trend]
  const velocityStyle = velocity ? TREND_STYLE[velocity.trend] : null
  const MetricIcon = METRIC_ICON[item.metric]

  return (
    <div className="rounded-xl border border-border bg-secondary/20 px-3 py-2.5">
      <div className="flex items-center gap-2">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <MetricIcon className="h-3 w-3" strokeWidth={2.25} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">
            {growthMetricFullLabel(item.metric)}
          </p>
          <p className="text-sm font-bold tabular-nums text-foreground">
            {formatGrowthValueWithUnit(item.value, item.metric)}
          </p>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap gap-1 pl-8">
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${style.pill}`}>
          Posisi {GROWTH_TREND_LABEL[trend]}
        </span>
        {velocity && velocityStyle ? (
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${velocityStyle.pill}`}>
            Laju {formatGrowthVelocityStatusLabel(velocity)}
          </span>
        ) : null}
      </div>

      {ideal ? (
        <p className="mt-1.5 pl-8 text-[10px] text-muted-foreground">
          Ideal WHO · {ideal}
        </p>
      ) : null}

      {velocitySummary ? (
        <p className={`mt-1 pl-8 text-[10px] font-medium tabular-nums ${velocityStyle?.text ?? 'text-muted-foreground'}`}>
          1 bln · {velocitySummary}
        </p>
      ) : null}

      {velocity?.alert ? (
        <p className="mt-1.5 flex items-start gap-1 pl-8 text-[10px] font-medium text-orange-700 dark:text-orange-300">
          <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
          LK perlu cek dokter
        </p>
      ) : null}
    </div>
  )
}

export function GrowthInfoSheet({
  open,
  items,
  birthDate,
  gender,
  onClose,
}: GrowthInfoSheetProps) {
  if (typeof window === 'undefined') return null

  const velocities = items.map((item) =>
    item.previous
      ? getGrowthVelocityTrend(
          { value: item.value, date: item.measureDate },
          item.previous,
          birthDate,
          item.metric,
          gender
        )
      : null
  )
  const overall = getOverallMonthlyGrowthStatus(velocities)
  const showBanner =
    overall &&
    (overall.hasWeightFaltering || overall.hasHeadAlert || overall.trend !== 'normal')

  return createPortal(
    <AnimatePresence>
      {open && items.length > 0 && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] bg-black/45"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 34 }}
            className="fixed inset-x-0 bottom-0 z-[71] max-h-[80vh] overflow-y-auto rounded-t-3xl border border-border bg-card p-4 shadow-2xl"
            style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-muted" />
            <h2 className="mb-3 font-heading text-base font-bold text-foreground">
              Pertumbuhan
            </h2>
            {showBanner && overall ? (
              <div
                className={`mb-3 flex items-start gap-1.5 rounded-xl border px-3 py-2 text-xs leading-snug ${
                  overall.hasWeightFaltering || overall.hasHeadAlert
                    ? 'border-amber-300/70 bg-amber-50/80 text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200'
                    : 'border-border bg-secondary/40 text-foreground'
                }`}
              >
                {overall.hasWeightFaltering || overall.hasHeadAlert ? (
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                ) : (
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                )}
                <span>{overall.message}</span>
              </div>
            ) : null}
            <div className="space-y-2">
              {items.map((item) => (
                <GrowthInfoRow
                  key={item.metric}
                  item={item}
                  birthDate={birthDate}
                  gender={gender}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="mt-4 w-full rounded-xl bg-secondary py-3 text-sm font-semibold text-foreground"
            >
              Tutup
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  )
}
