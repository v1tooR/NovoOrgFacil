'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Archive, ArchiveRestore, MoreHorizontal, Pencil, Pin, PinOff, Trash2 } from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { ConfirmDeleteDialog } from '@/components/shared/ConfirmDeleteDialog'
import { deleteNote, toggleNoteArchive, toggleNotePin } from '@/actions/notes'
import { useToast } from '@/components/ui/use-toast'
import { cn, formatDateRelative } from '@/lib/utils'
import type { NoteColor, QuickNote } from '@/types'

interface NoteCardProps {
  note: QuickNote
  onEdit?: (note: QuickNote) => void
  onChanged?: () => void | Promise<void>
}

const COLOR_STYLES: Record<NoteColor, string> = {
  default: 'border-amber-200/80 bg-[#fffbea] dark:border-amber-900/50 dark:bg-[#29271d]',
  yellow: 'border-amber-300/80 bg-amber-100/90 dark:border-amber-800/60 dark:bg-amber-950/55',
  blue: 'border-blue-300/80 bg-blue-100/80 dark:border-blue-800/60 dark:bg-blue-950/50',
  green: 'border-emerald-300/80 bg-emerald-100/80 dark:border-emerald-800/60 dark:bg-emerald-950/50',
  rose: 'border-rose-300/80 bg-rose-100/80 dark:border-rose-800/60 dark:bg-rose-950/50',
  purple: 'border-violet-300/80 bg-violet-100/80 dark:border-violet-800/60 dark:bg-violet-950/50',
}

const ROTATION_STYLES = ['-rotate-[0.35deg]', 'rotate-[0.25deg]', '-rotate-[0.15deg]']

export function NoteCard({ note, onEdit, onChanged }: NoteCardProps) {
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const { toast } = useToast()
  const router = useRouter()
  const color = note.note_color ?? 'default'
  const rotation = ROTATION_STYLES[note.id.charCodeAt(note.id.length - 1) % ROTATION_STYLES.length]

  async function refreshNoteList() {
    if (onChanged) await onChanged()
    else router.refresh()
  }

  async function handleTogglePin() {
    if (busy) return
    setBusy(true)
    const result = await toggleNotePin(note.id, !note.is_pinned)
    setBusy(false)

    if (result.error) {
      toast({ title: 'Erro', description: result.error, variant: 'destructive' })
      return
    }
    await refreshNoteList()
  }

  async function handleArchive() {
    if (busy) return
    setBusy(true)
    const result = await toggleNoteArchive(note.id, !note.is_archived)
    setBusy(false)

    if (result.error) {
      toast({ title: 'Erro', description: result.error, variant: 'destructive' })
      return
    }
    toast({ title: note.is_archived ? 'Nota restaurada' : 'Nota arquivada' })
    await refreshNoteList()
  }

  return (
    <>
      <article
        className={cn(
          'group relative isolate flex h-full min-h-[170px] flex-col overflow-visible rounded-[10px] border p-4 pt-5 shadow-[3px_5px_0_hsl(var(--foreground)/0.08)] transition-all duration-200 hover:z-10 hover:-translate-y-1 hover:rotate-0 hover:shadow-[5px_8px_0_hsl(var(--foreground)/0.10)]',
          COLOR_STYLES[color],
          rotation,
          note.is_pinned && 'border-primary/30',
          note.is_archived && 'opacity-75',
          busy && 'pointer-events-none opacity-60',
          onEdit && 'cursor-pointer'
        )}
        onClick={() => onEdit?.(note)}
      >
        {/* Fita translúcida: dá a sensação de papel colado sem fugir do visual do app. */}
        <span
          aria-hidden="true"
          className="absolute -top-2 left-1/2 z-10 h-4 w-16 -translate-x-1/2 rotate-[0.7deg] border-x border-white/50 bg-background/65 shadow-sm backdrop-blur-[1px] dark:border-white/10 dark:bg-background/55"
        />

        <div className="relative z-[1] flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-start gap-1.5">
            {note.is_pinned && <Pin className="mt-0.5 h-3.5 w-3.5 shrink-0 fill-current text-primary" />}
            <h3 className="line-clamp-2 text-sm font-semibold leading-snug">{note.title}</h3>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="shrink-0 rounded-md p-1 transition-all hover:bg-black/[0.06] dark:hover:bg-white/[0.08] sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100"
                onClick={(event) => event.stopPropagation()}
                aria-label="Opções da nota"
              >
                <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44" onClick={(event) => event.stopPropagation()}>
              {!note.is_archived && (
                <DropdownMenuItem onClick={handleTogglePin}>
                  {note.is_pinned
                    ? <><PinOff className="h-4 w-4" />Desafixar</>
                    : <><Pin className="h-4 w-4" />Fixar</>}
                </DropdownMenuItem>
              )}
              {onEdit && (
                <DropdownMenuItem onClick={() => onEdit(note)}>
                  <Pencil className="h-4 w-4" />Editar
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={handleArchive}>
                {note.is_archived
                  ? <><ArchiveRestore className="h-4 w-4" />Restaurar</>
                  : <><Archive className="h-4 w-4" />Arquivar</>}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={() => setDeleteOpen(true)}>
                <Trash2 className="h-4 w-4" />Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {note.content && (
          <p className="relative z-[1] mt-2 line-clamp-4 whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">{note.content}</p>
        )}

        {(note.tags?.length ?? 0) > 0 && (
          <div className="relative z-[1] mt-3 flex flex-wrap gap-1.5">
            {note.tags.slice(0, 4).map((tag) => (
              <span key={tag} className="rounded-full border border-foreground/15 bg-white/45 px-2 py-0.5 text-[10px] text-muted-foreground dark:bg-black/20">#{tag}</span>
            ))}
            {note.tags.length > 4 && <span className="px-1 py-0.5 text-[10px] text-muted-foreground">+{note.tags.length - 4}</span>}
          </div>
        )}

        <div className="relative z-[1] mt-auto flex items-center justify-between gap-2 pt-4 text-[10px] text-muted-foreground/70">
          <span>Atualizada {formatDateRelative(note.updated_at).toLocaleLowerCase('pt-BR')}</span>
          {note.client && <span className="max-w-[45%] truncate">{note.client.name}</span>}
        </div>

        {/* Pequena dobra no canto inferior, como uma folha de post-it. */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute bottom-0 right-0 h-5 w-5 rounded-br-[9px] bg-foreground/[0.08] [clip-path:polygon(100%_0,100%_100%,0_100%)] dark:bg-white/[0.08]"
        />
      </article>

      <ConfirmDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Excluir nota"
        description={`Tem certeza que deseja excluir "${note.title}"?`}
        onConfirm={async () => {
          const result = await deleteNote(note.id)
          if (result.error) {
            toast({ title: 'Erro', description: result.error, variant: 'destructive' })
            return
          }
          await refreshNoteList()
        }}
      />
    </>
  )
}
