import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CheckSquare, FolderKanban, TrendingUp, TrendingDown, Wallet, StickyNote, Plus, PartyPopper, CalendarClock } from 'lucide-react'
import { StatCard } from '@/components/shared/StatCard'
import { EditableTaskCard } from '@/components/tasks/EditableTaskCard'
import { NoteCard } from '@/components/notes/NoteCard'
import { CreateTaskDialog } from '@/components/tasks/CreateTaskDialog'
import { CreateProjectDialog } from '@/components/projects/CreateProjectDialog'
import { CreateFinanceDialog } from '@/components/finance/CreateFinanceDialog'
import { CreateNoteDialog } from '@/components/notes/CreateNoteDialog'
import { ExpenseByCategoryChart } from '@/components/finance/ExpenseByCategoryChartLazy'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/shared/EmptyState'
import { cn, formatCurrency, PROJECT_STATUS_LABELS, isOverdue } from '@/lib/utils'
import { startOfMonth, endOfMonth, format, differenceInCalendarDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { Task, Project, FinancialEntry, QuickNote, Client } from '@/types'

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const today = new Date().toISOString().split('T')[0]
  const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd')
  const monthEnd = format(endOfMonth(new Date()), 'yyyy-MM-dd')

  const [
    { data: tasks },
    { data: activeProjects },
    { data: monthEntries },
    { data: recentNotes },
    { data: clients },
    { data: projects },
    { data: profile },
  ] = await Promise.all([
    supabase.from('tasks').select('*, project:projects(id,name), client:clients(id,name)')
      .neq('status', 'completed').order('due_date', { ascending: true }).limit(20),
    supabase.from('projects').select('*, client:clients(id,name)')
      .in('status', ['in_progress', 'planning']).order('created_at', { ascending: false }).limit(4),
    supabase.from('financial_entries').select('*')
      .gte('due_date', monthStart).lte('due_date', monthEnd),
    supabase.from('quick_notes').select('*')
      .order('is_pinned', { ascending: false }).order('created_at', { ascending: false }).limit(4),
    supabase.from('clients').select('*').order('name'),
    supabase.from('projects').select('*').order('name'),
    supabase.from('profiles').select('full_name').eq('id', user.id).single(),
  ])

  const todayTasks = (tasks ?? []).filter((t: Task) => t.due_date === today)
  const overdueTasks = (tasks ?? []).filter((t: Task) => t.due_date && isOverdue(t.due_date) && t.due_date !== today)

  const income = (monthEntries ?? []).filter((e: FinancialEntry) => e.type === 'income').reduce((s: number, e: FinancialEntry) => s + Number(e.amount), 0)
  const expenses = (monthEntries ?? []).filter((e: FinancialEntry) => e.type === 'expense').reduce((s: number, e: FinancialEntry) => s + Number(e.amount), 0)
  const pending = (monthEntries ?? []).filter((e: FinancialEntry) => e.status === 'pending').reduce((s: number, e: FinancialEntry) => s + Number(e.amount), 0)
  const balance = income - expenses

  const expensesByCategory = Object.entries(
    (monthEntries ?? [])
      .filter((e: FinancialEntry) => e.type === 'expense')
      .reduce((acc: Record<string, number>, e: FinancialEntry) => {
        acc[e.category] = (acc[e.category] ?? 0) + Number(e.amount)
        return acc
      }, {})
  )
    .map(([category, amount]) => ({ category, amount: amount as number }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5)

  const allClear = todayTasks.length === 0 && overdueTasks.length === 0

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite'
  const firstName = profile?.full_name?.split(' ')[0] || 'por aqui'
  const todayLabel = format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Greeting */}
      <div className="flex flex-col gap-1 border-b border-foreground/15 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">{todayLabel}</p>
          <h1 className="text-2xl font-bold leading-none tracking-[-0.05em] sm:text-3xl">{greeting}, {firstName}!</h1>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground sm:text-sm">
            {todayTasks.length > 0
              ? `Você tem ${todayTasks.length} tarefa${todayTasks.length > 1 ? 's' : ''} para hoje.`
              : 'Tudo em dia por aqui. Bom trabalho!'}
          </p>
        </div>
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-2">
        <CreateTaskDialog clients={clients ?? []} projects={projects ?? []} defaultDate={today}
          trigger={<button className="group flex h-9 cursor-pointer items-center gap-1.5 rounded-md border border-foreground/30 bg-card px-3 text-[11px] font-semibold transition-all duration-150 hover:border-foreground hover:bg-foreground hover:text-background"><Plus className="h-3.5 w-3.5 transition-transform duration-150 group-hover:rotate-90" />Nova tarefa</button>}
        />
        <CreateProjectDialog clients={clients ?? []}
          trigger={<button className="group flex h-9 cursor-pointer items-center gap-1.5 rounded-md border border-foreground/30 bg-card px-3 text-[11px] font-semibold transition-all duration-150 hover:border-foreground hover:bg-foreground hover:text-background"><Plus className="h-3.5 w-3.5 transition-transform duration-150 group-hover:rotate-90" />Novo projeto</button>}
        />
        <CreateFinanceDialog clients={clients ?? []} projects={projects ?? []}
          trigger={<button className="group flex h-9 cursor-pointer items-center gap-1.5 rounded-md border border-foreground/30 bg-card px-3 text-[11px] font-semibold transition-all duration-150 hover:border-foreground hover:bg-foreground hover:text-background"><Plus className="h-3.5 w-3.5 transition-transform duration-150 group-hover:rotate-90" />Novo lançamento</button>}
        />
        <CreateNoteDialog
          trigger={<button className="group flex h-9 cursor-pointer items-center gap-1.5 rounded-md border border-foreground/30 bg-card px-3 text-[11px] font-semibold transition-all duration-150 hover:border-foreground hover:bg-foreground hover:text-background"><Plus className="h-3.5 w-3.5 transition-transform duration-150 group-hover:rotate-90" />Nova nota</button>}
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <StatCard
          label="Tarefas hoje" value={todayTasks.length} icon={CheckSquare}
          variant={todayTasks.length > 0 ? 'primary' : 'default'} href="/app/tarefas"
          style={{ animationDelay: '0ms' }} className="animate-fade-in"
        />
        <StatCard
          label="Atrasadas" value={overdueTasks.length} icon={CheckSquare}
          variant={overdueTasks.length > 0 ? 'destructive' : 'default'} href="/app/tarefas"
          style={{ animationDelay: '60ms' }} className="animate-fade-in"
        />
        <StatCard
          label="Projetos ativos" value={activeProjects?.length ?? 0} icon={FolderKanban}
          variant="default" href="/app/projetos"
          style={{ animationDelay: '120ms' }} className="animate-fade-in"
        />
        <StatCard
          label="Saldo do mês" value={formatCurrency(balance)} icon={Wallet}
          variant={balance >= 0 ? 'success' : 'destructive'} description={`${formatCurrency(pending)} pendente`}
          href="/app/financeiro" style={{ animationDelay: '180ms' }} className="animate-fade-in"
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Today's Tasks */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-sm">Tarefas de hoje</h2>
            {overdueTasks.length > 0 && (
              <Badge variant="overdue" className="text-[10px]">{overdueTasks.length} atrasada{overdueTasks.length > 1 ? 's' : ''}</Badge>
            )}
          </div>
          {todayTasks.length === 0 ? (
            allClear ? (
              <div className="flex flex-col items-center justify-center py-16 px-4 text-center rounded-xl border border-dashed border-success/30 bg-success/[0.03]">
                <div className="h-14 w-14 rounded-2xl bg-success/10 flex items-center justify-center mb-4">
                  <PartyPopper className="h-7 w-7 text-success" />
                </div>
                <h3 className="text-base font-semibold text-foreground mb-1">Tudo em dia!</h3>
                <p className="text-sm text-muted-foreground max-w-xs">Nenhuma tarefa pendente para hoje. Aproveite para planejar o que vem por aí.</p>
              </div>
            ) : (
              <EmptyState icon={CheckSquare} title="Nenhuma tarefa para hoje" description="Aproveite o dia ou adicione novas tarefas!" />
            )
          ) : (
            <div className="space-y-2">
              {todayTasks.map((task) => (
                <EditableTaskCard key={task.id} task={task as Task} clients={clients ?? []} projects={projects ?? []} />
              ))}
            </div>
          )}
          {overdueTasks.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-medium text-destructive mb-2">Atrasadas</p>
              <div className="space-y-2">
                {overdueTasks.slice(0, 3).map((task) => (
                  <EditableTaskCard key={task.id} task={task as Task} clients={clients ?? []} projects={projects ?? []} />
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Right column */}
        <div className="space-y-6">
          {/* Active Projects */}
          <section>
            <h2 className="font-semibold text-sm mb-3">Projetos em andamento</h2>
            {(activeProjects?.length ?? 0) === 0 ? (
              <EmptyState icon={FolderKanban} title="Nenhum projeto ativo" description="Crie um projeto para começar." />
            ) : (
              <div className="space-y-2">
                {activeProjects!.map((project) => {
                  const daysLeft = project.deadline ? differenceInCalendarDays(new Date(project.deadline), new Date()) : null
                  return (
                    <div key={project.id} className="group flex items-center justify-between p-3 rounded-xl border bg-card hover:shadow-sm hover:border-primary/20 transition-all duration-150">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{project.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {project.client && <p className="text-xs text-muted-foreground truncate">{(project as any).client.name}</p>}
                          {daysLeft !== null && (
                            <span className={cn(
                              'flex items-center gap-1 text-[10px] shrink-0',
                              daysLeft < 0 ? 'text-destructive' : daysLeft <= 3 ? 'text-warning' : 'text-muted-foreground'
                            )}>
                              <CalendarClock className="h-3 w-3" />
                              {daysLeft < 0 ? 'Prazo vencido' : daysLeft === 0 ? 'Prazo hoje' : `${daysLeft}d restantes`}
                            </span>
                          )}
                        </div>
                      </div>
                      <Badge variant={project.status as any} className="shrink-0 text-[10px]">
                        {PROJECT_STATUS_LABELS[project.status as Project['status']]}
                      </Badge>
                    </div>
                  )
                })}
              </div>
            )}
          </section>

          {/* Financial summary */}
          <section>
            <h2 className="font-semibold text-sm mb-3">Financeiro do mês</h2>
            <div className="grid grid-cols-2 gap-2">
              <div className="min-w-0 rounded-xl border border-success/15 bg-success/[0.06] p-3 [container-type:inline-size]">
                <div className="flex items-center gap-1.5 mb-1">
                  <TrendingUp className="h-3.5 w-3.5 text-success" />
                  <span className="text-xs text-success font-medium">Receitas</span>
                </div>
                <p className="responsive-financial-summary font-bold text-success tabular-nums">{formatCurrency(income)}</p>
              </div>
              <div className="min-w-0 rounded-xl border border-destructive/15 bg-destructive/[0.06] p-3 [container-type:inline-size]">
                <div className="flex items-center gap-1.5 mb-1">
                  <TrendingDown className="h-3.5 w-3.5 text-destructive" />
                  <span className="text-xs text-destructive font-medium">Despesas</span>
                </div>
                <p className="responsive-financial-summary font-bold text-destructive tabular-nums">{formatCurrency(expenses)}</p>
              </div>
            </div>

            {expensesByCategory.length > 0 && (
              <div className="mt-3 p-3 rounded-xl border bg-card">
                <p className="text-xs font-medium text-muted-foreground mb-2">Despesas por categoria</p>
                <ExpenseByCategoryChart data={expensesByCategory} />
              </div>
            )}
          </section>

          {/* Recent notes */}
          {(recentNotes?.length ?? 0) > 0 && (
            <section>
              <h2 className="font-semibold text-sm mb-3">Notas recentes</h2>
              <div className="space-y-2">
                {recentNotes!.slice(0, 2).map((note) => (
                  <NoteCard key={note.id} note={note as QuickNote} />
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  )
}
