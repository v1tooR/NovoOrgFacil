'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { BarChart3, List, Wallet, TrendingUp, TrendingDown, Clock } from 'lucide-react'
import { format, startOfMonth, endOfMonth, subMonths, addMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { PageTitle } from '@/components/shared/PageTitle'
import { FinanceCard } from '@/components/finance/FinanceCard'
import { CreateFinanceDialog } from '@/components/finance/CreateFinanceDialog'
import { FinancialAnalytics } from '@/components/finance/FinancialAnalyticsLazy'
import { StatCard } from '@/components/shared/StatCard'
import { EmptyState } from '@/components/shared/EmptyState'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { useAccountType } from '@/components/providers/AccountTypeProvider'
import type { FinancialEntry, Client, Project } from '@/types'

export default function FinanceiroPage() {
  const [entries, setEntries] = useState<FinancialEntry[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [section, setSection] = useState<'entries' | 'analytics'>('entries')
  const [analyticsEntries, setAnalyticsEntries] = useState<FinancialEntry[]>([])
  const [analyticsLoading, setAnalyticsLoading] = useState(false)
  const [analyticsError, setAnalyticsError] = useState(false)
  const [currentDate, setCurrentDate] = useState(new Date())
  const supabase = useMemo(() => createClient(), [])
  const { isFreelancer } = useAccountType()

  const monthStart = format(startOfMonth(currentDate), 'yyyy-MM-dd')
  const monthEnd = format(endOfMonth(currentDate), 'yyyy-MM-dd')
  const monthLabel = format(currentDate, 'MMMM yyyy', { locale: ptBR })
  const analyticsStart = format(startOfMonth(subMonths(currentDate, 5)), 'yyyy-MM-dd')
  const analyticsEnd = format(endOfMonth(addMonths(currentDate, 5)), 'yyyy-MM-dd')

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: entriesData }, { data: clientsData }, { data: projectsData }] = await Promise.all([
      isFreelancer
        ? supabase.from('financial_entries')
            .select('*, client:clients(id,name), project:projects(id,name)')
            .gte('due_date', monthStart).lte('due_date', monthEnd).order('due_date', { ascending: false })
        : supabase.from('financial_entries').select('*')
            .gte('due_date', monthStart).lte('due_date', monthEnd).order('due_date', { ascending: false }),
      isFreelancer
        ? supabase.from('clients').select('*').order('name')
        : Promise.resolve({ data: [] }),
      isFreelancer
        ? supabase.from('projects').select('*').order('name')
        : Promise.resolve({ data: [] }),
    ])
    setEntries((entriesData ?? []) as FinancialEntry[])
    setClients((clientsData ?? []) as Client[])
    setProjects((projectsData ?? []) as Project[])
    setLoading(false)
  }, [isFreelancer, monthStart, monthEnd, supabase])

  useEffect(() => { load() }, [load])

  const loadAnalytics = useCallback(async () => {
    setAnalyticsLoading(true)
    setAnalyticsError(false)
    const { data, error } = await supabase
      .from('financial_entries')
      .select('*')
      .gte('due_date', analyticsStart)
      .lte('due_date', analyticsEnd)
      .order('due_date', { ascending: true })

    setAnalyticsEntries((data ?? []) as FinancialEntry[])
    setAnalyticsError(Boolean(error))
    setAnalyticsLoading(false)
  }, [analyticsEnd, analyticsStart, supabase])

  useEffect(() => {
    if (section === 'analytics') loadAnalytics()
  }, [loadAnalytics, section])

  const handleFinancialChange = useCallback(async () => {
    await load()
    if (section === 'analytics') await loadAnalytics()
  }, [load, loadAnalytics, section])

  const income = useMemo(() => entries.filter((e) => e.type === 'income').reduce((s, e) => s + Number(e.amount), 0), [entries])
  const expenses = useMemo(() => entries.filter((e) => e.type === 'expense').reduce((s, e) => s + Number(e.amount), 0), [entries])
  const pending = useMemo(() => entries.filter((e) => e.status === 'pending').reduce((s, e) => s + Number(e.amount), 0), [entries])
  const incomeEntries = entries.filter((e) => e.type === 'income')
  const expenseEntries = entries.filter((e) => e.type === 'expense')

  return (
    <div className="space-y-6 animate-fade-in">
      <PageTitle
        title="Financeiro"
        description="Controle suas receitas e despesas."
        action={<CreateFinanceDialog clients={clients} projects={projects} onCreated={handleFinancialChange} />}
      />

      {/* Month navigator */}
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentDate(subMonths(currentDate, 1))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium capitalize min-w-[140px] text-center">{monthLabel}</span>
        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentDate(addMonths(currentDate, 1))}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Receitas" value={formatCurrency(income)} icon={TrendingUp} variant="success" />
        <StatCard label="Despesas" value={formatCurrency(expenses)} icon={TrendingDown} variant="destructive" />
        <StatCard label="Saldo" value={formatCurrency(income - expenses)} icon={Wallet} variant={income - expenses >= 0 ? 'primary' : 'destructive'} />
        <StatCard label="Pendente" value={formatCurrency(pending)} icon={Clock} variant="warning" />
      </div>

      <Tabs value={section} onValueChange={(value) => setSection(value as 'entries' | 'analytics')}>
        <TabsList className="grid h-auto w-full grid-cols-2 sm:w-auto sm:min-w-[280px]">
          <TabsTrigger value="entries" className="gap-1.5">
            <List className="h-3.5 w-3.5" />Lançamentos
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-1.5">
            <BarChart3 className="h-3.5 w-3.5" />Análises
          </TabsTrigger>
        </TabsList>

        <TabsContent value="entries" className="mt-4">
          {loading ? (
            <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
          ) : entries.length === 0 ? (
            <EmptyState icon={Wallet} title="Nenhum lançamento neste mês" description="Registre suas receitas e despesas para acompanhar seu financeiro."
              action={<CreateFinanceDialog clients={clients} projects={projects} onCreated={handleFinancialChange} />}
            />
          ) : (
            <Tabs defaultValue="todos">
              <TabsList className="max-w-full overflow-x-auto">
                <TabsTrigger value="todos">Todos ({entries.length})</TabsTrigger>
                <TabsTrigger value="receitas">Receitas ({incomeEntries.length})</TabsTrigger>
                <TabsTrigger value="despesas">Despesas ({expenseEntries.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="todos" className="mt-4 space-y-2">
                {entries.map((entry) => <FinanceCard key={entry.id} entry={entry} onChanged={load} />)}
              </TabsContent>
              <TabsContent value="receitas" className="mt-4 space-y-2">
                {incomeEntries.length === 0 ? <EmptyState icon={TrendingUp} title="Nenhuma receita" /> :
                  incomeEntries.map((entry) => <FinanceCard key={entry.id} entry={entry} onChanged={load} />)}
              </TabsContent>
              <TabsContent value="despesas" className="mt-4 space-y-2">
                {expenseEntries.length === 0 ? <EmptyState icon={TrendingDown} title="Nenhuma despesa" /> :
                  expenseEntries.map((entry) => <FinanceCard key={entry.id} entry={entry} onChanged={load} />)}
              </TabsContent>
            </Tabs>
          )}
        </TabsContent>

        <TabsContent value="analytics" className="mt-4">
          {analyticsLoading ? (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                {Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-28 rounded-xl" />)}
              </div>
              <Skeleton className="h-80 rounded-xl" />
            </div>
          ) : analyticsError ? (
            <EmptyState
              icon={BarChart3}
              title="Não foi possível carregar as análises"
              description="Tente novamente em alguns instantes."
              action={<Button variant="outline" size="sm" onClick={loadAnalytics}>Tentar novamente</Button>}
            />
          ) : (
            <FinancialAnalytics entries={analyticsEntries} referenceDate={currentDate} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
