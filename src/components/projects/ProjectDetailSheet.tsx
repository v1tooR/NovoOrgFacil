'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  User, CalendarDays, Plus, Trash2, Pencil, ChevronDown,
  ListChecks, CheckSquare, StickyNote, Wallet, Check,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Sheet, SheetContent, SheetTitle, SheetDescription,
} from '@/components/ui/sheet'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ConfirmDeleteDialog } from '@/components/shared/ConfirmDeleteDialog'
import { CreateProjectDialog } from './CreateProjectDialog'
import { ProjectPhases } from './ProjectPhases'
import { useToast } from '@/components/ui/use-toast'
import {
  updateProjectPhases, updateProjectStatus, deleteProject,
} from '@/actions/projects'
import { createTask, toggleTaskStatus } from '@/actions/tasks'
import { createNote, deleteNote } from '@/actions/notes'
import {
  cn, formatCurrency, formatDate, PROJECT_STATUS_LABELS,
} from '@/lib/utils'
import type {
  Project, ProjectPhase, ProjectStatus, Task, QuickNote, FinancialEntry, Client,
} from '@/types'

const STATUS_ORDER: ProjectStatus[] = ['planning', 'in_progress', 'waiting_client', 'completed', 'paused']
const statusDot: Record<ProjectStatus, string> = {
  planning: 'bg-foreground/20',
  in_progress: 'bg-foreground/50',
  waiting_client: 'bg-foreground/70',
  completed: 'bg-foreground',
  paused: 'border border-foreground/50 bg-background',
}

function daysUntil(dateStr: string): number {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const target = new Date(dateStr); target.setHours(0, 0, 0, 0)
  return Math.round((target.getTime() - today.getTime()) / 86_400_000)
}

function deadlineLabel(dateStr: string): { text: string; tone: 'ok' | 'warn' | 'over' } {
  const d = daysUntil(dateStr)
  if (d < 0) return { text: `Atrasado há ${Math.abs(d)} dia${Math.abs(d) > 1 ? 's' : ''}`, tone: 'over' }
  if (d === 0) return { text: 'Vence hoje', tone: 'warn' }
  if (d === 1) return { text: 'Vence amanhã', tone: 'warn' }
  if (d <= 7) return { text: `Faltam ${d} dias`, tone: 'warn' }
  return { text: `Faltam ${d} dias`, tone: 'ok' }
}

/** Circular progress indicator (SVG). */
function ProgressRing({ value }: { value: number }) {
  const r = 30
  const c = 2 * Math.PI * r
  const offset = c - (value / 100) * c
  return (
    <div className="relative h-[76px] w-[76px] shrink-0">
      <svg viewBox="0 0 76 76" className="h-full w-full -rotate-90">
        <circle cx="38" cy="38" r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth="7" />
        <circle
          cx="38" cy="38" r={r} fill="none" stroke="hsl(var(--primary))" strokeWidth="7"
          strokeLinecap="round" strokeDasharray={c} strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-500 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-lg font-bold tabular-nums">{value}<span className="text-[11px] font-medium text-muted-foreground">%</span></span>
      </div>
    </div>
  )
}

function StatTile({ icon: Icon, label, value, accent }: { icon: typeof ListChecks; label: string; value: string; accent?: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl border bg-card p-2.5">
      <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', accent ?? 'bg-muted text-muted-foreground')}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold leading-tight tabular-nums">{value}</p>
        <p className="truncate text-[11px] text-muted-foreground">{label}</p>
      </div>
    </div>
  )
}

function SectionHeader({ icon: Icon, title, right }: { icon: typeof ListChecks; title: string; right?: React.ReactNode }) {
  return (
    <div className="mb-2.5 flex items-center gap-2">
      <Icon className="h-4 w-4 text-primary" />
      <h3 className="text-sm font-semibold">{title}</h3>
      {right && <div className="ml-auto">{right}</div>}
    </div>
  )
}

interface ProjectDetailSheetProps {
  project: Project
  clients: Client[]
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ProjectDetailSheet({ project, clients, open, onOpenChange }: ProjectDetailSheetProps) {
  const router = useRouter()
  const { toast } = useToast()

  const [status, setStatus] = useState<ProjectStatus>(project.status)
  const [phases, setPhases] = useState<ProjectPhase[]>(project.phases ?? [])
  const [tasks, setTasks] = useState<Task[]>([])
  const [notes, setNotes] = useState<QuickNote[]>([])
  const [entries, setEntries] = useState<FinancialEntry[]>([])
  const [loading, setLoading] = useState(true)

  const [newTask, setNewTask] = useState('')
  const [addingNote, setAddingNote] = useState(false)
  const [noteTitle, setNoteTitle] = useState('')
  const [noteContent, setNoteContent] = useState('')

  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const dirtyRef = useRef(false)

  // Load related data whenever the sheet opens for a project.
  useEffect(() => {
    if (!open) return
    setStatus(project.status)
    setPhases(project.phases ?? [])
    dirtyRef.current = false
    let active = true
    setLoading(true)
    ;(async () => {
      const supabase = createClient()
      const [{ data: t }, { data: n }, { data: e }] = await Promise.all([
        supabase.from('tasks').select('*').eq('project_id', project.id).order('due_date', { ascending: true }),
        supabase.from('quick_notes').select('*').eq('project_id', project.id).order('created_at', { ascending: false }),
        supabase.from('financial_entries').select('*').eq('project_id', project.id),
      ])
      if (!active) return
      setTasks((t ?? []) as Task[])
      setNotes((n ?? []) as QuickNote[])
      setEntries((e ?? []) as FinancialEntry[])
      setLoading(false)
    })()
    return () => { active = false }
  }, [open, project.id, project.status, project.phases])

  // Refresh the underlying server list when closing if anything changed.
  function handleOpenChange(next: boolean) {
    if (!next && dirtyRef.current) router.refresh()
    onOpenChange(next)
  }

  const phasesDone = phases.filter((p) => p.done).length
  const tasksDone = tasks.filter((t) => t.status === 'completed').length
  const finance = useMemo(() => {
    let income = 0, expense = 0
    for (const e of entries) {
      if (e.type === 'income') income += Number(e.amount)
      else expense += Number(e.amount)
    }
    return { income, expense, balance: income - expense }
  }, [entries])

  const overall = phases.length > 0
    ? Math.round((phasesDone / phases.length) * 100)
    : tasks.length > 0
      ? Math.round((tasksDone / tasks.length) * 100)
      : status === 'completed' ? 100 : 0

  // ---- Phases ----
  const persistPhases = useCallback(async (next: ProjectPhase[], prev: ProjectPhase[]) => {
    dirtyRef.current = true
    const res = await updateProjectPhases(project.id, next)
    if (res?.error) {
      setPhases(prev)
      toast({ title: 'Erro', description: res.error, variant: 'destructive' })
    }
  }, [project.id, toast])

  function addPhase(title: string) {
    const prev = phases
    const next = [...phases, { id: crypto.randomUUID(), title, done: false }]
    setPhases(next)
    persistPhases(next, prev)
  }
  function togglePhase(id: string) {
    const prev = phases
    const next = phases.map((p) => (p.id === id ? { ...p, done: !p.done } : p))
    setPhases(next)
    persistPhases(next, prev)
  }
  function removePhase(id: string) {
    const prev = phases
    const next = phases.filter((p) => p.id !== id)
    setPhases(next)
    persistPhases(next, prev)
  }
  function reorderPhases(next: ProjectPhase[]) {
    const prev = phases
    setPhases(next)
    persistPhases(next, prev)
  }
  function applyTemplate(titles: string[]) {
    const prev = phases
    const additions = titles.map((title) => ({ id: crypto.randomUUID(), title, done: false }))
    const next = [...phases, ...additions]
    setPhases(next)
    persistPhases(next, prev)
  }

  // ---- Status ----
  async function changeStatus(s: ProjectStatus) {
    if (s === status) return
    const prev = status
    setStatus(s); dirtyRef.current = true
    const res = await updateProjectStatus(project.id, s)
    if (res?.error) {
      setStatus(prev)
      toast({ title: 'Erro', description: res.error, variant: 'destructive' })
    }
  }

  // ---- Tasks ----
  async function toggleTask(task: Task) {
    const completed = task.status !== 'completed'
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: completed ? 'completed' : 'pending' } : t)))
    dirtyRef.current = true
    await toggleTaskStatus(task.id, completed)
  }
  async function addTask() {
    const title = newTask.trim()
    if (!title) return
    setNewTask('')
    const res = await createTask({ title, status: 'pending', priority: 'medium', project_id: project.id, description: '', due_date: '', due_time: '', client_id: project.client_id })
    if (res?.error) { toast({ title: 'Erro', description: res.error, variant: 'destructive' }); return }
    dirtyRef.current = true
    // Refetch just this project's tasks to get the new row with its id.
    const supabase = createClient()
    const { data } = await supabase.from('tasks').select('*').eq('project_id', project.id).order('due_date', { ascending: true })
    setTasks((data ?? []) as Task[])
  }

  // ---- Notes ----
  async function saveNote() {
    const title = noteTitle.trim()
    if (!title) return
    const res = await createNote({ title, content: noteContent.trim() || null, is_pinned: false, project_id: project.id, client_id: project.client_id })
    if (res?.error) { toast({ title: 'Erro', description: res.error, variant: 'destructive' }); return }
    setNoteTitle(''); setNoteContent(''); setAddingNote(false)
    const supabase = createClient()
    const { data } = await supabase.from('quick_notes').select('*').eq('project_id', project.id).order('created_at', { ascending: false })
    setNotes((data ?? []) as QuickNote[])
  }
  async function removeNote(id: string) {
    setNotes((prev) => prev.filter((n) => n.id !== id))
    await deleteNote(id)
  }

  const dl = project.deadline ? deadlineLabel(project.deadline) : null

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="p-0">
        <div className="flex h-full flex-col">
          {/* Hero */}
          <div className="relative overflow-hidden border-b bg-gradient-to-br from-primary/10 via-primary/5 to-transparent px-5 pb-5 pt-6">
            <div className="flex items-start justify-between gap-4 pr-8">
              <div className="min-w-0 space-y-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="inline-flex items-center gap-1.5 rounded-full border bg-card/80 px-2.5 py-1 text-xs font-medium shadow-sm backdrop-blur transition-colors hover:bg-card">
                      <span className={cn('h-2 w-2 rounded-full', statusDot[status])} />
                      {PROJECT_STATUS_LABELS[status]}
                      <ChevronDown className="h-3 w-3 text-muted-foreground" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-48">
                    {STATUS_ORDER.map((s) => (
                      <DropdownMenuItem key={s} onClick={() => changeStatus(s)} className="gap-2">
                        <span className={cn('h-2 w-2 rounded-full', statusDot[s])} />
                        {PROJECT_STATUS_LABELS[s]}
                        {s === status && <Check className="ml-auto h-3.5 w-3.5 text-primary" />}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                <SheetTitle className="text-xl leading-tight">{project.name}</SheetTitle>
                <SheetDescription className="sr-only">Detalhes do projeto {project.name}</SheetDescription>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                  {project.client && (
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <User className="h-3.5 w-3.5" /> {project.client.name}
                    </span>
                  )}
                  {project.deadline && dl && (
                    <span className={cn(
                      'flex items-center gap-1 font-medium',
                      dl.tone === 'over' && 'text-destructive',
                      dl.tone === 'warn' && 'font-semibold text-foreground',
                      dl.tone === 'ok' && 'text-muted-foreground',
                    )}>
                      <CalendarDays className="h-3.5 w-3.5" /> {formatDate(project.deadline)} · {dl.text}
                    </span>
                  )}
                </div>
              </div>

              <ProgressRing value={overall} />
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 space-y-6 overflow-y-auto scrollbar-thin px-5 py-5">
            {/* Stats */}
            <div className="grid grid-cols-2 gap-2.5">
              <StatTile icon={ListChecks} label="Fases concluídas" value={`${phasesDone}/${phases.length}`} accent="bg-primary/10 text-primary" />
              <StatTile icon={CheckSquare} label="Tarefas concluídas" value={`${tasksDone}/${tasks.length}`} accent="bg-foreground/10 text-foreground" />
              <StatTile icon={StickyNote} label="Anotações" value={`${notes.length}`} accent="bg-muted text-foreground" />
              <StatTile icon={Wallet} label="Saldo" value={formatCurrency(finance.balance)} accent={finance.balance >= 0 ? 'bg-foreground text-background' : 'border bg-background text-foreground'} />
            </div>

            {project.description && (
              <p className="rounded-xl border bg-muted/40 p-3.5 text-sm leading-relaxed text-muted-foreground">
                {project.description}
              </p>
            )}

            {/* Phases */}
            <ProjectPhases
              phases={phases}
              onAdd={addPhase}
              onToggle={togglePhase}
              onRemove={removePhase}
              onReorder={reorderPhases}
              onApplyTemplate={applyTemplate}
            />

            {/* Tasks */}
            <section>
              <SectionHeader icon={CheckSquare} title="Tarefas" right={tasks.length > 0 && <span className="text-xs font-medium tabular-nums text-muted-foreground">{tasksDone}/{tasks.length}</span>} />
              <div className="space-y-1">
                {loading ? (
                  <p className="px-1.5 py-2 text-xs text-muted-foreground">Carregando…</p>
                ) : tasks.length === 0 ? (
                  <p className="rounded-xl border border-dashed py-4 text-center text-xs text-muted-foreground">Nenhuma tarefa vinculada a este projeto.</p>
                ) : tasks.map((t) => (
                  <div key={t.id} className="flex items-center gap-2.5 rounded-lg px-1.5 py-1.5 transition-colors hover:bg-muted/60">
                    <Checkbox checked={t.status === 'completed'} onCheckedChange={() => toggleTask(t)} aria-label={t.title} />
                    <span className={cn('flex-1 text-sm', t.status === 'completed' && 'text-muted-foreground line-through')}>{t.title}</span>
                    {t.due_date && <span className="text-[11px] text-muted-foreground">{formatDate(t.due_date)}</span>}
                  </div>
                ))}
              </div>
              <div className="mt-2 flex items-center gap-2">
                <Input
                  value={newTask}
                  onChange={(e) => setNewTask(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTask() } }}
                  placeholder="Adicionar tarefa ao projeto..."
                  className="h-9"
                />
                <button onClick={addTask} disabled={!newTask.trim()} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-40">
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </section>

            {/* Notes */}
            <section>
              <SectionHeader
                icon={StickyNote}
                title="Anotações"
                right={!addingNote && (
                  <button onClick={() => setAddingNote(true)} className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                    <Plus className="h-3.5 w-3.5" /> Nova
                  </button>
                )}
              />
              {addingNote && (
                <div className="mb-2 space-y-2 rounded-xl border bg-card p-3 animate-fade-in">
                  <Input value={noteTitle} onChange={(e) => setNoteTitle(e.target.value)} placeholder="Título da anotação" className="h-9" autoFocus />
                  <Textarea value={noteContent} onChange={(e) => setNoteContent(e.target.value)} placeholder="Escreva os detalhes..." className="h-20 resize-none" />
                  <div className="flex justify-end gap-2">
                    <button onClick={() => { setAddingNote(false); setNoteTitle(''); setNoteContent('') }} className="rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted">Cancelar</button>
                    <button onClick={saveNote} disabled={!noteTitle.trim()} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-40">Salvar</button>
                  </div>
                </div>
              )}
              <div className="space-y-2">
                {notes.map((n) => (
                  <div key={n.id} className="group/note rounded-xl border bg-card p-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium">{n.title}</p>
                      <button onClick={() => removeNote(n.id)} aria-label="Excluir anotação" className="rounded p-1 text-muted-foreground opacity-0 transition-all hover:bg-destructive/10 hover:text-destructive group-hover/note:opacity-100">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    {n.content && <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">{n.content}</p>}
                  </div>
                ))}
                {!addingNote && notes.length === 0 && (
                  <p className="rounded-xl border border-dashed py-4 text-center text-xs text-muted-foreground">Nenhuma anotação ainda.</p>
                )}
              </div>
            </section>

            {/* Finance */}
            <section>
              <SectionHeader icon={Wallet} title="Financeiro" />
              {entries.length === 0 ? (
                <p className="rounded-xl border border-dashed py-4 text-center text-xs text-muted-foreground">Nenhum lançamento vinculado a este projeto.</p>
              ) : (
                <div className="grid grid-cols-3 gap-2.5">
                  <div className="rounded-xl border bg-foreground p-3 text-background">
                    <p className="text-[11px] text-background/60">Receitas</p>
                    <p className="mt-0.5 text-sm font-semibold tabular-nums">{formatCurrency(finance.income)}</p>
                  </div>
                  <div className="rounded-xl border bg-background p-3">
                    <p className="text-[11px] text-muted-foreground">Despesas</p>
                    <p className="mt-0.5 text-sm font-semibold tabular-nums">{formatCurrency(finance.expense)}</p>
                  </div>
                  <div className="rounded-xl border bg-muted/40 p-3">
                    <p className="text-[11px] text-muted-foreground">Saldo</p>
                    <p className={cn('mt-0.5 text-sm font-semibold tabular-nums', finance.balance >= 0 ? 'text-foreground' : 'text-destructive')}>{formatCurrency(finance.balance)}</p>
                  </div>
                </div>
              )}
            </section>
          </div>

          {/* Footer actions */}
          <div className="flex items-center gap-2 border-t bg-card/50 px-5 py-3">
            <button onClick={() => setEditOpen(true)} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border bg-card px-3 py-2 text-sm font-medium transition-colors hover:bg-muted">
              <Pencil className="h-4 w-4" /> Editar
            </button>
            <button onClick={() => setDeleteOpen(true)} className="flex items-center justify-center gap-1.5 rounded-lg border border-destructive/30 px-3 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10">
              <Trash2 className="h-4 w-4" /> Excluir
            </button>
          </div>
        </div>
      </SheetContent>

      <CreateProjectDialog
        clients={clients}
        editProject={project}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSuccess={() => { dirtyRef.current = true; router.refresh() }}
      />

      <ConfirmDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Excluir projeto"
        description={`Tem certeza que deseja excluir "${project.name}"? Isso não pode ser desfeito.`}
        onConfirm={async () => {
          const res = await deleteProject(project.id)
          if (res?.error) { toast({ title: 'Erro', description: res.error, variant: 'destructive' }); return }
          onOpenChange(false)
          router.refresh()
        }}
      />
    </Sheet>
  )
}
