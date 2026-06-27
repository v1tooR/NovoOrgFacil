'use client'

import { useState } from 'react'
import { MoreHorizontal, Pencil, Trash2, CalendarDays, User } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { ConfirmDeleteDialog } from '@/components/shared/ConfirmDeleteDialog'
import { deleteProject } from '@/actions/projects'
import { cn, formatDate, PROJECT_STATUS_LABELS } from '@/lib/utils'
import type { Project } from '@/types'

const statusVariants: Record<string, 'planning' | 'in_progress' | 'waiting_client' | 'completed' | 'paused'> = {
  planning: 'planning',
  in_progress: 'in_progress',
  waiting_client: 'waiting_client',
  completed: 'completed',
  paused: 'paused',
}

interface ProjectCardProps {
  project: Project
  onEdit?: (project: Project) => void
}

export function ProjectCard({ project, onEdit }: ProjectCardProps) {
  const [deleteOpen, setDeleteOpen] = useState(false)

  return (
    <>
      <div className="group p-4 rounded-xl border bg-card hover:shadow-sm transition-all duration-150 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm leading-snug truncate">{project.name}</h3>
            {project.client && (
              <div className="flex items-center gap-1 mt-0.5">
                <User className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground truncate">{project.client.name}</span>
              </div>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="opacity-0 group-hover:opacity-100 focus:opacity-100 p-1 rounded-md hover:bg-muted transition-all">
                <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              {onEdit && (
                <DropdownMenuItem onClick={() => onEdit(project)}>
                  <Pencil className="h-4 w-4" /> Editar
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeleteOpen(true)}>
                <Trash2 className="h-4 w-4" /> Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {project.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">{project.description}</p>
        )}

        <div className="flex items-center justify-between">
          <Badge variant={statusVariants[project.status] as any}>{PROJECT_STATUS_LABELS[project.status]}</Badge>
          {project.deadline && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <CalendarDays className="h-3 w-3" />
              {formatDate(project.deadline)}
            </div>
          )}
        </div>
      </div>

      <ConfirmDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Excluir projeto"
        description={`Tem certeza que deseja excluir "${project.name}"?`}
        onConfirm={async () => { await deleteProject(project.id) }}
      />
    </>
  )
}
