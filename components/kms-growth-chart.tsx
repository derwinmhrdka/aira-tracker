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
import { buildChartData, ageInMonths, type GrowthMetric, type Gender } from '@/lib/who-growth'
import {
  getKmsZone,
  KMS_ZONE_DOT,
  KMS_ZONE_HINT,
  KMS_ZONE_LABEL,
  KMS_ZONE_STYLE,
  type KmsZone,
} from '@/lib/kms-status'
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

  const logByMonth = new Map<number, { date: string; value: number }>()
  for (const g of growthLogs) {
    const month = Math.round(ageInMonths(birthDate, g.date))
    logByMonth.set(month, {
      date: g.date,
      value: metric === 'weight' ? g.weight_kg : g.height_cm,
    })
  }

  const zoneForMonth = (month: number, value: number): KmsZone => {
    const log = logByMonth.get(month)
    if (!log) return 'unknown'
    return getKmsZone(value, birthDate, log.date, metric, gender)
  }

  const unit = metric === 'weight' ? 'kg' : 'cm'
  const label = metric === 'weight' ? 'berat badan' : 'panjang badan'

  const renderTooltip = (props: {
    active?: boolean
    payload?: { dataKey?: string; value?: number; payload?: { month?: number } }[]
    label?: string | number
  }) => {
    const { active, payload, label: month } = props
    if (!active || !payload?.length || month == null) return null
    const baby = payload.find((p) => p.dataKey === 'baby')
    if (baby?.value == null) return null

    const monthNum = Number(month)
    const log = logByMonth.get(monthNum)
    const zone = zoneForMonth(monthNum, baby.value)
    const hint = KMS_ZONE_HINT[zone]

    return (
      <div className="max-w-[200px] rounded-xl border border-border bg-card px-3 py-2 text-xs shadow-md">
        <p className="font-semibold text-foreground">Bulan {month}</p>
        {log && (
          <p className="mt-0.5 text-[10px] text-muted-foreground">
            {new Date(log.date).toLocaleDateString('id-ID', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </p>
        )}
        <p className="mt-1 text-muted-foreground">
          Data bayi:{' '}
          <span className="font-medium text-foreground">
            {baby.value} {unit}
          </span>
        </p>
        <p className="mt-1.5">
          <span
            className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${KMS_ZONE_STYLE[zone]}`}
          >
            KMS: {KMS_ZONE_LABEL[zone]}
          </span>
        </p>
        {hint && (
          <p className="mt-1.5 text-[10px] leading-snug text-muted-foreground">
            {hint}
          </p>
        )}
      </div>
    )
  }

  const renderBabyDot = (props: {
    cx?: number
    cy?: number
    payload?: { month?: number; baby?: number | null }
  }) => {
    const { cx, cy, payload } = props
    if (cx == null || cy == null || payload?.baby == null || payload.month == null) {
      return null
    }
    const zone = zoneForMonth(payload.month, payload.baby)
    const fill = KMS_ZONE_DOT[zone]
    return (
      <circle
        cx={cx}
        cy={cy}
        r={4}
        fill={fill}
        stroke="#fff"
        strokeWidth={2}
      />
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
              dataKey="zoneBahayaLow"
              stroke="none"
              fill="#fca5a5"
              fillOpacity={0.35}
              legendType="none"
              tooltipType="none"
            />
            <Area
              type="monotone"
              dataKey="zoneWaspadaLow"
              stroke="none"
              fill="#fef08a"
              fillOpacity={0.45}
              legendType="none"
              tooltipType="none"
            />
            <Area
              type="monotone"
              dataKey="zoneNormal"
              stroke="none"
              fill="#86efac"
              fillOpacity={0.4}
              legendType="none"
              tooltipType="none"
            />
            <Area
              type="monotone"
              dataKey="zoneWaspadaHigh"
              stroke="none"
              fill="#fef08a"
              fillOpacity={0.45}
              legendType="none"
              tooltipType="none"
            />
            <Area
              type="monotone"
              dataKey="zoneBahayaHigh"
              stroke="none"
              fill="#fca5a5"
              fillOpacity={0.35}
              legendType="none"
              tooltipType="none"
            />
            <Line
              type="monotone"
              dataKey="median"
              stroke="#22c55e"
              strokeWidth={1.5}
              dot={false}
              legendType="none"
              tooltipType="none"
            />
            <Line
              type="monotone"
              dataKey="baby"
              stroke="#3b82f6"
              strokeWidth={2.5}
              dot={renderBabyDot}
              activeDot={(props: {
                cx?: number
                cy?: number
                payload?: { month?: number; baby?: number | null }
              }) => {
                const { cx, cy, payload } = props
                if (
                  cx == null ||
                  cy == null ||
                  payload?.baby == null ||
                  payload.month == null
                ) {
                  return null
                }
                const zone = zoneForMonth(payload.month, payload.baby)
                return (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={6}
                    fill={KMS_ZONE_DOT[zone]}
                    stroke="#fff"
                    strokeWidth={2}
                  />
                )
              }}
              connectNulls
              name="Bayi"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-3 space-y-2 rounded-xl bg-secondary/40 px-3 py-2.5">
        <div className="flex flex-wrap justify-center gap-x-5 gap-y-1 text-[10px] text-muted-foreground">
          <ChartLegendItem label="Data bayi">
            <span className="inline-flex gap-0.5">
              <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
              <span className="inline-block h-2 w-2 rounded-full bg-yellow-500" />
              <span className="inline-block h-2 w-2 rounded-full bg-red-500" />
            </span>
          </ChartLegendItem>
          <ChartLegendItem label="Normal">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-green-300/70" />
          </ChartLegendItem>
          <ChartLegendItem label="Waspada">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-yellow-300/70" />
          </ChartLegendItem>
          <ChartLegendItem label="Bahaya">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-red-300/70" />
          </ChartLegendItem>
          <ChartLegendItem label="Median WHO">
            <span className="inline-block h-0.5 w-4 rounded bg-green-500" />
          </ChartLegendItem>
        </div>
        <p className="text-center text-[9px] text-muted-foreground">
          Ketuk titik data untuk lihat status KMS
        </p>
      </div>
    </div>
  )
}
