'use client'

import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, ArrowDown, ArrowUp, Check, Circle, Ruler, Scale } from 'lucide-react'
import {
  formatGrowthIdealRange,
  formatGrowthValueWithUnit,
  formatGrowthVelocitySummary,
  getGrowthTrend,
  getGrowthVelocityTrend,
  getOverallMonthlyGrowthStatus,
  GROWTH_TREND_LABEL,
  GROWTH_VELOCITY_LABEL,
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

const TREND_STYLE: Record<
  GrowthTrend,
  { pill: string; dot: string; icon: typeof Check; banner: string }
> = {
  normal: {
    pill: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
    dot: 'bg-emerald-500',
    icon: Check,
    banner: 'border-emerald-200/70 bg-emerald-50/80 text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200',
  },
  under: {
    pill: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
    dot: 'bg-amber-500',
    icon: ArrowDown,
    banner: 'border-amber-300/70 bg-amber-50/80 text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200',
  },
  over: {
    pill: 'bg-orange-500/15 text-orange-700 dark:text-orange-300',
    dot: 'bg-orange-500',
    icon: ArrowUp,
    banner: 'border-orange-300/70 bg-orange-50/80 text-orange-950 dark:border-orange-900/50 dark:bg-orange-950/30 dark:text-orange-200',
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
  const StatusIcon = style.icon

  return (
    <div className="rounded-xl border border-border bg-secondary/20 p-3">
      <div className="mb-2 flex items-center gap-2">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <MetricIcon className="h-3.5 w-3.5" strokeWidth={2.25} />
        </span>
        <p className="text-sm font-semibold text-foreground">
          {growthMetricFullLabel(item.metric)}
        </p>
      </div>

      <div className="space-y-1.5 pl-9">
        <p className="text-sm tabular-nums text-foreground">
          <span className="text-muted-foreground">Saat ini · </span>
          <span className="font-bold">{formatGrowthValueWithUnit(item.value, item.metric)}</span>
        </p>
        {ideal ? (
          <p className="text-xs tabular-nums text-muted-foreground">
            Rentang posisi WHO · <span className="font-medium text-foreground">{ideal}</span>
          </p>
        ) : null}
        <div className="flex flex-wrap gap-1.5">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ${style.pill}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
            <StatusIcon className="h-3 w-3" strokeWidth={2.5} />
            Posisi · {GROWTH_TREND_LABEL[trend]}
          </span>
          {velocity && velocityStyle ? (
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ${velocityStyle.pill}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${velocityStyle.dot}`} />
              {velocity.trend === 'normal' ? (
                <Check className="h-3 w-3" strokeWidth={2.5} />
              ) : velocity.trend === 'under' ? (
                <ArrowDown className="h-3 w-3" strokeWidth={2.5} />
              ) : (
                <ArrowUp className="h-3 w-3" strokeWidth={2.5} />
              )}
              Laju · {velocity.isWeightFaltering ? 'KBM' : GROWTH_VELOCITY_LABEL[velocity.trend]}
            </span>
          ) : null}
        </div>
        {velocitySummary ? (
          <p className="text-xs tabular-nums text-muted-foreground">
            Kenaikan 1 bln terakhir ({velocity?.bandLabel}) ·{' '}
            <span className="font-medium text-foreground">{velocitySummary}</span>
          </p>
        ) : null}
        {velocity?.statusDetail ? (
          <p
            className={`text-[11px] leading-snug ${
              velocity.isWeightFaltering || velocity.alert
                ? 'font-medium text-amber-800 dark:text-amber-300'
                : 'text-muted-foreground'
            }`}
          >
            {velocity.statusDetail}
          </p>
        ) : null}
        {velocity?.alert ? (
          <p className="flex items-start gap-1.5 text-[11px] font-medium leading-snug text-orange-800 dark:text-orange-300">
            <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
            {velocity.alert}
          </p>
        ) : null}
      </div>
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
  const overallStyle = overall ? TREND_STYLE[overall.trend] : null

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
              Info pertumbuhan
            </h2>
            {overall && overallStyle ? (
              <div
                className={`mb-3 rounded-xl border px-3 py-2.5 text-xs leading-snug ${overallStyle.banner}`}
              >
                {overall.hasWeightFaltering || overall.hasHeadAlert ? (
                  <AlertTriangle className="mb-1 inline h-3.5 w-3.5 align-[-2px]" aria-hidden />
                ) : (
                  <Check className="mb-1 inline h-3.5 w-3.5 align-[-2px]" aria-hidden />
                )}{' '}
                {overall.message}
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
