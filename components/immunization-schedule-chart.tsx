'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Immunization } from '@/lib/api-client'
import {
  STATUS_LABEL,
  STATUS_STYLE,
  type VaccineStatus,
} from '@/lib/immunization-utils'
import {
  buildImmunizationChart,
  CHART_KIND_LABEL,
  CHART_KIND_STYLE,
  getChartColumnForBabyWeeks,
  type ChartCell,
  type ChartCellKind,
} from '@/lib/immunization-chart'
import { formatVaccineRange } from '@/lib/immunization-idai'

type ImmunizationScheduleChartProps = {
  items: Immunization[]
  babyAgeWeeks?: number | null
  onSelectItem: (item: Immunization) => void
}

function cellStatusRing(status?: VaccineStatus, isDone?: boolean): string {
  if (isDone) return 'ring-2 ring-green-500 ring-offset-1 ring-offset-card'
  if (status === 'overdue') return 'ring-2 ring-red-500 ring-offset-1 ring-offset-card animate-pulse'
  if (status === 'due') return 'ring-2 ring-amber-400 ring-offset-1 ring-offset-card'
  return ''
}

function ChartCellButton({
  cell,
  onClick,
}: {
  cell: ChartCell
  onClick: () => void
}) {
  const status = (cell.item.status ??
    (cell.item.is_done ? 'done' : 'upcoming')) as VaccineStatus
  const kindStyle = CHART_KIND_STYLE[cell.kind]

  return (
    <button
      type="button"
      onClick={onClick}
      title={`${cell.item.vaccine_name} · ${cell.item.dose_label ?? 'dosis'}`}
      className={`flex h-8 min-w-[2rem] items-center justify-center rounded-md text-[11px] font-bold tabular-nums transition-transform active:scale-95 ${kindStyle} ${cellStatusRing(status, cell.item.is_done)}`}
    >
      {cell.item.is_done ? '✓' : cell.doseDisplay}
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
        <p className="mb-3 font-heading text-sm font-bold text-foreground">
          {cells.length === 1
            ? cells[0].item.vaccine_name
            : `${cells.length} vaksin`}
        </p>
        <div className="space-y-2">
          {cells.map(({ item, kind, doseDisplay }) => {
            const status = (item.status ??
              (item.is_done ? 'done' : 'upcoming')) as VaccineStatus
            const windowLabel = formatVaccineRange(
              item.min_weeks,
              item.max_weeks,
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
                className="flex w-full items-start gap-3 rounded-xl border border-border bg-secondary/30 p-3 text-left active:bg-secondary/60"
              >
                <span className="text-lg leading-none">
                  {item.is_done ? '✅' : status === 'overdue' ? '⚠️' : '💉'}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground">
                    {item.vaccine_name}
                    {item.dose_label ? (
                      <span className="font-normal text-muted-foreground">
                        {' '}
                        · {item.dose_label}
                      </span>
                    ) : null}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {kind !== 'primer' && (
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${CHART_KIND_STYLE[kind]}`}
                      >
                        {CHART_KIND_LABEL[kind]}
                      </span>
                    )}
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_STYLE[status]}`}
                    >
                      {STATUS_LABEL[status]}
                    </span>
                  </div>
                  {windowLabel && (
                    <p className="mt-1 text-[10px] tabular-nums text-muted-foreground">
                      {windowLabel}
                    </p>
                  )}
                </div>
                <span className="shrink-0 rounded-lg bg-background px-2 py-1 text-xs font-bold tabular-nums ring-1 ring-border">
                  {item.is_done ? '✓' : doseDisplay}
                </span>
              </button>
            )
          })}
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

  const legendKinds: ChartCellKind[] = ['primer', 'catchup', 'booster', 'endemic', 'highrisk']

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-x-3 gap-y-1.5 rounded-xl border border-border bg-secondary/30 px-3 py-2">
        {legendKinds.map((kind) => (
          <div key={kind} className="flex items-center gap-1.5">
            <span
              className={`inline-flex h-4 w-4 items-center justify-center rounded text-[9px] font-bold ${CHART_KIND_STYLE[kind]}`}
            >
              •
            </span>
            <span className="text-[10px] font-medium text-muted-foreground">
              {CHART_KIND_LABEL[kind]}
            </span>
          </div>
        ))}
        {babyColumnId && (
          <div className="flex items-center gap-1.5">
            <span className="inline-block h-4 w-0.5 bg-primary" />
            <span className="text-[10px] font-medium text-primary">Sekarang</span>
          </div>
        )}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-sm [-webkit-overflow-scrolling:touch]">
        <div className="min-w-max">
          {/* Header row */}
          <div className="sticky top-0 z-20 border-b border-border bg-card/95 backdrop-blur-sm">
            <div className="flex">
              <div className="sticky left-0 z-30 w-[5.5rem] shrink-0 border-r border-border bg-card px-2 py-2">
                <p className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground">
                  Vaksin
                </p>
              </div>
              <div>
                <div className="flex border-b border-border/60">
                  <div
                    className="flex shrink-0 items-end px-1 py-1"
                    style={{ width: monthColumns.length * 40 }}
                  >
                    <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                      Bulan
                    </span>
                  </div>
                  <div
                    className="flex shrink-0 items-end border-l border-border/60 px-1 py-1"
                    style={{ width: yearColumns.length * 36 }}
                  >
                    <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                      Tahun
                    </span>
                  </div>
                </div>
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

          {/* Data rows */}
          {rows.map((row) => (
            <div
              key={row.id}
              className="flex border-b border-border/50 last:border-b-0"
            >
              <div className="sticky left-0 z-10 w-[5.5rem] shrink-0 border-r border-border bg-card px-2 py-2">
                <p className="text-[10px] font-semibold leading-tight text-foreground">
                  {row.label}
                </p>
              </div>
              <div className="flex">
                {columns.map((col) => {
                  const cells = row.cells.get(col.id) ?? []
                  const hasDone = cells.some((c) => c.item.is_done)
                  const hasOverdue = cells.some((c) => c.item.status === 'overdue')

                  return (
                    <div
                      key={col.id}
                      className={`flex w-[${col.group === 'month' ? '2.5rem' : '2.25rem'}] shrink-0 items-center justify-center border-r border-border/30 p-0.5 last:border-r-0 ${
                        col.group === 'month' ? 'w-10' : 'w-9'
                      } ${babyColumnId === col.id ? 'bg-primary/[0.06]' : ''} ${
                        hasOverdue ? 'bg-red-50/40 dark:bg-red-950/10' : hasDone ? 'bg-green-50/30 dark:bg-green-950/10' : ''
                      }`}
                    >
                      {cells.length > 0 ? (
                        <div className="flex flex-col gap-0.5">
                          {cells.length <= 2 ? (
                            cells.map((cell) => (
                              <ChartCellButton
                                key={cell.item.id}
                                cell={cell}
                                onClick={() => setSelectedCells(cells)}
                              />
                            ))
                          ) : (
                            <button
                              type="button"
                              onClick={() => setSelectedCells(cells)}
                              className="flex h-8 min-w-[2rem] items-center justify-center rounded-md bg-sky-500 text-[10px] font-bold text-white"
                            >
                              {cells.length}
                            </button>
                          )}
                        </div>
                      ) : (
                        <span className="h-8 w-8" aria-hidden />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
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
