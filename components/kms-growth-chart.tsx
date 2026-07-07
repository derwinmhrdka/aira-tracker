'use client'

import type { ReactNode } from 'react'
import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { buildChartData, type GrowthMetric, type Gender } from '@/lib/who-growth'
import type { GrowthLog } from '@/lib/api-client'

interface KmsGrowthChartProps {
  growthLogs: GrowthLog[]
  birthDate: string
  gender?: Gender
  metric?: GrowthMetric
}

function ChartLegendItem({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      {children}
      <span>{label}</span>
    </span>
  )
}

export function KmsGrowthChart({
  growthLogs,
  birthDate,
  gender = 'MALE',
  metric = 'weight',
}: KmsGrowthChartProps) {
  const data = buildChartData(
    growthLogs.map((g) => ({
      date: g.date,
      value: metric === 'weight' ? g.weight_kg : g.height_cm,
    })),
    birthDate,
    metric,
    gender
  )

  const unit = metric === 'weight' ? 'kg' : 'cm'
  const label = metric === 'weight' ? 'berat badan' : 'panjang badan'

  const renderTooltip = (props: {
    active?: boolean
    payload?: { dataKey?: string; value?: number }[]
    label?: string | number
  }) => {
    const { active, payload, label: month } = props
    if (!active || !payload?.length) return null
    const baby = payload.find((p) => p.dataKey === 'baby')
    if (baby?.value == null) return null
    return (
      <div className="rounded-xl border border-border bg-card px-3 py-2 text-xs shadow-md">
        <p className="font-semibold text-foreground">Bulan {month}</p>
        <p className="mt-0.5 text-muted-foreground">
          Data bayi: <span className="font-medium text-foreground">{baby.value} {unit}</span>
        </p>
      </div>
    )
  }

  if (growthLogs.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        Belum ada data — tambah {label} untuk melihat grafik KMS
      </div>
    )
  }

  return (
    <div>
      <div className="relative h-[240px] w-full">
        <span className="absolute left-0 top-0 z-10 text-[10px] font-medium text-muted-foreground">
          {unit}
        </span>
        <span className="absolute bottom-0 right-0 z-10 text-[10px] text-muted-foreground">
          Bulan
        </span>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={data}
            margin={{ top: 16, right: 8, left: 0, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.4} />
            <XAxis
              dataKey="month"
              type="category"
              tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
              tickMargin={6}
              axisLine={{ stroke: 'var(--border)' }}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              width={32}
              tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
              axisLine={false}
              tickLine={false}
              domain={['auto', 'auto']}
            />
            <Tooltip content={renderTooltip} />

            <Area
              type="monotone"
              dataKey="minus3"
              stackId="red-low"
              stroke="none"
              fill="#fca5a5"
              fillOpacity={0.25}
              legendType="none"
              tooltipType="none"
            />
            <Area
              type="monotone"
              dataKey="minus2"
              stackId="red-low"
              stroke="none"
              fill="#fef08a"
              fillOpacity={0.3}
              legendType="none"
              tooltipType="none"
            />
            <Area
              type="monotone"
              dataKey="median"
              stroke="#86efac"
              strokeWidth={1.5}
              fill="#86efac"
              fillOpacity={0.35}
              legendType="none"
              tooltipType="none"
            />
            <Area
              type="monotone"
              dataKey="plus2"
              stroke="none"
              fill="#86efac"
              fillOpacity={0.2}
              legendType="none"
              tooltipType="none"
            />
            <Area
              type="monotone"
              dataKey="plus3"
              stroke="none"
              fill="#fca5a5"
              fillOpacity={0.2}
              legendType="none"
              tooltipType="none"
            />
            <Line
              type="monotone"
              dataKey="baby"
              stroke="#3b82f6"
              strokeWidth={2.5}
              dot={{ fill: '#3b82f6', r: 4, strokeWidth: 2, stroke: '#fff' }}
              activeDot={{ r: 6 }}
              connectNulls
              name="Bayi"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-3 space-y-2 rounded-xl bg-secondary/40 px-3 py-2.5">
        <div className="flex flex-wrap justify-center gap-x-5 gap-y-1 text-[10px] text-muted-foreground">
          <ChartLegendItem label="Data bayi">
            <span className="inline-block h-0.5 w-4 rounded bg-blue-500" />
          </ChartLegendItem>
          <ChartLegendItem label="Median WHO">
            <span className="inline-block h-0.5 w-4 rounded bg-green-400" />
          </ChartLegendItem>
        </div>
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-[10px] text-muted-foreground">
          <ChartLegendItem label="Normal">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-green-300/70" />
          </ChartLegendItem>
          <ChartLegendItem label="Waspada">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-yellow-300/70" />
          </ChartLegendItem>
          <ChartLegendItem label="Bahaya">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-red-300/70" />
          </ChartLegendItem>
        </div>
      </div>
    </div>
  )
}
