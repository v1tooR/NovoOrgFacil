import { createClient } from '@/lib/supabase/server'
import { FolderKanban } from 'lucide-react'
import { PageTitle } from '@/components/shared/PageTitle'
import { ProjectCard } from '@/components/projects/ProjectCard'
import { CreateProjectDialog } from '@/components/projects/CreateProjectDialog'
import { EmptyState } from '@/components/shared/EmptyState'
import type { Client, Project } from '@/types'

export default async function ProjetosPage() {
  const supabase = createClient()

  const [{ data: projects }, { data: clients }] = await Promise.all([
    supabase.from('projects').select('*, client:clients(id,name)').order('created_at', { ascending: false }),
    supabase.from('clients').select('*').order('name'),
  ])

  const active = (projects ?? []).filter((p: Project) => ['planning', 'in_progress', 'waiting_client'].includes(p.status))
  const done = (projects ?? []).filter((p: Project) => ['completed', 'paused'].includes(p.status))

  return (
    <div className="space-y-6 animate-fade-in">
      <PageTitle
        title="Projetos"
        description="Gerencie seus projetos e acompanhe o progresso."
        action={<CreateProjectDialog clients={clients as Client[] ?? []} />}
      />

      {(projects?.length ?? 0) === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="Nenhum projeto ainda"
          description="Crie seu primeiro projeto para começar a organizar seu trabalho."
          action={<CreateProjectDialog clients={clients as Client[] ?? []} />}
        />
      ) : (
        <div className="space-y-6">
          {active.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">Em andamento</h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {active.map((project) => <ProjectCard key={project.id} project={project as Project} />)}
              </div>
            </section>
          )}
          {done.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">Concluídos / Pausados</h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 opacity-70">
                {done.map((project) => <ProjectCard key={project.id} project={project as Project} />)}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
