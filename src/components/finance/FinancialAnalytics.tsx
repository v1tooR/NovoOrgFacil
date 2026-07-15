'use client'

import { useMemo } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { addMonths, endOfMonth, format, getDaysInMonth, startOfMonth, subMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ArrowDownRight, ArrowUpRight, Minus, TrendingDown, TrendingUp, Wallet } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn, formatCurrency } from '@/lib/utils'
import type { FinancialEntry } from '@/types'

interface FinancialAnalyticsProps {
  entries: FinancialEntry[]
  referenceDate: Date
}

const compactCurrency = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  notation: 'compact',
  maximumFractionDigits: 1,
})

function monthKey(date: Date) {
  return format(date, 'yyyy-MM')
}

function monthLabel(date: Date) {
  return format(date, 'MMM', { locale: ptBR }).replace('.', '')
}

function sumEntries(entries: FinancialEntry[], type: FinancialEntry['type']) {
  return entries
    .filter((entry) => entry.type === type)
    .reduce((total, entry) => total + Number(entry.amount), 0)
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null

  return (
    <div className="max-w-[220px] rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="mb-1 font-medium capitalize text-popover-foreground">{label}</p>
      <div className="space-y-0.5">
        {payload.map((item: any) => (
          <div key={item.dataKey} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
              {item.name}
            </span>
            <span className="font-medium tabular-nums">{formatCurrency(Number(item.value))}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex h-[220px] items-center justify-center rounded-lg border border-dashed px-6 text-center text-sm text-muted-foreground sm:h-[260px]">
      {message}
    </div>
  )
}

function VariationCard({
  label,
  current,
  previous,
  icon: Icon,
  inverse = false,
}: {
  label: string
  current: number
  previous: number
  icon: typeof Wallet
  inverse?: boolean
}) {
  const variation = previous === 0 ? null : ((current - previous) / Math.abs(previous)) * 100
  const direction = variation === null || Math.abs(variation) < 0.05 ? 0 : variation > 0 ? 1 : -1
  const isPositive = direction === 0 ? null : inverse ? direction < 0 : direction > 0
  const DirectionIcon = direction > 0 ? ArrowUpRight : direction < 0 ? ArrowDownRight : Minus

  return (
    <div className="min-w-0 rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <p className="mt-3 truncate text-xl font-bold tabular-nums sm:text-2xl">{formatCurrency(current)}</p>
      <div className="mt-2 flex items-center gap-1 text-xs">
        <DirectionIcon className={cn(
          'h-3.5 w-3.5',
          isPositive === true && 'text-success',
          isPositive === false && 'text-destructive',
          isPositive === null && 'text-muted-foreground'
        )} />
        <span className={cn(
          'font-medium',
          isPositive === true && 'text-success',
          isPositive === false && 'text-destructive',
          isPositive === null && 'text-muted-foreground'
        )}>
          {variation === null
            ? current === 0 ? 'Sem variação' : 'Sem base anterior'
            : `${Math.abs(variation).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`}
        </span>
        <span className="truncate text-muted-foreground">vs. mês anterior</span>
      </div>
    </div>
  )
}

export function FinancialAnalytics({ entries, referenceDate }: FinancialAnalyticsProps) {
  const analytics = useMemo(() => {
    const referenceKey = monthKey(referenceDate)
    const previousDate = subMonths(referenceDate, 1)
    const previousKey = monthKey(previousDate)
    const currentEntries = entries.filter((entry) => entry.due_date.startsWith(referenceKey))
    const previousEntries = entries.filter((entry) => entry.due_date.startsWith(previousKey))

    const historical = Array.from({ length: 6 }, (_, index) => subMonths(referenceDate, 5 - index)).map((date) => {
      const key = monthKey(date)
      const monthlyEntries = entries.filter((entry) => entry.due_date.startsWith(key))
      const income = sumEntries(monthlyEntries, 'income')
      const expenses = sumEntries(monthlyEntries, 'expense')
      return { month: monthLabel(date), Receitas: income, Despesas: expenses, Saldo: income - expenses }
    })

    const categoryMap = currentEntries
      .filter((entry) => entry.type === 'expense')
      .reduce((map, entry) => {
        map.set(entry.category, (map.get(entry.category) ?? 0) + Number(entry.amount))
        return map
      }, new Map<string, number>())
    const categories = Array.from(categoryMap.entries())
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 7)

    const entriesByDay = currentEntries.reduce((map, entry) => {
      const day = Number(entry.due_date.slice(8, 10))
      const signedAmount = entry.type === 'income' ? Number(entry.amount) : -Number(entry.amount)
      map.set(day, (map.get(day) ?? 0) + signedAmount)
      return map
    }, new Map<number, number>())
    let runningBalance = 0
    const dailyFlow = Array.from({ length: getDaysInMonth(referenceDate) }, (_, index) => {
      const day = index + 1
      runningBalance += entriesByDay.get(day) ?? 0
      return { day: String(day).padStart(2, '0'), Saldo: runningBalance }
    })

    const future = Array.from({ length: 6 }, (_, index) => addMonths(referenceDate, index)).map((date) => {
      const key = monthKey(date)
      const amount = entries
        .filter((entry) => entry.due_date.startsWith(key) && entry.type === 'expense' && entry.status !== 'paid')
        .reduce((total, entry) => total + Number(entry.amount), 0)
      return { month: monthLabel(date), Compromissos: amount }
    })

    const currentIncome = sumEntries(currentEntries, 'income')
    const currentExpenses = sumEntries(currentEntries, 'expense')
    const previousIncome = sumEntries(previousEntries, 'income')
    const previousExpenses = sumEntries(previousEntries, 'expense')

    return {
      historical,
      categories,
      dailyFlow,
      future,
      comparison: {
        income: [currentIncome, previousIncome] as const,
        expenses: [currentExpenses, previousExpenses] as const,
        balance: [currentIncome - currentExpenses, previousIncome - previousExpenses] as const,
      },
      currentLabel: format(startOfMonth(referenceDate), 'MMMM yyyy', { locale: ptBR }),
      rangeLabel: `${format(startOfMonth(subMonths(referenceDate, 5)), 'MMM yyyy', { locale: ptBR })} – ${format(endOfMonth(referenceDate), 'MMM yyyy', { locale: ptBR })}`,
    }
  }, [entries, referenceDate])

  const hasHistoricalData = analytics.historical.some((item) => item.Receitas > 0 || item.Despesas > 0)
  const hasDailyData = analytics.dailyFlow.some((item) => item.Saldo !== 0)
  const hasFutureData = analytics.future.some((item) => item.Compromissos > 0)

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <VariationCard label="Receitas" current={analytics.comparison.income[0]} previous={analytics.comparison.income[1]} icon={TrendingUp} />
        <VariationCard label="Despesas" current={analytics.comparison.expenses[0]} previous={analytics.comparison.expenses[1]} icon={TrendingDown} inverse />
        <VariationCard label="Saldo" current={analytics.comparison.balance[0]} previous={analytics.comparison.balance[1]} icon={Wallet} />
      </div>

      <Card className="min-w-0 overflow-hidden rounded-xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Receitas x despesas</CardTitle>
          <CardDescription className="capitalize">Últimos seis meses · {analytics.rangeLabel}</CardDescription>
        </CardHeader>
        <CardContent>
          {!hasHistoricalData ? <EmptyChart message="Ainda não há lançamentos suficientes para o histórico." /> : (
            <div className="h-[260px] min-w-0 sm:h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={analytics.historical} margin={{ top: 8, right: 4, left: -12, bottom: 0 }}>
                  <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis tickFormatter={(value) => compactCurrency.format(value)} tickLine={false} axisLine={false} width={64} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: 'hsl(var(--muted) / 0.5)' }} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 12 }} />
                  <Bar dataKey="Receitas" fill="hsl(var(--foreground))" radius={[4, 4, 0, 0]} maxBarSize={30} />
                  <Bar dataKey="Despesas" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} maxBarSize={30} />
                  <Line dataKey="Saldo" stroke="hsl(var(--success))" strokeWidth={2.5} dot={{ r: 3, fill: 'hsl(var(--success))' }} activeDot={{ r: 5 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid min-w-0 gap-5 xl:grid-cols-2">
        <Card className="min-w-0 overflow-hidden rounded-xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Despesas por categoria</CardTitle>
            <CardDescription className="capitalize">{analytics.currentLabel}</CardDescription>
          </CardHeader>
          <CardContent>
            {analytics.categories.length === 0 ? <EmptyChart message="Nenhuma despesa neste mês." /> : (
              <div className="h-[260px] min-w-0 sm:h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.categories} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="category" width={92} tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: 'hsl(var(--muted) / 0.5)' }} />
                    <Bar dataKey="amount" name="Despesas" radius={[0, 5, 5, 0]} maxBarSize={20}>
                      {analytics.categories.map((_, index) => (
                        <Cell key={index} fill="hsl(var(--foreground))" fillOpacity={Math.max(0.35, 1 - index * 0.1)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="min-w-0 overflow-hidden rounded-xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Fluxo líquido acumulado</CardTitle>
            <CardDescription className="capitalize">Evolução diária · {analytics.currentLabel}</CardDescription>
          </CardHeader>
          <CardContent>
            {!hasDailyData ? <EmptyChart message="Nenhum movimento para calcular o fluxo deste mês." /> : (
              <div className="h-[260px] min-w-0 sm:h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={analytics.dailyFlow} margin={{ top: 8, right: 4, left: -12, bottom: 0 }}>
                    <defs>
                      <linearGradient id="cashFlowGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--foreground))" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="hsl(var(--foreground))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="day" interval="preserveStartEnd" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis tickFormatter={(value) => compactCurrency.format(value)} tickLine={false} axisLine={false} width={64} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                    <Tooltip content={<ChartTooltip />} />
                    <Area type="monotone" dataKey="Saldo" stroke="hsl(var(--foreground))" strokeWidth={2.5} fill="url(#cashFlowGradient)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="min-w-0 overflow-hidden rounded-xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Compromissos futuros</CardTitle>
          <CardDescription>Despesas pendentes nos próximos seis meses, incluindo parcelas e recorrências</CardDescription>
        </CardHeader>
        <CardContent>
          {!hasFutureData ? <EmptyChart message="Nenhuma despesa pendente prevista para os próximos meses." /> : (
            <div className="h-[240px] min-w-0 sm:h-[290px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.future} margin={{ top: 8, right: 4, left: -12, bottom: 0 }}>
                  <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis tickFormatter={(value) => compactCurrency.format(value)} tickLine={false} axisLine={false} width={64} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: 'hsl(var(--muted) / 0.5)' }} />
                  <Bar dataKey="Compromissos" fill="hsl(var(--foreground))" radius={[6, 6, 0, 0]} maxBarSize={54} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
