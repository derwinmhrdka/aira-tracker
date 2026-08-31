'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Immunization } from '@/lib/api-client'
import {
  buildImmunizationChart,
  CHART_BAR_GAP,
  CHART_BAR_HEIGHT,
  CHART_KIND_LABEL,
  CHART_KIND_STYLE,
  CHART_MONTH_COL_WIDTH,
  CHART_ROW_PAD,
  CHART_YEAR_COL_WIDTH,
  getChartColumnForBabyWeeks,
  getChartGridWidthPx,
  weeksToGridPx,
  type ChartCell,
  type ChartCellKind,
  type ChartDoseBar,
} from '@/lib/immunization-chart'
import { formatVaccineRange } from '@/lib/immunization-idai'
import { getImmunizationWeekRange, type VaccineStatus } from '@/lib/immunization-utils'

type ImmunizationScheduleChartProps = {
  items: Immunization[]
  babyAgeWeeks?: number | null
  onSelectItem: (item: Immunization) => void
}

function cellStatusRing(status?: VaccineStatus, isDone?: boolean): string {
  if (isDone) return 'ring-2 ring-green-500 ring-offset-1 ring-offset-card'
  if (status === 'overdue')
    return 'ring-2 ring-red-500 ring-offset-1 ring-offset-card animate-pulse'
  if (status === 'due') return 'ring-2 ring-amber-400 ring-offset-1 ring-offset-card'
  return ''
}

function ChartDoseBarButton({
  bar,
  onClick,
}: {
  bar: ChartDoseBar
  onClick: () => void
}) {
  const status = (bar.item.status ??
    (bar.item.is_done ? 'done' : 'upcoming')) as VaccineStatus
  const kindStyle = CHART_KIND_STYLE[bar.kind]
  const left = weeksToGridPx(bar.startWeeks)
  const width = Math.max(weeksToGridPx(bar.endWeeks) - left, 14)
  const top = bar.lane * (CHART_BAR_HEIGHT + CHART_BAR_GAP) + CHART_ROW_PAD

  return (
    <button
      type="button"
      onClick={onClick}
      title={`${bar.item.vaccine_name} · ${bar.item.dose_label ?? 'dosis'}`}
      style={{ left, width, top, height: CHART_BAR_HEIGHT }}
      className={`absolute flex min-w-[14px] items-center justify-center rounded-md px-1 text-[10px] font-bold tabular-nums transition-transform active:scale-[0.98] ${kindStyle} ${cellStatusRing(status, bar.item.is_done)}`}
    >
      <span className="truncate">{bar.item.is_done ? '✓' : bar.doseDisplay}</span>
    </button>
  )
}

function CellDetailSheet({
  cells,
  onClose,
  onSelectItem,
}: {
  cells: ChartCell[]
  onClose: () => void
  onSelectItem: (item: Immunization) => void
}) {
  const suppressCloseRef = useRef(true)

  useEffect(() => {
    suppressCloseRef.current = true
    const t = window.setTimeout(() => {
      suppressCloseRef.current = false
    }, 400)
    return () => window.clearTimeout(t)
  }, [])

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[72] bg-black/45"
        onClick={() => {
          if (suppressCloseRef.current) return
          onClose()
        }}
      />
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 380, damping: 34 }}
        className="fixed inset-x-0 bottom-0 z-[73] max-h-[70vh] overflow-y-auto rounded-t-3xl border border-border bg-card p-5 shadow-2xl"
        style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))' }}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-muted" />
        <div className="space-y-2">
          {cells.map(({ item, kind, doseDisplay }) => {
            const status = (item.status ??
              (item.is_done ? 'done' : 'upcoming')) as VaccineStatus
            const { minWeeks, maxWeeks } = getImmunizationWeekRange(item)
            const windowLabel = formatVaccineRange(
              minWeeks,
              maxWeeks,
              item.scheduled_age_weeks
            )

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onSelectItem(item)
                  onClose()
                }}
                className="flex w-full items-center gap-3 rounded-xl border border-border bg-secondary/30 p-3 text-left active:bg-secondary/60"
              >
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    item.is_done
                      ? 'bg-green-500 text-white'
                      : status === 'overdue'
                        ? 'bg-red-500 text-white'
                        : status === 'due'
                          ? 'bg-amber-400 text-amber-950'
                          : 'bg-secondary text-muted-foreground'
                  }`}
                >
                  {item.is_done ? '✓' : doseDisplay}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {item.vaccine_name}
                  </p>
                  {windowLabel && (
                    <p className="text-[10px] tabular-nums text-muted-foreground">
                      {windowLabel}
                    </p>
                  )}
                </div>
                {kind !== 'primer' && (
                  <span
                    className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold ${CHART_KIND_STYLE[kind]}`}
                  >
                    {kind === 'booster' ? 'B' : kind === 'catchup' ? 'K' : kind === 'endemic' ? 'E' : 'R'}
                  </span>
                )}
              </button>
            )
          })}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="mt-3 w-full rounded-xl bg-secondary py-2.5 text-sm font-semibold text-foreground"
        >
          Tutup
        </button>
      </motion.div>
    </>
  )
}

function ChartGridBackground({
  columns,
  babyColumnId,
  height,
}: {
  columns: ReturnType<typeof buildImmunizationChart>['columns']
  babyColumnId: string | null
  height: number
}) {
  return (
    <div className="pointer-events-none absolute inset-0 flex" style={{ height }}>
      {columns.map((col) => (
        <div
          key={col.id}
          className={`relative shrink-0 border-r border-border/25 last:border-r-0 ${
            col.group === 'month' ? 'w-10' : 'w-9'
          } ${babyColumnId === col.id ? 'bg-primary/[0.06]' : ''}`}
        >
          {babyColumnId === col.id && (
            <span className="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-primary/50" />
          )}
        </div>
      ))}
    </div>
  )
}

export function ImmunizationScheduleChart({
  items,
  babyAgeWeeks,
  onSelectItem,
}: ImmunizationScheduleChartProps) {
  const { columns, rows } = useMemo(() => buildImmunizationChart(items), [items])
  const [selectedCells, setSelectedCells] = useState<ChartCell[] | null>(null)
  const babyColumnId = babyAgeWeeks != null ? getChartColumnForBabyWeeks(babyAgeWeeks) : null

  const monthColumns = columns.filter((c) => c.group === 'month')
  const yearColumns = columns.filter((c) => c.group === 'year')
  const gridWidth = getChartGridWidthPx(columns)

  const legendKinds: ChartCellKind[] = [
    'primer',
    'catchup',
    'booster',
    'endemic',
    'highrisk',
  ]

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-border bg-secondary/30 px-3 py-2">
        {legendKinds.map((kind) => (
          <div key={kind} className="flex items-center gap-1">
            <span
              className={`inline-flex h-3.5 w-3.5 rounded ${CHART_KIND_STYLE[kind]}`}
            />
            <span className="text-[10px] text-muted-foreground">
              {CHART_KIND_LABEL[kind]}
            </span>
          </div>
        ))}
        {babyColumnId && (
          <div className="flex items-center gap-1">
            <span className="inline-block h-3.5 w-0.5 bg-primary" />
            <span className="text-[10px] text-primary">Sekarang</span>
          </div>
        )}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-sm [-webkit-overflow-scrolling:touch]">
        <div className="min-w-max">
          <div className="sticky top-0 z-20 border-b border-border bg-card/95 backdrop-blur-sm">
            <div className="flex">
              <div className="sticky left-0 z-30 w-[5.5rem] shrink-0 border-r border-border bg-card px-2 py-2">
                <p className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground">
                  Vaksin
                </p>
              </div>
              <div>
                <div className="flex">
                  {monthColumns.map((col) => (
                    <div
                      key={col.id}
                      className={`relative flex w-10 shrink-0 flex-col items-center justify-end border-r border-border/40 py-1.5 ${
                        babyColumnId === col.id ? 'bg-primary/10' : ''
                      }`}
                    >
                      {babyColumnId === col.id && (
                        <span className="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-primary/70" />
                      )}
                      <span className="relative text-[10px] font-bold tabular-nums text-foreground">
                        {col.label}
                      </span>
                    </div>
                  ))}
                  {yearColumns.map((col) => (
                    <div
                      key={col.id}
                      className={`relative flex w-9 shrink-0 flex-col items-center justify-end border-r border-border/40 py-1.5 last:border-r-0 ${
                        babyColumnId === col.id ? 'bg-primary/10' : ''
                      }`}
                    >
                      {babyColumnId === col.id && (
                        <span className="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-primary/70" />
                      )}
                      <span className="relative text-[10px] font-bold tabular-nums text-foreground">
                        {col.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {rows.map((row) => {
            const rowHeight =
              row.laneCount * (CHART_BAR_HEIGHT + CHART_BAR_GAP) + CHART_ROW_PAD * 2

            return (
              <div
                key={row.id}
                className="flex border-b border-border/50 last:border-b-0"
              >
                <div className="sticky left-0 z-10 flex w-[5.5rem] shrink-0 items-center border-r border-border bg-card px-2 py-2">
                  <p className="text-[10px] font-semibold leading-tight text-foreground">
                    {row.label}
                  </p>
                </div>
                <div
                  className="relative shrink-0"
                  style={{ width: gridWidth, height: rowHeight }}
                >
                  <ChartGridBackground
                    columns={columns}
                    babyColumnId={babyColumnId}
                    height={rowHeight}
                  />
                  {row.bars.map((bar) => (
                    <ChartDoseBarButton
                      key={bar.item.id}
                      bar={bar}
                      onClick={() =>
                        setSelectedCells([
                          {
                            item: bar.item,
                            doseDisplay: bar.doseDisplay,
                            kind: bar.kind,
                          },
                        ])
                      }
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <AnimatePresence>
        {selectedCells && (
          <CellDetailSheet
            cells={selectedCells}
            onClose={() => setSelectedCells(null)}
            onSelectItem={onSelectItem}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
