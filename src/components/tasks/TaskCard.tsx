'use client'

import { useState, useTransition } from 'react'
import { MoreHorizontal, Pencil, Trash2, CalendarDays, Clock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ConfirmDeleteDialog } from '@/components/shared/ConfirmDeleteDialog'
import { toggleTaskStatus, deleteTask } from '@/actions/tasks'
import { cn, formatDate, TASK_PRIORITY_LABELS } from '@/lib/utils'
import type { Task, TaskStatus } from '@/types'

const priorityVariants = {
  low: 'low' as const,
  medium: 'medium' as const,
  high: 'high' as const,
}

interface TaskCardProps {
  task: Task
  onEdit?: (task: Task) => void
  /** Optimistic status handler owned by the page. Falls back to a direct call when omitted. */
  onStatusChange?: (taskId: string, status: TaskStatus) => void
  /** Optimistic delete owned by the page. Falls back to a direct call when omitted. */
  onDelete?: (taskId: string) => Promise<void>
}

export function TaskCard({ task, onEdit, onStatusChange, onDelete }: TaskCardProps) {
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const completed = task.status === 'completed'

  function handleToggle(checked: boolean) {
    if (onStatusChange) {
      onStatusChange(task.id, checked ? 'completed' : 'pending')
      return
    }
    startTransition(() => {
      toggleTaskStatus(task.id, checked)
    })
  }

  async function handleDelete() {
    if (onDelete) return onDelete(task.id)
    await deleteTask(task.id)
  }

  return (
    <>
      <div className={cn(
        'group relative flex items-start gap-3 p-3.5 pl-4 rounded-xl border bg-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-primary/30',
        completed && 'opacity-60',
        isPending && 'opacity-50 pointer-events-none'
      )}>
        <span
          className={cn(
            'absolute left-0 top-3 bottom-3 w-1 rounded-full transition-colors',
            task.priority === 'high' && 'bg-foreground',
            task.priority === 'medium' && 'bg-foreground/55',
            task.priority === 'low' && 'bg-foreground/20',
            completed && 'bg-foreground/35'
          )}
          aria-hidden
        />
        <Checkbox
          checked={completed}
          onCheckedChange={handleToggle}
          className="mt-0.5 shrink-0"
          aria-label="Marcar como concluída"
        />

        <button
          type="button"
          onClick={() => onEdit?.(task)}
          disabled={!onEdit}
          aria-label={onEdit ? `Editar tarefa: ${task.title}` : undefined}
          className={cn('flex-1 min-w-0 text-left', onEdit && 'cursor-pointer')}
        >
          <p className={cn('text-sm font-medium leading-snug', onEdit && 'group-hover:text-primary transition-colors', completed && 'line-through text-muted-foreground')}>
            {task.title}
          </p>
          {task.description && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{task.description}</p>
          )}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <Badge variant={priorityVariants[task.priority]} className="text-[10px]">
              {TASK_PRIORITY_LABELS[task.priority]}
            </Badge>
            {task.due_date && (
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <CalendarDays className="h-3 w-3" />
                {formatDate(task.due_date)}
              </span>
            )}
            {task.due_time && (
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Clock className="h-3 w-3" />
                {task.due_time.slice(0, 5)}
              </span>
            )}
            {task.project && (
              <span className="text-[10px] text-muted-foreground truncate max-w-[100px]">
                {task.project.name}
              </span>
            )}
          </div>
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              aria-label="Ações da tarefa"
              className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 p-1 rounded-md hover:bg-muted transition-all shrink-0"
            >
              <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            {onEdit && (
              <DropdownMenuItem onClick={() => onEdit(task)}>
                <Pencil className="h-4 w-4" /> Editar
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="h-4 w-4" /> Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <ConfirmDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Excluir tarefa"
        description={`Tem certeza que deseja excluir "${task.title}"?`}
        onConfirm={handleDelete}
      />
    </>
  )
}
