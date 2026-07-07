'use client'

import type { GrowthLog } from '@/lib/api-client'

interface GrowthChartProps {
  data: GrowthLog[]
}

export function GrowthChart({ data }: GrowthChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
        Belum ada data pertumbuhan
      </div>
    )
  }

  const maxWeight = Math.max(...data.map((d) => d.weight_kg))
  const minWeight = Math.min(...data.map((d) => d.weight_kg))
  const range = maxWeight - minWeight || 1

  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
        <span>Berat (kg)</span>
        <span>
          {minWeight.toFixed(1)} – {maxWeight.toFixed(1)} kg
        </span>
      </div>
      <div className="flex h-48 items-end justify-center gap-2">
        {data.map((entry, i) => {
          const height =
            ((entry.weight_kg - minWeight) / range) * 100 + 20
          const label = new Date(entry.date).toLocaleDateString('id-ID', {
            month: 'short',
            day: 'numeric',
          })

          return (
            <div key={entry.id} className="flex flex-col items-center gap-2">
              <span className="text-[10px] font-medium text-foreground">
                {entry.weight_kg.toFixed(1)}
              </span>
              <div
                className="w-8 rounded-t-lg bg-gradient-to-t from-primary to-accent transition-all"
                style={{
                  height: `${height}%`,
                  opacity: 0.6 + (i / data.length) * 0.4,
                }}
              />
              <span className="text-[10px] text-muted-foreground">{label}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
