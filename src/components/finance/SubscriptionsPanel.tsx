'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, ArrowUpDown, CalendarClock, Plus, Repeat, Scissors, Wallet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/shared/EmptyState'
import { SubscriptionCard } from '@/components/finance/SubscriptionCard'
import { SubscriptionDialog } from '@/components/finance/SubscriptionDialog'
import { getSubscriptions } from '@/actions/subscriptions'
import { useToast } from '@/components/ui/use-toast'
import { daysUntil, monthlyCost, sumMonthlyCost } from '@/lib/subscriptions'
import { cn, formatCurrency } from '@/lib/utils'
import type { Client, Project, Subscription, SubscriptionStatus } from '@/types'

interface SubscriptionsPanelProps {
  clients: Client[]
  projects: Project[]
  /** Total de despesas do mês exibido, para medir o peso do recorrente. */
  monthExpenses: number
  onChanged?: () => void | Promise<void>
}

type SortMode = 'date' | 'cost' | 'name'

const STATUS_FILTERS: { value: SubscriptionStatus; label: string }[] = [
  { value: 'active', label: 'Ativas' },
  { value: 'paused', label: 'Pausadas' },
  { value: 'canceled', label: 'Canceladas' },
]

export function SubscriptionsPanel({ clients, projects, monthExpenses, onChanged }: SubscriptionsPanelProps) {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<SubscriptionStatus>('active')
  const [sortMode, setSortMode] = useState<SortMode>('date')
  const [editing, setEditing] = useState<Subscription | null>(null)
  const { toast } = useToast()

  const load = useCallback(async () => {
    const result = await getSubscriptions()
    setSubscriptions(result.subscriptions)
    setLoading(false)
    if (result.error) {
      toast({ title: 'Assinaturas', description: result.error, variant: 'destructive' })
    }
  }, [toast])

  useEffect(() => { load() }, [load])

  const handleChanged = useCallback(async () => {
    await load()
    await onChanged?.()
  }, [load, onChanged])

  const summary = useMemo(() => {
    const active = subscriptions.filter((subscription) => subscription.status === 'active')
    const paused = subscriptions.filter((subscription) => subscription.status === 'paused')
    const totalMonthly = sumMonthlyCost(active)

    const ranked = active
      .map((subscription) => ({ subscription, cost: monthlyCost(subscription) }))
      .sort((a, b) => b.cost - a.cost)

    const upcoming = active.filter((subscription) => {
      const days = daysUntil(subscription.next_charge_date)
      return days >= 0 && days <= 7
    })
    const overdue = active.filter((subscription) => daysUntil(subscription.next_charge_date) < 0)

    return {
      active,
      paused,
      totalMonthly,
      totalYearly: totalMonthly * 12,
      perDay: totalMonthly / 30,
      ranked,
      mostExpensive: ranked[0],
      upcomingTotal: upcoming.reduce((total, subscription) => total + Number(subscription.amount), 0),
      upcomingCount: upcoming.length,
      overdueCount: overdue.length,
      overdueTotal: overdue.reduce((total, subscription) => total + Number(subscription.amount), 0),
      pausedSaving: sumMonthlyCost(paused) * 12,
      expenseShare: monthExpenses > 0 ? Math.min(1, totalMonthly / monthExpenses) : 0,
      counts: {
        active: active.length,
        paused: paused.length,
        canceled: subscriptions.filter((subscription) => subscription.status === 'canceled').length,
      },
    }
  }, [monthExpenses, subscriptions])

  const visible = useMemo(() => {
    const filtered = subscriptions.filter((subscription) => subscription.status === statusFilter)
    const sorters: Record<SortMode, (a: Subscription, b: Subscription) => number> = {
      date: (a, b) => a.next_charge_date.localeCompare(b.next_charge_date),
      cost: (a, b) => monthlyCost(b) - monthlyCost(a),
      name: (a, b) => a.name.localeCompare(b.name, 'pt-BR'),
    }
    return [...filtered].sort(sorters[sortMode])
  }, [sortMode, statusFilter, subscriptions])

  // Segmentos da barra de participação: as 6 maiores + o resto agrupado.
  const distribution = useMemo(() => {
    if (summary.totalMonthly <= 0) return []
    const top = summary.ranked.slice(0, 6).map((item) => ({
      key: item.subscription.id,
      name: item.subscription.name,
      share: item.cost / summary.totalMonthly,
    }))
    const restShare = 1 - top.reduce((total, item) => total + item.share, 0)
    return restShare > 0.001
      ? [...top, { key: 'others', name: `Outras ${summary.ranked.length - top.length}`, share: restShare }]
      : top
  }, [summary.ranked, summary.totalMonthly])

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40 rounded-2xl" />
        <div className="grid gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-24 rounded-xl" />)}
        </div>
        {Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-20 rounded-xl" />)}
      </div>
    )
  }

  if (subscriptions.length === 0) {
    return (
      <EmptyState
        icon={Repeat}
        title="Nenhuma assinatura cadastrada"
        description="Netflix, ferramentas, aluguel, academia: cadastre os gastos que se repetem e veja quanto eles custam por mês e por ano."
        action={
          <SubscriptionDialog
            clients={clients}
            projects={projects}
            onSaved={handleChanged}
            trigger={<Button size="sm"><Plus className="h-4 w-4" />Nova assinatura</Button>}
          />
        }
      />
    )
  }

  return (
    <div className="space-y-4">
      {/* Painel de custo recorrente */}
      <div className="overflow-hidden rounded-2xl border border-foreground bg-foreground p-5 text-background sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-background/60">
              Custo recorrente por mês
            </p>
            <p className="mt-1 text-3xl font-bold tracking-[-0.055em] tabular-nums sm:text-4xl">
              {formatCurrency(summary.totalMonthly)}
            </p>
          </div>
          <div className="flex gap-5 text-right sm:gap-7">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-background/55">No ano</p>
              <p className="mt-0.5 whitespace-nowrap text-base font-bold tabular-nums sm:text-lg">
                {formatCurrency(summary.totalYearly)}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-background/55">Por dia</p>
              <p className="mt-0.5 whitespace-nowrap text-base font-bold tabular-nums sm:text-lg">
                {formatCurrency(summary.perDay)}
              </p>
            </div>
          </div>
        </div>

        {distribution.length > 0 && (
          <div className="mt-5 space-y-2.5">
            <div className="flex h-2.5 gap-[3px] overflow-hidden rounded-full">
              {distribution.map((item, index) => (
                <div
                  key={item.key}
                  className="h-full rounded-full bg-background transition-all duration-500"
                  style={{ width: `${item.share * 100}%`, opacity: Math.max(0.25, 1 - index * 0.13) }}
                  title={`${item.name} · ${(item.share * 100).toFixed(0)}%`}
                />
              ))}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {distribution.slice(0, 4).map((item, index) => (
                <span key={item.key} className="flex min-w-0 items-center gap-1.5 text-[11px] text-background/70">
                  <span
                    className="h-1.5 w-1.5 shrink-0 rounded-full bg-background"
                    style={{ opacity: Math.max(0.25, 1 - index * 0.13) }}
                  />
                  <span className="truncate">{item.name}</span>
                  <span className="tabular-nums text-background/50">{(item.share * 100).toFixed(0)}%</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Indicadores de controle */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Próximos 7 dias</p>
            <CalendarClock className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="mt-2.5 truncate text-xl font-bold tabular-nums">{formatCurrency(summary.upcomingTotal)}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {summary.upcomingCount === 0
              ? 'Nenhuma cobrança na semana'
              : `${summary.upcomingCount} cobrança${summary.upcomingCount > 1 ? 's' : ''} a caminho`}
          </p>
        </div>

        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Peso nas despesas</p>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="mt-2.5 text-xl font-bold tabular-nums">
            {monthExpenses > 0 ? `${(summary.expenseShare * 100).toFixed(0)}%` : '—'}
          </p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-foreground transition-[width] duration-500" style={{ width: `${summary.expenseShare * 100}%` }} />
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">
            {monthExpenses > 0 ? 'do que você gastou neste mês' : 'sem despesas lançadas no mês'}
          </p>
        </div>

        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Maior custo</p>
            <Scissors className="h-4 w-4 text-muted-foreground" />
          </div>
          {summary.mostExpensive ? (
            <>
              <p className="mt-2.5 truncate text-xl font-bold">{summary.mostExpensive.subscription.name}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Cancelar economiza <span className="font-semibold text-foreground tabular-nums">{formatCurrency(summary.mostExpensive.cost * 12)}</span> por ano
              </p>
            </>
          ) : (
            <>
              <p className="mt-2.5 text-xl font-bold">—</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Nenhuma assinatura ativa</p>
            </>
          )}
        </div>
      </div>

      {summary.overdueCount > 0 && (
        <button
          type="button"
          onClick={() => { setStatusFilter('active'); setSortMode('date') }}
          className="flex w-full items-center gap-3 rounded-xl border border-dashed border-foreground bg-card p-3.5 text-left transition-colors hover:bg-muted/50"
        >
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">
              {summary.overdueCount} cobrança{summary.overdueCount > 1 ? 's' : ''} já venceu{summary.overdueCount > 1 ? 'ram' : ''}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(summary.overdueTotal)} aguardando confirmação. Toque em “Paguei” para lançar no financeiro.
            </p>
          </div>
        </button>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter.value}
              type="button"
              onClick={() => setStatusFilter(filter.value)}
              className={cn(
                'rounded-full border px-3 py-1 text-xs font-medium transition-all',
                statusFilter === filter.value
                  ? 'border-foreground bg-foreground text-background'
                  : 'bg-card text-muted-foreground hover:border-foreground/40 hover:text-foreground'
              )}
            >
              {filter.label}
              <span className="ml-1.5 tabular-nums opacity-60">{summary.counts[filter.value]}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Select value={sortMode} onValueChange={(value) => setSortMode(value as SortMode)}>
            <SelectTrigger className="h-8 w-[168px] text-xs [&>span]:flex [&>span]:items-center [&>span]:gap-1.5">
              <span>
                <ArrowUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <SelectValue />
              </span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date">Próxima cobrança</SelectItem>
              <SelectItem value="cost">Maior custo</SelectItem>
              <SelectItem value="name">Nome</SelectItem>
            </SelectContent>
          </Select>

          <SubscriptionDialog
            clients={clients}
            projects={projects}
            onSaved={handleChanged}
            trigger={<Button size="sm" className="h-8"><Plus className="h-4 w-4" />Nova</Button>}
          />
        </div>
      </div>

      {/* Lista */}
      {visible.length === 0 ? (
        <EmptyState
          icon={Repeat}
          title={statusFilter === 'active' ? 'Nenhuma assinatura ativa' : statusFilter === 'paused' ? 'Nenhuma assinatura pausada' : 'Nenhuma assinatura cancelada'}
          description={statusFilter === 'active' ? 'Reative uma assinatura pausada ou cadastre uma nova.' : undefined}
        />
      ) : (
        <div className="space-y-2">
          {visible.map((subscription) => (
            <SubscriptionCard
              key={subscription.id}
              subscription={subscription}
              share={summary.totalMonthly > 0 ? monthlyCost(subscription) / summary.totalMonthly : 0}
              onEdit={setEditing}
              onChanged={handleChanged}
            />
          ))}
        </div>
      )}

      {summary.pausedSaving > 0 && statusFilter === 'paused' && (
        <p className="text-center text-xs text-muted-foreground">
          Pausadas representam <span className="font-semibold text-foreground tabular-nums">{formatCurrency(summary.pausedSaving)}</span> por ano fora do seu custo fixo.
        </p>
      )}

      {editing && (
        <SubscriptionDialog
          key={editing.id}
          clients={clients}
          projects={projects}
          subscription={editing}
          open
          onOpenChange={(open) => !open && setEditing(null)}
          onSaved={handleChanged}
        />
      )}
    </div>
  )
}
