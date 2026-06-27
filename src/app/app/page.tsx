import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CheckSquare, FolderKanban, TrendingUp, TrendingDown, Wallet, StickyNote, Plus } from 'lucide-react'
import { StatCard } from '@/components/shared/StatCard'
import { TaskCard } from '@/components/tasks/TaskCard'
import { NoteCard } from '@/components/notes/NoteCard'
import { CreateTaskDialog } from '@/components/tasks/CreateTaskDialog'
import { CreateProjectDialog } from '@/components/projects/CreateProjectDialog'
import { CreateFinanceDialog } from '@/components/finance/CreateFinanceDialog'
import { CreateNoteDialog } from '@/components/notes/CreateNoteDialog'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/shared/EmptyState'
import { formatCurrency, PROJECT_STATUS_LABELS, isOverdue } from '@/lib/utils'
import { startOfMonth, endOfMonth, format } from 'date-fns'
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
    supabase.from('projects').select('id, name').order('name'),
    supabase.from('profiles').select('full_name').eq('id', user.id).single(),
  ])

  const todayTasks = (tasks ?? []).filter((t: Task) => t.due_date === today)
  const overdueTasks = (tasks ?? []).filter((t: Task) => t.due_date && isOverdue(t.due_date) && t.due_date !== today)

  const income = (monthEntries ?? []).filter((e: FinancialEntry) => e.type === 'income').reduce((s: number, e: FinancialEntry) => s + Number(e.amount), 0)
  const expenses = (monthEntries ?? []).filter((e: FinancialEntry) => e.type === 'expense').reduce((s: number, e: FinancialEntry) => s + Number(e.amount), 0)
  const pending = (monthEntries ?? []).filter((e: FinancialEntry) => e.status === 'pending').reduce((s: number, e: FinancialEntry) => s + Number(e.amount), 0)

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite'
  const firstName = profile?.full_name?.split(' ')[0] || 'por aqui'

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Greeting */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">{greeting}, {firstName}!</h1>
        <p className="text-sm text-muted-foreground">
          {todayTasks.length > 0
            ? `Você tem ${todayTasks.length} tarefa${todayTasks.length > 1 ? 's' : ''} para hoje.`
            : 'Tudo em dia por aqui. Bom trabalho!'}
        </p>
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-2">
        <CreateTaskDialog clients={clients ?? []} projects={projects ?? []} defaultDate={today}
          trigger={<button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border bg-card hover:bg-muted transition-colors"><Plus className="h-3.5 w-3.5 text-primary" />Nova tarefa</button>}
        />
        <CreateProjectDialog clients={clients ?? []}
          trigger={<button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border bg-card hover:bg-muted transition-colors"><Plus className="h-3.5 w-3.5 text-primary" />Novo projeto</button>}
        />
        <CreateFinanceDialog clients={clients ?? []} projects={projects ?? []}
          trigger={<button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border bg-card hover:bg-muted transition-colors"><Plus className="h-3.5 w-3.5 text-primary" />Novo lançamento</button>}
        />
        <CreateNoteDialog
          trigger={<button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border bg-card hover:bg-muted transition-colors"><Plus className="h-3.5 w-3.5 text-primary" />Nova nota</button>}
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Tarefas hoje" value={todayTasks.length} icon={CheckSquare} variant={todayTasks.length > 0 ? 'primary' : 'default'} />
        <StatCard label="Atrasadas" value={overdueTasks.length} icon={CheckSquare} variant={overdueTasks.length > 0 ? 'destructive' : 'default'} />
        <StatCard label="Projetos ativos" value={activeProjects?.length ?? 0} icon={FolderKanban} variant="default" />
        <StatCard label="Saldo do mês" value={formatCurrency(income - expenses)} icon={Wallet} variant={income - expenses >= 0 ? 'success' : 'destructive'} description={`${formatCurrency(pending)} pendente`} />
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
            <EmptyState icon={CheckSquare} title="Nenhuma tarefa para hoje" description="Aproveite o dia ou adicione novas tarefas!" />
          ) : (
            <div className="space-y-2">
              {todayTasks.map((task) => <TaskCard key={task.id} task={task as Task} />)}
            </div>
          )}
          {overdueTasks.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-medium text-destructive mb-2">Atrasadas</p>
              <div className="space-y-2">
                {overdueTasks.slice(0, 3).map((task) => <TaskCard key={task.id} task={task as Task} />)}
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
                {activeProjects!.map((project) => (
                  <div key={project.id} className="flex items-center justify-between p-3 rounded-xl border bg-card">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{project.name}</p>
                      {project.client && <p className="text-xs text-muted-foreground">{(project as any).client.name}</p>}
                    </div>
                    <Badge variant={project.status as any} className="shrink-0 text-[10px]">
                      {PROJECT_STATUS_LABELS[project.status as Project['status']]}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Financial summary */}
          <section>
            <h2 className="font-semibold text-sm mb-3">Financeiro do mês</h2>
            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 rounded-xl border bg-green-50 border-green-100">
                <div className="flex items-center gap-1.5 mb-1">
                  <TrendingUp className="h-3.5 w-3.5 text-green-600" />
                  <span className="text-xs text-green-700 font-medium">Receitas</span>
                </div>
                <p className="text-base font-bold text-green-700">{formatCurrency(income)}</p>
              </div>
              <div className="p-3 rounded-xl border bg-red-50 border-red-100">
                <div className="flex items-center gap-1.5 mb-1">
                  <TrendingDown className="h-3.5 w-3.5 text-red-500" />
                  <span className="text-xs text-red-600 font-medium">Despesas</span>
                </div>
                <p className="text-base font-bold text-red-600">{formatCurrency(expenses)}</p>
              </div>
            </div>
          </section>

          {/* Recent notes */}
          {(recentNotes?.length ?? 0) > 0 && (
            <section>
              <h2 className="font-semibold text-sm mb-3">Notas recentes</h2>
              <div className="space-y-2">
                {recentNotes!.slice(0, 2).map((note) => (
                  <div key={note.id} className="p-3 rounded-xl border bg-card">
                    <p className="text-sm font-medium truncate">{note.title}</p>
                    {note.content && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{note.content}</p>}
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  )
}
