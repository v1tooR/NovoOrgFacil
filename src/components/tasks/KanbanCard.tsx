'use client'

import { useState } from 'react'
import { GripVertical, MoreHorizontal, Pencil, Trash2, CalendarDays, Clock, FolderKanban } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ConfirmDeleteDialog } from '@/components/shared/ConfirmDeleteDialog'
import { deleteTask } from '@/actions/tasks'
import { cn, formatDate, isOverdue, TASK_PRIORITY_LABELS } from '@/lib/utils'
import type { Task } from '@/types'

const priorityVariants = {
  low: 'low' as const,
  medium: 'medium' as const,
  high: 'high' as const,
}

interface KanbanCardProps {
  task: Task
  onEdit?: (task: Task) => void
  /** Optimistic delete owned by the page; falls back to a direct call when omitted. */
  onDelete?: (taskId: string) => Promise<void>
  /** Card is the source being dragged (rendered as a dimmed placeholder). */
  dragging?: boolean
  /** Card is the floating preview following the pointer. */
  preview?: boolean
}

export function KanbanCard({ task, onEdit, onDelete, dragging, preview }: KanbanCardProps) {
  const [deleteOpen, setDeleteOpen] = useState(false)
  const completed = task.status === 'completed'
  const overdue = !completed && isOverdue(task.due_date)

  return (
    <>
      <div
        className={cn(
          'group/card relative flex flex-col gap-2 rounded-xl border bg-card p-3 shadow-sm',
          'transition-[box-shadow,transform,opacity] duration-200 will-change-transform',
          !preview && 'hover:-translate-y-0.5 hover:shadow-md hover:border-primary/30',
          completed && 'opacity-70',
          dragging && 'opacity-40 scale-[0.98] shadow-none',
          preview && 'w-[var(--kanban-card-w,17rem)] rotate-[2deg] scale-[1.02] cursor-grabbing shadow-xl ring-1 ring-primary/20'
        )}
      >
        {/* Priority accent bar */}
        <span
          className={cn(
            'absolute left-0 top-3 bottom-3 w-1 rounded-full',
            task.priority === 'high' && 'bg-foreground',
            task.priority === 'medium' && 'bg-foreground/55',
            task.priority === 'low' && 'bg-foreground/20'
          )}
          aria-hidden
        />

        <div className="flex items-start gap-1.5 pl-2">
          {/* Drag handle */}
          <button
            type="button"
            data-drag-handle
            aria-label="Arrastar tarefa"
            className={cn(
              'mt-0.5 -ml-1 shrink-0 rounded-md p-0.5 text-muted-foreground/40 touch-none',
              'cursor-grab hover:text-muted-foreground hover:bg-muted transition-colors',
              'opacity-0 group-hover/card:opacity-100 focus-visible:opacity-100',
              preview && 'opacity-100 cursor-grabbing'
            )}
            tabIndex={preview ? -1 : 0}
          >
            <GripVertical className="h-4 w-4" />
          </button>

          {onEdit && !preview ? (
            <button
              type="button"
              data-no-drag
              onClick={() => onEdit(task)}
              aria-label={`Editar tarefa: ${task.title}`}
              className={cn(
                'flex-1 min-w-0 text-left text-sm font-medium leading-snug break-words transition-colors hover:text-primary',
                completed && 'line-through text-muted-foreground'
              )}
            >
              {task.title}
            </button>
          ) : (
            <p className={cn('flex-1 min-w-0 text-sm font-medium leading-snug break-words', completed && 'line-through text-muted-foreground')}>
              {task.title}
            </p>
          )}

          {!preview && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  data-no-drag
                  aria-label="Ações da tarefa"
                  className="shrink-0 rounded-md p-1 text-muted-foreground opacity-100 transition-all hover:bg-muted sm:opacity-0 sm:group-hover/card:opacity-100 focus-visible:opacity-100"
                >
                  <MoreHorizontal className="h-4 w-4" />
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
          )}
        </div>

        {task.description && (
          <p className="pl-2 text-xs text-muted-foreground line-clamp-2">{task.description}</p>
        )}

        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 pl-2">
          <Badge variant={priorityVariants[task.priority]} className="text-[10px]">
            {TASK_PRIORITY_LABELS[task.priority]}
          </Badge>
          {task.due_date && (
            <span className={cn('flex items-center gap-1 text-[10px]', overdue ? 'font-medium text-destructive' : 'text-muted-foreground')}>
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
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground truncate max-w-[120px]">
              <FolderKanban className="h-3 w-3 shrink-0" />
              {task.project.name}
            </span>
          )}
        </div>
      </div>

      {!preview && (
        <ConfirmDeleteDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          title="Excluir tarefa"
          description={`Tem certeza que deseja excluir "${task.title}"?`}
          onConfirm={onDelete ? () => onDelete(task.id) : async () => { await deleteTask(task.id) }}
        />
      )}
    </>
  )
}
