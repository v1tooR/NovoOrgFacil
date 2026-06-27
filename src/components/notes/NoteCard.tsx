'use client'

import { useState, useTransition } from 'react'
import { MoreHorizontal, Pencil, Trash2, Pin, PinOff } from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { ConfirmDeleteDialog } from '@/components/shared/ConfirmDeleteDialog'
import { deleteNote, toggleNotePin } from '@/actions/notes'
import { cn, formatDate } from '@/lib/utils'
import type { QuickNote } from '@/types'

interface NoteCardProps {
  note: QuickNote
  onEdit?: (note: QuickNote) => void
}

export function NoteCard({ note, onEdit }: NoteCardProps) {
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleTogglePin() {
    startTransition(() => {
      toggleNotePin(note.id, !note.is_pinned)
    })
  }

  return (
    <>
      <div className={cn(
        'group p-4 rounded-xl border bg-card hover:shadow-sm transition-all duration-150 space-y-2',
        note.is_pinned && 'border-primary/20 bg-primary/[0.02]',
        isPending && 'opacity-60'
      )}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            {note.is_pinned && <Pin className="h-3 w-3 text-primary shrink-0" />}
            <h3 className="font-semibold text-sm leading-snug truncate">{note.title}</h3>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="opacity-0 group-hover:opacity-100 focus:opacity-100 p-1 rounded-md hover:bg-muted transition-all shrink-0">
                <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={handleTogglePin}>
                {note.is_pinned ? <><PinOff className="h-4 w-4" /> Desafixar</> : <><Pin className="h-4 w-4" /> Fixar</>}
              </DropdownMenuItem>
              {onEdit && (
                <DropdownMenuItem onClick={() => onEdit(note)}>
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

        {note.content && (
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">{note.content}</p>
        )}

        <p className="text-[10px] text-muted-foreground/60">{formatDate(note.created_at, "dd/MM/yyyy 'às' HH:mm")}</p>
      </div>

      <ConfirmDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Excluir nota"
        description={`Tem certeza que deseja excluir "${note.title}"?`}
        onConfirm={async () => { await deleteNote(note.id) }}
      />
    </>
  )
}
