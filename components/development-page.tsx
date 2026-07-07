'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { PageHeader } from './page-header'
import { api, type DevelopmentItem } from '@/lib/api-client'

interface DevelopmentPageProps {
  onBack: () => void
}

const AGE_LABELS: Record<number, string> = {
  0: '0-3 bulan',
  3: '3-6 bulan',
  6: '6-9 bulan',
  9: '9-12 bulan',
}

export function DevelopmentPage({ onBack }: DevelopmentPageProps) {
  const [items, setItems] = useState<DevelopmentItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getDevelopmentChecklist().then(setItems).finally(() => setLoading(false))
  }, [])

  const toggle = async (item: DevelopmentItem) => {
    const newChecked = !item.is_checked
    setItems((prev) =>
      prev.map((i) =>
        i.id === item.id ? { ...i, is_checked: newChecked } : i
      )
    )
    try {
      const updated = await api.updateDevelopmentChecklist(item.id, newChecked)
      setItems((prev) =>
        prev.map((i) =>
          i.id === item.id
            ? { ...i, is_checked: updated.is_checked, date_checked: updated.date_checked }
            : i
        )
      )
    } catch {
      setItems((prev) =>
        prev.map((i) =>
          i.id === item.id ? { ...i, is_checked: !newChecked } : i
        )
      )
    }
  }

  const grouped = items.reduce<Record<number, DevelopmentItem[]>>((acc, item) => {
    const group = item.age_group_months
    if (!acc[group]) acc[group] = []
    acc[group].push(item)
    return acc
  }, {})

  return (
    <div className="px-4 pt-6 pb-8">
      <PageHeader title="Perkembangan" subtitle="Checklist skill per usia" onBack={onBack} />

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded-xl bg-secondary" />
          ))}
        </div>
      ) : (
        Object.entries(grouped)
          .sort(([a], [b]) => Number(a) - Number(b))
          .map(([age, questions]) => (
            <div key={age} className="mb-5">
              <h2 className="font-heading mb-2 text-sm font-semibold text-primary">
                {AGE_LABELS[Number(age)] ?? `${age} bulan`}
              </h2>
              <div className="space-y-2">
                {questions.map((item) => (
                  <motion.button
                    key={item.id}
                    type="button"
                    whileTap={{ scale: 0.98 }}
                    onClick={() => toggle(item)}
                    className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left shadow-sm transition-colors ${
                      item.is_checked
                        ? 'border-green-300/50 bg-green-50/30 dark:bg-green-950/20'
                        : 'border-border bg-card'
                    }`}
                  >
                    <span className="mt-0.5 text-lg">
                      {item.is_checked ? '✅' : '⬜'}
                    </span>
                    <div>
                      <p className="text-sm text-foreground">{item.question}</p>
                      {item.date_checked && (
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {new Date(item.date_checked).toLocaleDateString('id-ID')}
                        </p>
                      )}
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>
          ))
      )}
    </div>
  )
}
