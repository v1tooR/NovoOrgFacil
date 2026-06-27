'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { StickyNote, Search } from 'lucide-react'
import { PageTitle } from '@/components/shared/PageTitle'
import { NoteCard } from '@/components/notes/NoteCard'
import { CreateNoteDialog } from '@/components/notes/CreateNoteDialog'
import { EmptyState } from '@/components/shared/EmptyState'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import type { QuickNote } from '@/types'

export default function NotasPage() {
  const [notes, setNotes] = useState<QuickNote[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [editNote, setEditNote] = useState<QuickNote | null>(null)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('quick_notes').select('*, client:clients(id,name), project:projects(id,name)')
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false })
      setNotes((data ?? []) as QuickNote[])
      setLoading(false)
    }
    load()
  }, [])

  const filtered = notes.filter((n) =>
    n.title.toLowerCase().includes(search.toLowerCase()) ||
    n.content?.toLowerCase().includes(search.toLowerCase())
  )

  const pinned = filtered.filter((n) => n.is_pinned)
  const unpinned = filtered.filter((n) => !n.is_pinned)

  return (
    <div className="space-y-6 animate-fade-in">
      <PageTitle
        title="Notas rápidas"
        description="Capture ideias e anotações importantes."
        action={<CreateNoteDialog />}
      />

      {!loading && notes.length > 0 && (
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar notas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      )}

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}
        </div>
      ) : notes.length === 0 ? (
        <EmptyState
          icon={StickyNote}
          title="Nenhuma nota ainda"
          description="Capture suas ideias e anotações importantes de forma rápida."
          action={<CreateNoteDialog />}
        />
      ) : (
        <div className="space-y-6">
          {pinned.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Fixadas</h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {pinned.map((note) => <NoteCard key={note.id} note={note} onEdit={setEditNote} />)}
              </div>
            </section>
          )}
          {unpinned.length > 0 && (
            <section>
              {pinned.length > 0 && <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Outras notas</h2>}
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {unpinned.map((note) => <NoteCard key={note.id} note={note} onEdit={setEditNote} />)}
              </div>
            </section>
          )}
          {filtered.length === 0 && search && (
            <EmptyState icon={StickyNote} title="Nenhuma nota encontrada" description="Tente buscar por outro termo." />
          )}
        </div>
      )}

      <CreateNoteDialog
        editNote={editNote}
        open={!!editNote}
        onOpenChange={(open) => !open && setEditNote(null)}
      />
    </div>
  )
}
