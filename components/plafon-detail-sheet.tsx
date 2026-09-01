'use client'

import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import type { Immunization, VaccinePaymentMethod, VaccineStrategySettings } from '@/lib/api-client'
import {
  computePlafonSummaries,
  formatIdr,
  formatIdrInput,
  getPlafonExpenseItems,
  parseIdrInput,
  type PlafonSummary,
} from '@/lib/vaccine-strategy'
import { PaymentMethodLogo } from './payment-method-logo'

type PlafonDetailSheetProps = {
  open: boolean
  method: VaccinePaymentMethod | null
  strategy: VaccineStrategySettings
  immunizations: Immunization[]
  onClose: () => void
  onSave: (data: { insurance_rules: VaccineStrategySettings['insuranceRules'] }) => Promise<void>
}

export function PlafonDetailSheet({
  open,
  method,
  strategy,
  immunizations,
  onClose,
  onSave,
}: PlafonDetailSheetProps) {
  const [limitDisplay, setLimitDisplay] = useState('')
  const [saving, setSaving] = useState(false)

  const summary = useMemo(() => {
    if (!method) return null
    return computePlafonSummaries(immunizations, strategy).find((p) => p.method === method) ?? null
  }, [method, immunizations, strategy])

  const expenseItems = useMemo(() => {
    if (!method) return []
    return getPlafonExpenseItems(method, immunizations, strategy)
  }, [method, immunizations, strategy])

  useEffect(() => {
    if (!open || !summary?.limitIdr) return
    setLimitDisplay(formatIdrInput(summary.limitIdr))
  }, [open, summary?.limitIdr])

  if (typeof window === 'undefined' || !method || !summary) return null

  const expensesTotal = summary.usedIdr + summary.plannedIdr
  const remaining = summary.remainingIdr ?? 0

  const handleSaveLimit = async () => {
    const limit = parseIdrInput(limitDisplay)
    if (limit <= 0) return
    setSaving(true)
    try {
      const insurance_rules = strategy.insuranceRules.map((rule) =>
        rule.id === method ? { ...rule, annualLimitIdr: limit } : rule
      )
      await onSave({ insurance_rules })
    } finally {
      setSaving(false)
    }
  }

  return createPortal(
    <AnimatePresence>
      {open && (
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
            className="fixed inset-x-0 bottom-0 z-[71] max-h-[85vh] overflow-y-auto rounded-t-3xl border border-border bg-card p-4 shadow-2xl"
            style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-muted" />
            <PlafonSheetBody
              summary={summary}
              limitDisplay={limitDisplay}
              setLimitDisplay={setLimitDisplay}
              expenseItems={expenseItems}
              expensesTotal={expensesTotal}
              remaining={remaining}
              saving={saving}
              onSaveLimit={handleSaveLimit}
              onClose={onClose}
            />
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  )
}

function PlafonSheetBody({
  summary,
  limitDisplay,
  setLimitDisplay,
  expenseItems,
  expensesTotal,
  remaining,
  saving,
  onSaveLimit,
  onClose,
}: {
  summary: PlafonSummary
  limitDisplay: string
  setLimitDisplay: (v: string) => void
  expenseItems: { label: string; amountIdr: number }[]
  expensesTotal: number
  remaining: number
  saving: boolean
  onSaveLimit: () => void
  onClose: () => void
}) {
  const limitChanged =
    summary.limitIdr != null && parseIdrInput(limitDisplay) !== summary.limitIdr

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <PaymentMethodLogo method={summary.method} size="md" />
        <span className="text-[10px] font-medium tabular-nums text-muted-foreground">
          {summary.periodLabel}
        </span>
      </div>

      {summary.limitIdr != null ? (
        <div>
          <p className="mb-1 text-xs text-muted-foreground">Limit</p>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
              Rp
            </span>
            <input
              inputMode="numeric"
              value={limitDisplay}
              onChange={(e) => {
                const n = parseIdrInput(e.target.value)
                setLimitDisplay(n > 0 ? formatIdrInput(n) : '')
              }}
              className="w-full rounded-lg border border-input bg-background py-2.5 pl-9 pr-3 text-sm tabular-nums"
            />
          </div>
          {limitChanged && (
            <button
              type="button"
              disabled={saving}
              onClick={onSaveLimit}
              className="mt-2 w-full rounded-lg bg-primary py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50"
            >
              {saving ? '...' : 'Simpan limit'}
            </button>
          )}
        </div>
      ) : null}

      <div>
        <p className="mb-2 text-xs text-muted-foreground">Expenses</p>
        <p className="mb-2 text-sm font-bold tabular-nums text-foreground">
          {formatIdr(expensesTotal)}
        </p>
        {expenseItems.length > 0 ? (
          <ul className="space-y-1.5">
            {expenseItems.map((item, i) => (
              <li
                key={`${item.label}-${i}`}
                className="flex items-start justify-between gap-2 text-xs"
              >
                <span className="min-w-0 text-foreground">{item.label}</span>
                <span className="shrink-0 tabular-nums text-muted-foreground">
                  {formatIdr(item.amountIdr)}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {summary.limitIdr != null ? (
        <div>
          <p className="mb-1 text-xs text-muted-foreground">Sisa saldo</p>
          <p className="text-lg font-bold tabular-nums text-foreground">{formatIdr(remaining)}</p>
        </div>
      ) : null}

      <button
        type="button"
        onClick={onClose}
        className="w-full rounded-xl bg-secondary py-3 text-sm font-semibold text-foreground"
      >
        Tutup
      </button>
    </div>
  )
}
