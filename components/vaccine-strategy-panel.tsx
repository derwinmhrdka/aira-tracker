'use client'

import { useMemo, useState } from 'react'
import { Check, MapPin, Pencil, Plus, Settings, Stethoscope, Trash2 } from 'lucide-react'
import type { Immunization, VaccinePaymentMethod, VaccineStrategySettings } from '@/lib/api-client'
import { PaymentMethodBadge, PaymentMethodLogo } from './payment-method-logo'
import { PlafonDetailSheet } from './plafon-detail-sheet'
import {
  computePlafonSummaries,
  formatIdr,
  formatVisitDate,
  getVisitDisplayTotal,
  getVisitPlanRangeWarning,
  isVisitFullyCompleted,
  PAYMENT_METHOD_CARD_STYLE,
  sortVisitsByDateAsc,
  VISIT_CARD_THEME,
  VISIT_DONE_THEME,
  visitDisplayLabel,
  visitVaccineDetail,
} from '@/lib/vaccine-strategy'

type VaccineStrategyPanelProps = {
  strategy: VaccineStrategySettings
  immunizations: Immunization[]
  birthDate?: string | null
  onAdd: () => void
  onEditVisit: (visit: VaccineStrategySettings['visits'][number]) => void
  onDeleteVisit: (id: string) => void
  onEditSettings?: () => void
  onSaveStrategy?: (data: {
    insurance_rules?: VaccineStrategySettings['insuranceRules']
  }) => Promise<void>
}

const PLAFON_CARD_STYLE = PAYMENT_METHOD_CARD_STYLE

function cardYearLabel(periodLabel: string): string {
  if (/^\d{4}$/.test(periodLabel)) return periodLabel
  return String(new Date().getFullYear())
}

function cardBalance(
  p: ReturnType<typeof computePlafonSummaries>[number]
): { primary: { label?: string; amount: string }; secondary?: { label: string; amount: string } } {
  const expenses = formatIdr(p.usedIdr + p.plannedIdr)

  if (p.method === 'FULLERTON') {
    return {
      primary: { amount: expenses },
      secondary: { label: 'Sisa saldo', amount: formatIdr(p.remainingIdr ?? 0) },
    }
  }
  if (p.method === 'INHEALTH') {
    return {
      primary: { amount: expenses },
      secondary: { label: 'Sisa saldo', amount: '—' },
    }
  }
  return { primary: { amount: expenses } }
}

function visitCostLabel(visit: VaccineStrategySettings['visits'][number]): string {
  return formatIdr(getVisitDisplayTotal(visit))
}

type VisitPlanCardProps = {
  visit: VaccineStrategySettings['visits'][number]
  immunizations: Immunization[]
  birthDate?: string | null
  onEdit: () => void
  onDelete: () => void
}

function VisitPlanCard({
  visit,
  immunizations,
  birthDate,
  onEdit,
  onDelete,
}: VisitPlanCardProps) {
  const rangeWarning = getVisitPlanRangeWarning(visit, immunizations, birthDate)
  const visitDone = isVisitFullyCompleted(visit, immunizations)
  const vaccineDetail = visitVaccineDetail(visit)
  const place = visit.location?.trim()
  const doctor = visit.doctorName?.trim()
  const theme = visitDone ? VISIT_DONE_THEME : VISIT_CARD_THEME[visit.paymentMethod]

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onEdit}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onEdit()
        }
      }}
      className={`relative flex cursor-pointer items-center gap-2 overflow-hidden rounded-xl border px-3 py-2.5 active:opacity-95 ${theme.card} ${
        rangeWarning && !visitDone ? 'ring-1 ring-amber-400/50' : ''
      }`}
    >
      <div className={`absolute inset-y-0 left-0 w-1 ${theme.stripe}`} aria-hidden />

      <div className="min-w-0 flex-1 pl-1">
        <div className="flex items-start gap-1.5">
          <p className="min-w-0 flex-1 line-clamp-2 text-sm font-semibold leading-snug text-foreground">
            {visitDisplayLabel(visit)}
          </p>
          {visitDone ? (
            <span
              className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white"
              aria-label="Selesai"
            >
              <Check className="h-2.5 w-2.5" strokeWidth={3} />
            </span>
          ) : null}
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-1">
          <PaymentMethodBadge method={visit.paymentMethod} />
          <span
            className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums whitespace-nowrap ${theme.cost}`}
          >
            {visitCostLabel(visit)}
          </span>
          <span
            className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium tabular-nums ${theme.chip}`}
          >
            {formatVisitDate(visit)}
          </span>
        </div>

        {vaccineDetail ? (
          <p className="mt-1 text-[10px] text-muted-foreground">{vaccineDetail}</p>
        ) : null}

        {(place || doctor) && (
          <div className="mt-1 flex min-w-0 items-center gap-2 text-[10px] text-muted-foreground">
            {place ? (
              <span className="inline-flex min-w-0 max-w-[55%] items-center gap-1">
                <MapPin className="h-3 w-3 shrink-0 text-rose-500 dark:text-rose-400" aria-hidden />
                <span className="truncate">{place}</span>
              </span>
            ) : null}
            {doctor ? (
              <span className="inline-flex min-w-0 flex-1 items-center gap-1">
                <Stethoscope className="h-3 w-3 shrink-0 text-sky-600 dark:text-sky-400" aria-hidden />
                <span className="truncate">{doctor}</span>
              </span>
            ) : null}
          </div>
        )}

        {rangeWarning && !visitDone ? (
          <p className="mt-1 text-[10px] font-medium text-amber-700 dark:text-amber-400">
            ⚠ {rangeWarning.shortMessage}
          </p>
        ) : null}
      </div>

      <div className="flex shrink-0 gap-0.5">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onEdit()
          }}
          className="rounded-lg p-2 text-muted-foreground active:bg-black/10 dark:active:bg-white/10"
          aria-label="Edit"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
          className="rounded-lg p-2 text-muted-foreground active:bg-black/10 dark:active:bg-white/10"
          aria-label="Hapus"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}

export function VaccineStrategyPanel({
  strategy,
  immunizations,
  birthDate,
  onAdd,
  onEditVisit,
  onDeleteVisit,
  onEditSettings,
  onSaveStrategy,
}: VaccineStrategyPanelProps) {
  const [plafonDetail, setPlafonDetail] = useState<VaccinePaymentMethod | null>(null)

  const plafon = useMemo(
    () => computePlafonSummaries(immunizations, strategy),
    [immunizations, strategy]
  )
  const sortedVisits = useMemo(
    () => sortVisitsByDateAsc(strategy.visits),
    [strategy.visits]
  )

  return (
    <div className="space-y-3">
      <div className="-mx-4 flex snap-x snap-mandatory gap-2 overflow-x-auto px-4 pb-1 [-webkit-overflow-scrolling:touch]">
        {plafon.map((p) => {
          const balance = cardBalance(p)
          const clickable = p.method === 'FULLERTON' && onSaveStrategy

          return (
            <div
              key={p.method}
              role={clickable ? 'button' : undefined}
              tabIndex={clickable ? 0 : undefined}
              onClick={clickable ? () => setPlafonDetail(p.method) : undefined}
              onKeyDown={
                clickable
                  ? (e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        setPlafonDetail(p.method)
                      }
                    }
                  : undefined
              }
              className={`relative w-[calc(50%-0.25rem)] shrink-0 snap-start overflow-hidden rounded-xl border p-3 ${PLAFON_CARD_STYLE[p.method]} ${
                clickable ? 'cursor-pointer active:bg-secondary/30' : ''
              }`}
            >
              <div className="flex min-h-[15px] items-center justify-between gap-2">
                <PaymentMethodLogo method={p.method} size="md" />
                <span className="shrink-0 text-[9px] font-medium tabular-nums text-muted-foreground">
                  {cardYearLabel(p.periodLabel)}
                </span>
              </div>
              {balance.primary.label ? (
                <p className="mt-2 text-[9px] text-muted-foreground">{balance.primary.label}</p>
              ) : null}
              <p
                className={`text-[11px] font-bold leading-tight tabular-nums text-foreground ${
                  balance.primary.label ? '' : 'mt-2'
                }`}
              >
                {balance.primary.amount}
              </p>
              {balance.secondary ? (
                <>
                  <p className="mt-1.5 text-[9px] text-muted-foreground">{balance.secondary.label}</p>
                  <p className="text-[11px] font-bold leading-tight tabular-nums text-foreground">
                    {balance.secondary.amount}
                  </p>
                </>
              ) : null}
            </div>
          )
        })}
      </div>

      <div className="space-y-1.5">
        {sortedVisits.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border py-6 text-center text-xs text-muted-foreground">
            Belum ada plan
          </p>
        ) : (
          sortedVisits.map((visit) => (
            <VisitPlanCard
              key={visit.id}
              visit={visit}
              immunizations={immunizations}
              birthDate={birthDate}
              onEdit={() => onEditVisit(visit)}
              onDelete={() => onDeleteVisit(visit.id)}
            />
          ))
        )}
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onAdd}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground"
        >
          <Plus className="h-4 w-4" />
          Tambah Plan
        </button>
        {onEditSettings && (
          <button
            type="button"
            onClick={onEditSettings}
            className="flex items-center gap-1 rounded-xl border border-border px-3 py-3 text-xs font-medium text-muted-foreground"
          >
            <Settings className="h-4 w-4" />
          </button>
        )}
      </div>

      {onSaveStrategy && (
        <PlafonDetailSheet
          open={plafonDetail === 'FULLERTON'}
          method={plafonDetail}
          strategy={strategy}
          immunizations={immunizations}
          onClose={() => setPlafonDetail(null)}
          onSave={onSaveStrategy}
        />
      )}
    </div>
  )
}
