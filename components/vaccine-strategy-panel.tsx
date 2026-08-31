'use client'

import { useMemo } from 'react'
import type { Immunization, VaccineStrategySettings } from '@/lib/api-client'
import {
  computePlafonSummaries,
  formatIdr,
  formatPriceRange,
  formatVisitDateRange,
  PAYMENT_METHOD_LABEL,
  PAYMENT_METHOD_STYLE,
  VACCINE_CATALOG,
} from '@/lib/vaccine-strategy'

type VaccineStrategyPanelProps = {
  strategy: VaccineStrategySettings
  immunizations: Immunization[]
  onEditSettings?: () => void
}

export function VaccineStrategyPanel({
  strategy,
  immunizations,
  onEditSettings,
}: VaccineStrategyPanelProps) {
  const plafon = useMemo(
    () => computePlafonSummaries(immunizations, strategy),
    [immunizations, strategy]
  )

  const fullerton = plafon.find((p) => p.method === 'FULLERTON')
  const inhealth = plafon.find((p) => p.method === 'INHEALTH')

  return (
    <div className="space-y-4">
      {(strategy.clinicName || strategy.doctorName) && (
        <div className="rounded-xl border border-border bg-card px-3 py-2.5 text-xs text-muted-foreground">
          {strategy.clinicName && (
            <p className="font-medium text-foreground">{strategy.clinicName}</p>
          )}
          {strategy.doctorName && <p>{strategy.doctorName}</p>}
          {strategy.rotavirusType && <p className="mt-0.5">{strategy.rotavirusType}</p>}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        {inhealth && (
          <div className="rounded-xl border border-sky-200/60 bg-sky-50/50 p-3 dark:border-sky-900/40 dark:bg-sky-950/20">
            <p className="text-[10px] font-semibold uppercase text-sky-700 dark:text-sky-400">
              Inhealth
            </p>
            <p className="mt-1 font-heading text-lg font-bold text-foreground">Rp0</p>
            <p className="text-[10px] text-muted-foreground">DPT + DSA 100%</p>
          </div>
        )}
        {fullerton && fullerton.limitIdr != null && (
          <div className="rounded-xl border border-violet-200/60 bg-violet-50/50 p-3 dark:border-violet-900/40 dark:bg-violet-950/20">
            <p className="text-[10px] font-semibold uppercase text-violet-700 dark:text-violet-400">
              Fullerton
            </p>
            <p className="mt-1 font-heading text-lg font-bold tabular-nums text-foreground">
              {formatIdr(fullerton.remainingIdr ?? 0)}
            </p>
            <p className="text-[10px] tabular-nums text-muted-foreground">
              sisa / {formatIdr(fullerton.limitIdr)}
            </p>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card p-3">
        <p className="mb-2 text-xs font-semibold text-foreground">Harga referensi</p>
        <div className="space-y-1.5">
          {VACCINE_CATALOG.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-2 text-[11px]"
            >
              <span className="min-w-0 truncate text-foreground">
                {item.brand ? `${item.name} (${item.brand})` : item.name}
              </span>
              <span className="shrink-0 tabular-nums text-muted-foreground">
                {formatPriceRange(item)}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold text-foreground">Rencana kunjungan</p>
        {strategy.visits.map((visit) => (
          <div
            key={visit.id}
            className="rounded-xl border border-border bg-card p-3 shadow-sm"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-heading text-sm font-semibold text-foreground">
                  {visit.title}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {formatVisitDateRange(visit)}
                  {visit.ageLabel ? ` · ${visit.ageLabel}` : ''}
                </p>
              </div>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${PAYMENT_METHOD_STYLE[visit.paymentMethod]}`}
              >
                {PAYMENT_METHOD_LABEL[visit.paymentMethod]}
              </span>
            </div>
            <p className="mt-1.5 text-xs text-foreground">{visit.actions}</p>
            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
              {visit.estimatedCostIdr != null && (
                <span className="tabular-nums">
                  Est. {formatIdr(visit.estimatedCostIdr)}
                </span>
              )}
              {visit.notes && <span>{visit.notes}</span>}
            </div>
          </div>
        ))}
      </div>

      {onEditSettings && (
        <button
          type="button"
          onClick={onEditSettings}
          className="w-full rounded-xl border border-dashed border-border py-2.5 text-xs font-semibold text-foreground"
        >
          Atur plafon & klinik
        </button>
      )}
    </div>
  )
}
