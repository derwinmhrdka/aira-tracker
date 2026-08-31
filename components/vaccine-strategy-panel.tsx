'use client'

import { useMemo } from 'react'
import { Plus, Settings, Trash2 } from 'lucide-react'
import type { Immunization, VaccinePaymentMethod, VaccineStrategySettings } from '@/lib/api-client'
import {
  computePlafonSummaries,
  formatIdr,
  formatVisitDate,
  getVisitPlanRangeWarning,
  PAYMENT_METHOD_LABEL,
  PAYMENT_METHOD_STYLE,
  visitDisplayLabel,
} from '@/lib/vaccine-strategy'

type VaccineStrategyPanelProps = {
  strategy: VaccineStrategySettings
  immunizations: Immunization[]
  birthDate?: string | null
  onAdd: () => void
  onDeleteVisit: (id: string) => void
  onEditSettings?: () => void
}

const PLAFON_CARD_STYLE: Record<VaccinePaymentMethod, string> = {
  INHEALTH: 'border-sky-200/60 bg-sky-50/50 dark:border-sky-900/40 dark:bg-sky-950/20',
  FULLERTON: 'border-violet-200/60 bg-violet-50/50 dark:border-violet-900/40 dark:bg-violet-950/20',
  PUSKESMAS:
    'border-emerald-200/60 bg-emerald-50/50 dark:border-emerald-900/40 dark:bg-emerald-950/20',
  CASH: 'border-border bg-card',
}

function plafonAmount(p: ReturnType<typeof computePlafonSummaries>[number]): string {
  if (p.method === 'FULLERTON') return formatIdr(p.remainingIdr ?? 0)
  if (p.method === 'CASH') return formatIdr(p.usedIdr + p.plannedIdr)
  return formatIdr(0)
}

export function VaccineStrategyPanel({
  strategy,
  immunizations,
  birthDate,
  onAdd,
  onDeleteVisit,
  onEditSettings,
}: VaccineStrategyPanelProps) {
  const plafon = useMemo(
    () => computePlafonSummaries(immunizations, strategy),
    [immunizations, strategy]
  )

  return (
    <div className="space-y-3">
      <div className="-mx-4 flex snap-x snap-mandatory gap-2 overflow-x-auto px-4 pb-1 [-webkit-overflow-scrolling:touch]">
        {plafon.map((p) => (
          <div
            key={p.method}
            className={`w-[calc(50%-0.25rem)] shrink-0 snap-start rounded-xl border p-3 ${PLAFON_CARD_STYLE[p.method]}`}
          >
            <p className="text-[10px] font-semibold text-muted-foreground">{p.label}</p>
            <p className="mt-1 text-[11px] font-bold leading-tight tabular-nums text-foreground">
              {plafonAmount(p)}
            </p>
            {p.limitIdr != null && (
              <p className="mt-0.5 text-[9px] leading-tight tabular-nums text-muted-foreground">
                / {formatIdr(p.limitIdr)}
              </p>
            )}
            {p.method === 'FULLERTON' && p.plannedIdr > 0 && (
              <p className="mt-0.5 text-[9px] tabular-nums text-muted-foreground">
                rencana {formatIdr(p.plannedIdr)}
              </p>
            )}
          </div>
        ))}
      </div>

      <div className="space-y-1.5">
        {strategy.visits.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border py-6 text-center text-xs text-muted-foreground">
            Belum ada rencana
          </p>
        ) : (
          strategy.visits.map((visit) => {
            const rangeWarning = getVisitPlanRangeWarning(visit, immunizations, birthDate)
            return (
              <div
                key={visit.id}
                className={`flex items-center gap-2 rounded-xl border bg-card px-3 py-2.5 ${
                  rangeWarning ? 'border-amber-400/70' : 'border-border'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {visitDisplayLabel(visit)}
                    </p>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${PAYMENT_METHOD_STYLE[visit.paymentMethod]}`}
                    >
                      {PAYMENT_METHOD_LABEL[visit.paymentMethod]}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[10px] tabular-nums text-muted-foreground">
                    {formatVisitDate(visit)}
                    {' · '}
                    <span className="text-[9px]">
                      {formatIdr(visit.estimatedCostIdr > 0 ? visit.estimatedCostIdr : 0)}
                    </span>
                  </p>
                  {rangeWarning && (
                    <p className="mt-0.5 text-[10px] text-amber-700 dark:text-amber-400">
                      ⚠ {rangeWarning.shortMessage}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => onDeleteVisit(visit.id)}
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
          Tambah rencana
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
    </div>
  )
}
