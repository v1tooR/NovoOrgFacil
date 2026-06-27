'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, CheckSquare } from 'lucide-react'
import { PageTitle } from '@/components/shared/PageTitle'
import { TaskCard } from '@/components/tasks/TaskCard'
import { EditTaskDialog } from '@/components/tasks/EditTaskDialog'
import { CreateTaskDialog } from '@/components/tasks/CreateTaskDialog'
import { EmptyState } from '@/components/shared/EmptyState'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { isOverdue } from '@/lib/utils'
import type { Task, Client, Project } from '@/types'

export default function TarefasPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [editTask, setEditTask] = useState<Task | null>(null)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
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
          <CreateTaskDialog clients={clients} projects={projects} defaultDate={today}
            trigger={<button className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"><Plus className="h-4 w-4" />Nova tarefa</button>}
          />
        }
      />

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      ) : (
        <Tabs defaultValue="hoje">
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="hoje">Hoje{todayTasks.length > 0 && ` (${todayTasks.length})`}</TabsTrigger>
            <TabsTrigger value="atrasadas" className={overdueTasks.length > 0 ? 'text-destructive' : ''}>
              Atrasadas{overdueTasks.length > 0 && ` (${overdueTasks.length})`}
            </TabsTrigger>
            <TabsTrigger value="proximas">Próximas</TabsTrigger>
            <TabsTrigger value="concluidas">Concluídas</TabsTrigger>
          </TabsList>

          <TabsContent value="hoje" className="mt-4 space-y-2">
            {todayTasks.length === 0 ? (
              <EmptyState icon={CheckSquare} title="Nenhuma tarefa para hoje" description="Que tal adicionar algo para fazer hoje?"
                action={<CreateTaskDialog clients={clients} projects={projects} defaultDate={today} />}
              />
            ) : todayTasks.map((task) => <TaskCard key={task.id} task={task} onEdit={setEditTask} />)}
          </TabsContent>

          <TabsContent value="atrasadas" className="mt-4 space-y-2">
            {overdueTasks.length === 0 ? (
              <EmptyState icon={CheckSquare} title="Nenhuma tarefa atrasada" description="Parabéns, você está em dia!" />
            ) : overdueTasks.map((task) => <TaskCard key={task.id} task={task} onEdit={setEditTask} />)}
          </TabsContent>

          <TabsContent value="proximas" className="mt-4 space-y-2">
            {upcomingTasks.length === 0 ? (
              <EmptyState icon={CheckSquare} title="Nenhuma tarefa futura" description="Adicione tarefas com datas futuras."
                action={<CreateTaskDialog clients={clients} projects={projects} />}
              />
            ) : upcomingTasks.map((task) => <TaskCard key={task.id} task={task} onEdit={setEditTask} />)}
          </TabsContent>

          <TabsContent value="concluidas" className="mt-4 space-y-2">
            {completedTasks.length === 0 ? (
              <EmptyState icon={CheckSquare} title="Nenhuma tarefa concluída" />
            ) : completedTasks.map((task) => <TaskCard key={task.id} task={task} onEdit={setEditTask} />)}
          </TabsContent>
        </Tabs>
      )}

      <EditTaskDialog
        task={editTask}
        open={!!editTask}
        onOpenChange={(open) => !open && setEditTask(null)}
        clients={clients}
        projects={projects}
      />
    </div>
  )
}
