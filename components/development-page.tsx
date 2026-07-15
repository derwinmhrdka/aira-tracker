'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { PageHeader } from './page-header'
import { Celebration } from './celebration'
import { api, type DevelopmentItem } from '@/lib/api-client'
import { playSoundEffect } from '@/lib/sounds'

interface DevelopmentPageProps {
  onBack: () => void
}

const AGE_LABELS: Record<number, string> = {
  0: 'Baru lahir (0 bulan)',
  2: '2 bulan',
  4: '4 bulan',
  6: '6 bulan',
  9: '9 bulan',
  12: '12 bulan',
  15: '15 bulan',
  18: '18 bulan',
  24: '2 tahun',
  30: '2,5 tahun',
  36: '3 tahun',
  48: '4 tahun',
  60: '5 tahun',
}

const CATEGORY_LABEL: Record<string, string> = {
  physical: 'Fisik',
  cognitive: 'Kognitif',
  linguistic: 'Bahasa',
  social: 'Sosial',
}

const CATEGORY_ORDER = ['social', 'linguistic', 'cognitive', 'physical']

export function DevelopmentPage({ onBack }: DevelopmentPageProps) {
  const [items, setItems] = useState<DevelopmentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [celebrate, setCelebrate] = useState(false)
  const [celebrateName, setCelebrateName] = useState('')

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

      const unlocked = updated.newly_unlocked ?? []
      if (unlocked.length > 0) {
        playSoundEffect('success')
        setCelebrateName(unlocked.map((t) => t.name).join(', '))
        setCelebrate(true)
        setTimeout(() => setCelebrate(false), 2500)
      }
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

  const checkedCount = items.filter((i) => i.is_checked).length

  return (
    <div className="px-4 pt-6 pb-8">
      <PageHeader
        title="Perkembangan"
        subtitle="Checklist CDC · bukan diagnosis medis"
        onBack={onBack}
      />

      {!loading && items.length > 0 && (
        <p className="mb-4 text-xs text-muted-foreground">
          {checkedCount}/{items.length} tercapai
        </p>
      )}

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded-xl bg-secondary" />
          ))}
        </div>
      ) : (
        Object.entries(grouped)
          .sort(([a], [b]) => Number(a) - Number(b))
          .map(([age, questions]) => {
            const byCategory = CATEGORY_ORDER.map((cat) => ({
              cat,
              items: questions.filter((q) => q.category === cat),
            })).filter((g) => g.items.length > 0)

            return (
              <div key={age} className="mb-5">
                <h2 className="font-heading mb-2 text-sm font-semibold text-primary">
                  {AGE_LABELS[Number(age)] ?? `${age} bulan`}
                </h2>
                <div className="space-y-3">
                  {byCategory.map(({ cat, items: catItems }) => (
                    <div key={cat}>
                      <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                        {CATEGORY_LABEL[cat] ?? cat}
                      </p>
                      <div className="space-y-2">
                        {catItems.map((item) => (
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
                                  {new Date(item.date_checked).toLocaleDateString(
                                    'id-ID'
                                  )}
                                </p>
                              )}
                            </div>
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })
      )}

      {celebrate && (
        <Celebration message={`Badge baru: ${celebrateName} 🎊`} />
      )}
    </div>
  )
}
