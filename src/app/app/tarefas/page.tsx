'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, CheckSquare } from 'lucide-react'
import { PageTitle } from '@/components/shared/PageTitle'
import { TaskCard } from '@/components/tasks/TaskCard'
import { KanbanBoard } from '@/components/tasks/KanbanBoard'
import { ViewToggle, type TaskView } from '@/components/tasks/ViewToggle'
import { EditTaskDialog } from '@/components/tasks/EditTaskDialog'
import { CreateTaskDialog } from '@/components/tasks/CreateTaskDialog'
import { EmptyState } from '@/components/shared/EmptyState'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { useToast } from '@/components/ui/use-toast'
import { updateTask, deleteTask } from '@/actions/tasks'
import { isOverdue } from '@/lib/utils'
import type { Task, Client, Project, TaskStatus } from '@/types'

const VIEW_STORAGE_KEY = 'tarefas:view'

export default function TarefasPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [editTask, setEditTask] = useState<Task | null>(null)
  const [view, setView] = useState<TaskView>('list')
  const { toast } = useToast()

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? window.localStorage.getItem(VIEW_STORAGE_KEY) : null
    if (stored === 'list' || stored === 'kanban') setView(stored)
  }, [])

  function handleViewChange(next: TaskView) {
    setView(next)
    window.localStorage.setItem(VIEW_STORAGE_KEY, next)
  }

  // Refetch tasks from the DB. Called after create/edit so the client state
  // (which we fetch once on mount) never goes stale until a full navigation.
  const loadTasks = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('tasks')
      .select('*, project:projects(id,name), client:clients(id,name)')
      .order('due_date', { ascending: true })
    setTasks((data ?? []) as Task[])
  }, [])

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const [{ data: tasksData }, { data: clientsData }, { data: projectsData }] = await Promise.all([
        supabase.from('tasks').select('*, project:projects(id,name), client:clients(id,name)').order('due_date', { ascending: true }),
        supabase.from('clients').select('*').order('name'),
        supabase.from('projects').select('*').order('name'),
      ])
      setTasks((tasksData ?? []) as Task[])
      setClients((clientsData ?? []) as Client[])
      setProjects((projectsData ?? []) as Project[])
      setLoading(false)
    }
    load()
  }, [])

  // Optimistic status change shared by the list checkbox and the Kanban drag.
  const handleStatusChange = useCallback((taskId: string, status: TaskStatus) => {
    setTasks((prev) => {
      const previous = prev.find((t) => t.id === taskId)
      if (!previous || previous.status === status) return prev
      const prevStatus = previous.status
      updateTask(taskId, { status }).then((res) => {
        // Roll back to the original status on failure.
        if (res?.error) setTasks((cur) => cur.map((t) => (t.id === taskId ? { ...t, status: prevStatus } : t)))
      })
      return prev.map((t) => (t.id === taskId ? { ...t, status } : t))
    })
  }, [])

  // Delete: wait for the server to confirm, then drop the card from local state
  // so it disappears immediately (no navigate-away-and-back needed).
  const handleDelete = useCallback(async (taskId: string) => {
    const res = await deleteTask(taskId)
    if (res?.error) {
      toast({ title: 'Erro', description: res.error, variant: 'destructive' })
      return
    }
    setTasks((prev) => prev.filter((t) => t.id !== taskId))
    toast({ title: 'Tarefa excluída' })
  }, [toast])

  const today = new Date().toISOString().split('T')[0]
  const todayTasks = tasks.filter((t) => t.due_date === today && t.status !== 'completed')
  const overdueTasks = tasks.filter((t) => t.due_date && isOverdue(t.due_date) && t.due_date !== today && t.status !== 'completed')
  const upcomingTasks = tasks.filter((t) => (!t.due_date || t.due_date > today) && t.status !== 'completed' && !overdueTasks.includes(t))
  const completedTasks = tasks.filter((t) => t.status === 'completed')

  return (
    <div className="space-y-6 animate-fade-in">
      <PageTitle
        title="Tarefas"
        description="Organize e acompanhe suas tarefas do dia."
        action={
          <CreateTaskDialog clients={clients} projects={projects} defaultDate={today} onSuccess={loadTasks}
            trigger={<button className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"><Plus className="h-4 w-4" />Nova tarefa</button>}
          />
        }
      />

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      ) : view === 'kanban' ? (
        <div className="space-y-4">
          <div className="flex flex-col-reverse items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Arraste os cards entre as colunas para atualizar o status.
            </p>
            <ViewToggle value={view} onChange={handleViewChange} />
          </div>
          <KanbanBoard tasks={tasks} onStatusChange={handleStatusChange} onEdit={setEditTask} onDelete={handleDelete} />
        </div>
      ) : (
        <Tabs defaultValue="hoje">
          <div className="flex flex-col-reverse items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
            <TabsList className="w-full sm:w-auto">
              <TabsTrigger value="hoje">Hoje{todayTasks.length > 0 && ` (${todayTasks.length})`}</TabsTrigger>
              <TabsTrigger value="atrasadas" className={overdueTasks.length > 0 ? 'text-destructive' : ''}>
                Atrasadas{overdueTasks.length > 0 && ` (${overdueTasks.length})`}
              </TabsTrigger>
              <TabsTrigger value="proximas">Próximas</TabsTrigger>
              <TabsTrigger value="concluidas">Concluídas</TabsTrigger>
            </TabsList>
            <ViewToggle value={view} onChange={handleViewChange} />
          </div>

          <TabsContent value="hoje" className="mt-4 space-y-2">
            {todayTasks.length === 0 ? (
              <EmptyState icon={CheckSquare} title="Nenhuma tarefa para hoje" description="Que tal adicionar algo para fazer hoje?"
                action={<CreateTaskDialog clients={clients} projects={projects} defaultDate={today} onSuccess={loadTasks} />}
              />
            ) : todayTasks.map((task) => <TaskCard key={task.id} task={task} onEdit={setEditTask} onStatusChange={handleStatusChange} onDelete={handleDelete} />)}
          </TabsContent>

          <TabsContent value="atrasadas" className="mt-4 space-y-2">
            {overdueTasks.length === 0 ? (
              <EmptyState icon={CheckSquare} title="Nenhuma tarefa atrasada" description="Parabéns, você está em dia!" />
            ) : overdueTasks.map((task) => <TaskCard key={task.id} task={task} onEdit={setEditTask} onStatusChange={handleStatusChange} onDelete={handleDelete} />)}
          </TabsContent>

          <TabsContent value="proximas" className="mt-4 space-y-2">
            {upcomingTasks.length === 0 ? (
              <EmptyState icon={CheckSquare} title="Nenhuma tarefa futura" description="Adicione tarefas com datas futuras."
                action={<CreateTaskDialog clients={clients} projects={projects} onSuccess={loadTasks} />}
              />
            ) : upcomingTasks.map((task) => <TaskCard key={task.id} task={task} onEdit={setEditTask} onStatusChange={handleStatusChange} onDelete={handleDelete} />)}
          </TabsContent>

          <TabsContent value="concluidas" className="mt-4 space-y-2">
            {completedTasks.length === 0 ? (
              <EmptyState icon={CheckSquare} title="Nenhuma tarefa concluída" />
            ) : completedTasks.map((task) => <TaskCard key={task.id} task={task} onEdit={setEditTask} onStatusChange={handleStatusChange} onDelete={handleDelete} />)}
          </TabsContent>
        </Tabs>
      )}

      <EditTaskDialog
        task={editTask}
        open={!!editTask}
        onOpenChange={(open) => !open && setEditTask(null)}
        clients={clients}
        projects={projects}
        onSuccess={loadTasks}
      />
    </div>
  )
}
