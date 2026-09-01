'use client'

import { useMemo, useState } from 'react'
import { Plus, Pencil, Settings, Trash2 } from 'lucide-react'
import type { Immunization, VaccinePaymentMethod, VaccineStrategySettings } from '@/lib/api-client'
import { PaymentMethodBadge, PaymentMethodLogo } from './payment-method-logo'
import { PlafonDetailSheet } from './plafon-detail-sheet'
import {
  computePlafonSummaries,
  formatIdr,
  formatVisitDate,
  getVisitDisplayTotal,
  getVisitPlanRangeWarning,
  PAYMENT_METHOD_CARD_STYLE,
  sortVisitsByDateAsc,
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
  if (p.method === 'FULLERTON') {
    return { primary: { label: 'Sisa saldo', amount: formatIdr(p.remainingIdr ?? 0) } }
  }
  if (p.method === 'INHEALTH') {
    return {
      primary: { amount: formatIdr(p.usedIdr + p.plannedIdr) },
      secondary: { label: 'Sisa saldo', amount: '—' },
    }
  }
  return { primary: { amount: formatIdr(p.usedIdr + p.plannedIdr) } }
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
                clickable ? 'cursor-pointer transition-colors hover:bg-secondary/20' : ''
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
          sortedVisits.map((visit) => {
            const rangeWarning = getVisitPlanRangeWarning(visit, immunizations, birthDate)
            const vaccineDetail = visitVaccineDetail(visit)
            return (
              <div
                key={visit.id}
                role="button"
                tabIndex={0}
                onClick={() => onEditVisit(visit)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onEditVisit(visit)
                  }
                }}
                className={`flex cursor-pointer items-center gap-2 rounded-xl border bg-card px-3 py-2.5 transition-colors hover:bg-secondary/30 ${
                  rangeWarning ? 'border-amber-400/70' : 'border-border'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {visitDisplayLabel(visit)}
                    </p>
                    <PaymentMethodBadge method={visit.paymentMethod} />
                  </div>
                  <p className="mt-0.5 text-[10px] tabular-nums text-muted-foreground">
                    {formatVisitDate(visit)}
                    {' · '}
                    <span className="text-[9px]">{formatIdr(getVisitDisplayTotal(visit))}</span>
                  </p>
                  {vaccineDetail && (
                    <p className="mt-0.5 text-[10px] text-muted-foreground">{vaccineDetail}</p>
                  )}
                  {rangeWarning && (
                    <p className="mt-0.5 text-[10px] text-amber-700 dark:text-amber-400">
                      ⚠ {rangeWarning.shortMessage}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    onEditVisit(visit)
                  }}
                  className="shrink-0 rounded-lg p-1.5 text-muted-foreground hover:bg-secondary"
                  aria-label="Edit"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    onDeleteVisit(visit.id)
                  }}
                  className="shrink-0 rounded-lg p-1.5 text-muted-foreground hover:bg-secondary"
                  aria-label="Hapus"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            )
          })
        )}
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onAdd}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground"
        >
          <Plus className="h-4 w-4" />
          Add Plan
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
