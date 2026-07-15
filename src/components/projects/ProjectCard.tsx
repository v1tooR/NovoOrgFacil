'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MoreHorizontal, Pencil, Trash2, CalendarDays, User, ListChecks, CheckSquare } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { ConfirmDeleteDialog } from '@/components/shared/ConfirmDeleteDialog'
import { CreateProjectDialog } from './CreateProjectDialog'
import { ProjectDetailSheet } from './ProjectDetailSheet'
import { deleteProject } from '@/actions/projects'
import { cn, formatDate, PROJECT_STATUS_LABELS } from '@/lib/utils'
import type { Client, Project } from '@/types'

const statusVariants: Record<string, 'planning' | 'in_progress' | 'waiting_client' | 'completed' | 'paused'> = {
  planning: 'planning',
  in_progress: 'in_progress',
  waiting_client: 'waiting_client',
  completed: 'completed',
  paused: 'paused',
}

interface ProjectCardProps {
  project: Project
  clients?: Client[]
  taskStats?: { total: number; done: number }
}

export function ProjectCard({ project, clients = [], taskStats }: ProjectCardProps) {
  const router = useRouter()
  const [detailOpen, setDetailOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const phases = project.phases ?? []
  const phasesDone = phases.filter((p) => p.done).length

  // At-a-glance progress: phases first, then linked tasks.
  const progress = phases.length > 0
    ? { pct: Math.round((phasesDone / phases.length) * 100), label: `${phasesDone}/${phases.length} fases`, icon: ListChecks }
    : taskStats && taskStats.total > 0
      ? { pct: Math.round((taskStats.done / taskStats.total) * 100), label: `${taskStats.done}/${taskStats.total} tarefas`, icon: CheckSquare }
      : null

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={() => setDetailOpen(true)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setDetailOpen(true) } }}
        className="group cursor-pointer space-y-3 rounded-xl border bg-card p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-semibold leading-snug">{project.name}</h3>
            {project.client && (
              <div className="mt-0.5 flex items-center gap-1">
                <User className="h-3 w-3 text-muted-foreground" />
                <span className="truncate text-xs text-muted-foreground">{project.client.name}</span>
              </div>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                onClick={(e) => e.stopPropagation()}
                aria-label="Ações do projeto"
                className="rounded-md p-1 text-muted-foreground opacity-0 transition-all hover:bg-muted focus:opacity-100 group-hover:opacity-100"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuItem onClick={() => setEditOpen(true)}>
                <Pencil className="h-4 w-4" /> Editar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={() => setDeleteOpen(true)}>
                <Trash2 className="h-4 w-4" /> Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {project.description && (
          <p className="line-clamp-2 text-xs text-muted-foreground">{project.description}</p>
        )}

        {progress && (
          <div>
            <div className="mb-1 flex items-center justify-between text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1"><progress.icon className="h-3 w-3" /> {progress.label}</span>
              <span className="font-medium tabular-nums">{progress.pct}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out" style={{ width: `${progress.pct}%` }} />
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          <Badge variant={statusVariants[project.status]}>{PROJECT_STATUS_LABELS[project.status]}</Badge>
          {project.deadline && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <CalendarDays className="h-3 w-3" />
              {formatDate(project.deadline)}
            </div>
          )}
        </div>
      </div>

      <ProjectDetailSheet
        project={project}
        clients={clients}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />

      <CreateProjectDialog
        clients={clients}
        editProject={project}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSuccess={() => router.refresh()}
      />

      <ConfirmDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Excluir projeto"
        description={`Tem certeza que deseja excluir "${project.name}"?`}
        onConfirm={async () => { await deleteProject(project.id); router.refresh() }}
      />
    </>
  )
}
