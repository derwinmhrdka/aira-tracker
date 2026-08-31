'use client'

import { useMemo } from 'react'
import { Plus, Settings, Trash2 } from 'lucide-react'
import type { Immunization, VaccineStrategySettings } from '@/lib/api-client'
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

const PAYMENT_SHORT: Record<string, string> = {
  INHEALTH: 'IH',
  FULLERTON: 'FT',
  PUSKESMAS: 'PKM',
  CASH: '₿',
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

  const fullerton = plafon.find((p) => p.method === 'FULLERTON')
  const cash = plafon.find((p) => p.method === 'CASH')

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-4 gap-1.5">
        <div className="rounded-lg border border-sky-200/60 bg-sky-50/50 px-2 py-2 text-center dark:border-sky-900/40 dark:bg-sky-950/20">
          <p className="text-[9px] font-bold text-sky-700 dark:text-sky-400">IH</p>
          <p className="text-sm font-bold tabular-nums">0</p>
        </div>
        {fullerton && (
          <div className="rounded-lg border border-violet-200/60 bg-violet-50/50 px-2 py-2 text-center dark:border-violet-900/40 dark:bg-violet-950/20">
            <p className="text-[9px] font-bold text-violet-700 dark:text-violet-400">FT</p>
            <p className="text-sm font-bold tabular-nums">
              {((fullerton.remainingIdr ?? 0) / 1_000_000).toFixed(1)}jt
            </p>
          </div>
        )}
        <div className="rounded-lg border border-emerald-200/60 bg-emerald-50/50 px-2 py-2 text-center dark:border-emerald-900/40 dark:bg-emerald-950/20">
          <p className="text-[9px] font-bold text-emerald-700 dark:text-emerald-400">PKM</p>
          <p className="text-sm font-bold tabular-nums">0</p>
        </div>
        {cash && (
          <div className="rounded-lg border border-border bg-card px-2 py-2 text-center">
            <p className="text-[9px] font-bold text-muted-foreground">₿</p>
            <p className="text-sm font-bold tabular-nums">
              {((cash.usedIdr + cash.plannedIdr) / 1_000_000).toFixed(1)}jt
            </p>
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        {strategy.visits.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border py-8 text-center text-2xl text-muted-foreground/40">
            —
          </div>
        ) : (
          strategy.visits.map((visit) => {
            const rangeWarning = getVisitPlanRangeWarning(visit, immunizations, birthDate)
            return (
              <div
                key={visit.id}
                className={`flex items-center gap-2 rounded-xl border bg-card px-3 py-2 ${
                  rangeWarning ? 'border-amber-400/70' : 'border-border'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {visitDisplayLabel(visit)}
                    </p>
                    <span
                      className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold ${PAYMENT_METHOD_STYLE[visit.paymentMethod]}`}
                      title={PAYMENT_METHOD_LABEL[visit.paymentMethod]}
                    >
                      {PAYMENT_SHORT[visit.paymentMethod]}
                    </span>
                  </div>
                  <p className="text-[10px] tabular-nums text-muted-foreground">
                    {formatVisitDate(visit)}
                    <span className="mx-1">·</span>
                    {visit.estimatedCostIdr > 0
                      ? formatIdr(visit.estimatedCostIdr)
                      : '0'}
                    {rangeWarning && (
                      <span className="ml-1 text-amber-600 dark:text-amber-400">
                        ⚠ {rangeWarning.shortMessage}
                      </span>
                    )}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onDeleteVisit(visit.id)}
                  className="shrink-0 rounded-lg p-1.5 text-muted-foreground hover:bg-secondary"
                  aria-label="Hapus"
                >
                  <Trash2 className="h-3.5 w-3.5" />
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
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary py-3 text-primary-foreground"
          aria-label="Tambah"
        >
          <Plus className="h-5 w-5" />
        </button>
        {onEditSettings && (
          <button
            type="button"
            onClick={onEditSettings}
            className="rounded-xl border border-border px-4 py-3 text-muted-foreground"
            aria-label="Pengaturan"
          >
            <Settings className="h-5 w-5" />
          </button>
        )}
      </div>
    </div>
  )
}
