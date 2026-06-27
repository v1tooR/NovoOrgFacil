'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Wallet, TrendingUp, TrendingDown, Clock } from 'lucide-react'
import { format, startOfMonth, endOfMonth, subMonths, addMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { PageTitle } from '@/components/shared/PageTitle'
import { FinanceCard } from '@/components/finance/FinanceCard'
import { CreateFinanceDialog } from '@/components/finance/CreateFinanceDialog'
import { StatCard } from '@/components/shared/StatCard'
import { EmptyState } from '@/components/shared/EmptyState'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import type { FinancialEntry, Client, Project } from '@/types'

export default function FinanceiroPage() {
  const [entries, setEntries] = useState<FinancialEntry[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())
  const supabase = createClient()

  const monthStart = format(startOfMonth(currentDate), 'yyyy-MM-dd')
  const monthEnd = format(endOfMonth(currentDate), 'yyyy-MM-dd')
  const monthLabel = format(currentDate, 'MMMM yyyy', { locale: ptBR })

  useEffect(() => {
    async function load() {
      setLoading(true)
      const [{ data: entriesData }, { data: clientsData }, { data: projectsData }] = await Promise.all([
        supabase.from('financial_entries').select('*, client:clients(id,name), project:projects(id,name)')
          .gte('due_date', monthStart).lte('due_date', monthEnd).order('due_date', { ascending: false }),
        supabase.from('clients').select('*').order('name'),
        supabase.from('projects').select('*').order('name'),
      ])
      setEntries((entriesData ?? []) as FinancialEntry[])
      setClients((clientsData ?? []) as Client[])
      setProjects((projectsData ?? []) as Project[])
      setLoading(false)
    }
    load()
  }, [monthStart, monthEnd])

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
        action={<CreateFinanceDialog clients={clients} projects={projects} />}
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

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : entries.length === 0 ? (
        <EmptyState icon={Wallet} title="Nenhum lançamento neste mês" description="Registre suas receitas e despesas para acompanhar seu financeiro."
          action={<CreateFinanceDialog clients={clients} projects={projects} />}
        />
      ) : (
        <Tabs defaultValue="todos">
          <TabsList>
            <TabsTrigger value="todos">Todos ({entries.length})</TabsTrigger>
            <TabsTrigger value="receitas">Receitas ({incomeEntries.length})</TabsTrigger>
            <TabsTrigger value="despesas">Despesas ({expenseEntries.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="todos" className="mt-4 space-y-2">
            {entries.map((entry) => <FinanceCard key={entry.id} entry={entry} />)}
          </TabsContent>
          <TabsContent value="receitas" className="mt-4 space-y-2">
            {incomeEntries.length === 0 ? <EmptyState icon={TrendingUp} title="Nenhuma receita" /> :
              incomeEntries.map((entry) => <FinanceCard key={entry.id} entry={entry} />)}
          </TabsContent>
          <TabsContent value="despesas" className="mt-4 space-y-2">
            {expenseEntries.length === 0 ? <EmptyState icon={TrendingDown} title="Nenhuma despesa" /> :
              expenseEntries.map((entry) => <FinanceCard key={entry.id} entry={entry} />)}
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
