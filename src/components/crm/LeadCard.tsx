'use client'

import { useState } from 'react'
import { GripVertical, MoreHorizontal, Pencil, Trash2, UserPlus, CalendarClock, Building2, CheckCircle2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ConfirmDeleteDialog } from '@/components/shared/ConfirmDeleteDialog'
import { cn, formatCurrency, formatDate } from '@/lib/utils'
import type { Lead } from '@/types'

interface LeadCardProps {
  lead: Lead
  onEdit?: (lead: Lead) => void
  onConvert?: (lead: Lead) => void
  onDelete?: (leadId: string) => Promise<void>
  /** Card is the source being dragged (rendered as a dimmed placeholder). */
  dragging?: boolean
  /** Card is the floating preview following the pointer. */
  preview?: boolean
}

export function LeadCard({ lead, onEdit, onConvert, onDelete, dragging, preview }: LeadCardProps) {
  const [deleteOpen, setDeleteOpen] = useState(false)
  const converted = !!lead.client_id

  return (
    <>
      <div
        className={cn(
          'group/card relative flex flex-col gap-2 rounded-xl border bg-card p-3 shadow-sm',
          'transition-[box-shadow,transform,opacity] duration-200 will-change-transform',
          !preview && 'hover:-translate-y-0.5 hover:shadow-md hover:border-primary/30',
          dragging && 'opacity-40 scale-[0.98] shadow-none',
          preview && 'w-[var(--kanban-card-w,17rem)] rotate-[2deg] scale-[1.02] cursor-grabbing shadow-xl ring-1 ring-primary/20'
        )}
      >
        <div className="flex items-start gap-1.5">
          {/* Drag handle */}
          <button
            type="button"
            data-drag-handle
            aria-label="Arrastar lead"
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
              onClick={() => onEdit(lead)}
              aria-label={`Editar lead: ${lead.name}`}
              className="flex-1 min-w-0 text-left text-sm font-medium leading-snug break-words transition-colors hover:text-primary"
            >
              {lead.name}
            </button>
          ) : (
            <p className="flex-1 min-w-0 text-sm font-medium leading-snug break-words">{lead.name}</p>
          )}

          {!preview && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  data-no-drag
                  aria-label="Ações do lead"
                  className="shrink-0 rounded-md p-1 text-muted-foreground opacity-100 transition-all hover:bg-muted sm:opacity-0 sm:group-hover/card:opacity-100 focus-visible:opacity-100"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {onEdit && (
                  <DropdownMenuItem onClick={() => onEdit(lead)}>
                    <Pencil className="h-4 w-4" /> Editar
                  </DropdownMenuItem>
                )}
                {onConvert && !converted && (
                  <DropdownMenuItem onClick={() => onConvert(lead)}>
                    <UserPlus className="h-4 w-4" /> Converter em cliente
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onClick={() => setDeleteOpen(true)}>
                  <Trash2 className="h-4 w-4" /> Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {lead.company && (
          <p className="flex items-center gap-1 pl-1 text-xs text-muted-foreground">
            <Building2 className="h-3 w-3 shrink-0" />
            <span className="truncate">{lead.company}</span>
          </p>
        )}

        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 pl-1">
          {lead.value > 0 && (
            <span className="text-xs font-semibold tabular-nums text-foreground">{formatCurrency(lead.value)}</span>
          )}
          {lead.source && (
            <Badge variant="secondary" className="text-[10px]">{lead.source}</Badge>
          )}
          {lead.expected_close_date && (
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <CalendarClock className="h-3 w-3" />
              {formatDate(lead.expected_close_date)}
            </span>
          )}
          {converted && (
            <span className="flex items-center gap-1 text-[10px] font-medium text-success">
              <CheckCircle2 className="h-3 w-3" />
              {lead.client?.name ? `Cliente: ${lead.client.name}` : 'Convertido'}
            </span>
          )}
        </div>

        {lead.stage === 'lost' && lead.lost_reason && (
          <p className="pl-1 text-[11px] italic text-muted-foreground line-clamp-2">Perdido: {lead.lost_reason}</p>
        )}
      </div>

      {!preview && onDelete && (
        <ConfirmDeleteDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          title="Excluir lead"
          description={`Tem certeza que deseja excluir "${lead.name}"?`}
          onConfirm={() => onDelete(lead.id)}
        />
      )}
    </>
  )
}
