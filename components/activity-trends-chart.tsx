'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'

interface DailyTrend {
  date: string
  label: string
  pup: number
  pee: number
  feed: number
  sleepHours: number
}

interface ActivityTrendsChartProps {
  data: DailyTrend[]
}

export function ActivityTrendsChart({ data }: ActivityTrendsChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
        Belum ada data aktivitas
      </div>
    )
  }

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
          />
          <YAxis
            tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              fontSize: 12,
            }}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey="pup" name="Pup" fill="#fbbf24" radius={[2, 2, 0, 0]} />
          <Bar dataKey="pee" name="Pee" fill="#60a5fa" radius={[2, 2, 0, 0]} />
          <Bar dataKey="feed" name="Susu" fill="#fb923c" radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
