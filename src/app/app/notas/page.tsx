'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Archive, Pin, Plus, Search, StickyNote, X } from 'lucide-react'
import { PageTitle } from '@/components/shared/PageTitle'
import { NoteCard } from '@/components/notes/NoteCard'
import { CreateNoteDialog } from '@/components/notes/CreateNoteDialog'
import { EmptyState } from '@/components/shared/EmptyState'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { useAccountType } from '@/components/providers/AccountTypeProvider'
import { cn } from '@/lib/utils'
import type { QuickNote } from '@/types'

type NoteView = 'active' | 'pinned' | 'archived'

export default function NotasPage() {
  const [notes, setNotes] = useState<QuickNote[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [view, setView] = useState<NoteView>('active')
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [editNote, setEditNote] = useState<QuickNote | null>(null)
  const supabase = useMemo(() => createClient(), [])
  const { isFreelancer } = useAccountType()

  const loadNotes = useCallback(async () => {
    setLoading(true)
    const { data } = isFreelancer
      ? await supabase.from('quick_notes')
          .select('*, client:clients(id,name), project:projects(id,name)')
          .order('is_archived', { ascending: true })
          .order('is_pinned', { ascending: false })
          .order('updated_at', { ascending: false })
      : await supabase.from('quick_notes').select('*')
          .order('is_archived', { ascending: true })
          .order('is_pinned', { ascending: false })
          .order('updated_at', { ascending: false })

    setNotes((data ?? []) as QuickNote[])
    setLoading(false)
  }, [isFreelancer, supabase])

  useEffect(() => { loadNotes() }, [loadNotes])

  const activeNotes = notes.filter((note) => !note.is_archived)
  const archivedNotes = notes.filter((note) => note.is_archived)
  const pinnedCount = activeNotes.filter((note) => note.is_pinned).length

  const availableTags = useMemo(() => {
    const tags = new Map<string, string>()
    const source = view === 'archived' ? archivedNotes : activeNotes
    for (const note of source) {
      for (const tag of note.tags ?? []) tags.set(tag.toLocaleLowerCase('pt-BR'), tag)
    }
    return Array.from(tags.values()).sort((a, b) => a.localeCompare(b, 'pt-BR'))
  }, [activeNotes, archivedNotes, view])

  const filtered = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase('pt-BR')
    return notes.filter((note) => {
      if (view === 'active' && note.is_archived) return false
      if (view === 'pinned' && (note.is_archived || !note.is_pinned)) return false
      if (view === 'archived' && !note.is_archived) return false
      if (selectedTag && !(note.tags ?? []).some((tag) => tag.toLocaleLowerCase('pt-BR') === selectedTag.toLocaleLowerCase('pt-BR'))) return false
      if (!normalizedSearch) return true

      return note.title.toLocaleLowerCase('pt-BR').includes(normalizedSearch)
        || note.content?.toLocaleLowerCase('pt-BR').includes(normalizedSearch)
        || (note.tags ?? []).some((tag) => tag.toLocaleLowerCase('pt-BR').includes(normalizedSearch))
        || note.client?.name.toLocaleLowerCase('pt-BR').includes(normalizedSearch)
    })
  }, [notes, search, selectedTag, view])

  const pinned = view === 'active' ? filtered.filter((note) => note.is_pinned) : []
  const regular = view === 'active' ? filtered.filter((note) => !note.is_pinned) : filtered

  const filters: { value: NoteView; label: string; count: number; icon: typeof StickyNote }[] = [
    { value: 'active', label: 'Ativas', count: activeNotes.length, icon: StickyNote },
    { value: 'pinned', label: 'Fixadas', count: pinnedCount, icon: Pin },
    { value: 'archived', label: 'Arquivadas', count: archivedNotes.length, icon: Archive },
  ]

  function emptyContent() {
    if (search || selectedTag) {
      return <EmptyState icon={Search} title="Nenhuma nota encontrada" description="Tente remover algum filtro ou buscar por outro termo." />
    }
    if (view === 'pinned') {
      return <EmptyState icon={Pin} title="Nenhuma nota fixada" description="Fixe as notas que precisam permanecer em destaque." />
    }
    if (view === 'archived') {
      return <EmptyState icon={Archive} title="Arquivo vazio" description="Notas arquivadas ficam guardadas aqui sem atrapalhar seu espaço ativo." />
    }
    return <EmptyState icon={StickyNote} title="Nenhuma nota ainda" description="Capture uma ideia no campo acima. Você poderá organizá-la depois." />
  }

  return (
    <div className="animate-fade-in space-y-6">
      <PageTitle
        title="Notas"
        description="Capture rápido, organize depois e mantenha o que importa em foco."
      />

      <button
        type="button"
        onClick={() => setCreateOpen(true)}
        className="group flex w-full items-center gap-3 rounded-xl border bg-card p-3 text-left transition-all hover:border-foreground/40 hover:shadow-sm sm:p-4"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-foreground text-background">
          <StickyNote className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium">Escreva uma ideia...</span>
          <span className="hidden text-xs text-muted-foreground sm:block">O título é opcional e seu rascunho fica salvo neste dispositivo.</span>
        </span>
        <span className="flex shrink-0 items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors group-hover:bg-foreground group-hover:text-background">
          <Plus className="h-3.5 w-3.5" />Nova nota
        </span>
      </button>

      {!loading && notes.length > 0 && (
        <div className="space-y-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="grid grid-cols-3 rounded-lg border bg-muted p-1 sm:flex sm:w-fit">
              {filters.map((filter) => {
                const Icon = filter.icon
                return (
                  <button
                    key={filter.value}
                    type="button"
                    onClick={() => { setView(filter.value); setSelectedTag(null) }}
                    className={cn(
                      'flex items-center justify-center gap-1.5 rounded-md px-2 py-2 text-[11px] font-medium transition-colors sm:px-3 sm:text-xs',
                      view === filter.value ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{filter.label}</span>
                    <span className={cn('rounded px-1 text-[9px]', view === filter.value ? 'bg-background/20' : 'bg-background')}>{filter.count}</span>
                  </button>
                )
              })}
            </div>

            <div className="relative w-full lg:max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por texto, tag ou cliente..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="pl-9 pr-9"
              />
              {search && (
                <button type="button" onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label="Limpar busca">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {availableTags.length > 0 && (
            <div className="flex max-w-full gap-2 overflow-x-auto pb-1">
              {selectedTag && (
                <button type="button" onClick={() => setSelectedTag(null)} className="flex shrink-0 items-center gap-1 rounded-full border bg-foreground px-2.5 py-1 text-[11px] text-background">
                  #{selectedTag}<X className="h-3 w-3" />
                </button>
              )}
              {availableTags.filter((tag) => tag !== selectedTag).map((tag) => (
                <button key={tag} type="button" onClick={() => setSelectedTag(tag)} className="shrink-0 rounded-full border bg-card px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground">
                  #{tag}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-40 w-full rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? emptyContent() : (
        <div className="space-y-7">
          {pinned.length > 0 && (
            <section>
              <div className="mb-3 flex items-center gap-2">
                <Pin className="h-3.5 w-3.5" />
                <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Em foco</h2>
              </div>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {pinned.map((note) => <NoteCard key={note.id} note={note} onEdit={setEditNote} onChanged={loadNotes} />)}
              </div>
            </section>
          )}

          {regular.length > 0 && (
            <section>
              {pinned.length > 0 && <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Demais notas</h2>}
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {regular.map((note) => <NoteCard key={note.id} note={note} onEdit={setEditNote} onChanged={loadNotes} />)}
              </div>
            </section>
          )}
        </div>
      )}

      <CreateNoteDialog open={createOpen} onOpenChange={setCreateOpen} onSaved={loadNotes} />
      <CreateNoteDialog
        editNote={editNote}
        open={Boolean(editNote)}
        onOpenChange={(nextOpen) => !nextOpen && setEditNote(null)}
        onSaved={loadNotes}
      />
    </div>
  )
}
