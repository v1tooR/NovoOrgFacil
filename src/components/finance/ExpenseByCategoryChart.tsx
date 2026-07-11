'use client'

import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatCurrency } from '@/lib/utils'

interface ExpenseByCategoryChartProps {
  data: { category: string; amount: number }[]
}

function ChartTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const entry = payload[0]
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 shadow-md text-xs">
      <p className="font-medium text-popover-foreground">{entry.payload.category}</p>
      <p className="text-muted-foreground">{formatCurrency(entry.value)}</p>
    </div>
  )
}

export function ExpenseByCategoryChart({ data }: ExpenseByCategoryChartProps) {
  const height = Math.max(data.length * 32, 96)

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 12, bottom: 0, left: 0 }}>
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="category"
            width={92}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: 'hsl(var(--muted))' }} />
          <Bar dataKey="amount" radius={[0, 6, 6, 0]} maxBarSize={16}>
            {data.map((_, i) => (
              <Cell key={i} fill="hsl(var(--destructive))" fillOpacity={1 - i * 0.12} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
