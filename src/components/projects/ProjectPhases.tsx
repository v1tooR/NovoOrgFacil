'use client'

import { useRef, useState } from 'react'
import { GripVertical, Plus, Trash2, Sparkles, LayoutTemplate } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import type { ProjectPhase } from '@/types'

/** Ready-made process templates for common freelancer / agency workflows. */
export const PHASE_TEMPLATES: { name: string; phases: string[] }[] = [
  { name: 'Design', phases: ['Briefing', 'Pesquisa & referências', 'Wireframe', 'Design visual', 'Revisão do cliente', 'Entrega dos arquivos'] },
  { name: 'Desenvolvimento web', phases: ['Levantamento de requisitos', 'Design & protótipo', 'Desenvolvimento', 'Testes', 'Deploy', 'Suporte'] },
  { name: 'Conteúdo', phases: ['Pauta', 'Roteiro', 'Produção', 'Edição', 'Aprovação', 'Publicação'] },
  { name: 'Consultoria', phases: ['Diagnóstico', 'Proposta', 'Execução', 'Acompanhamento', 'Relatório final'] },
  { name: 'Básico', phases: ['Planejamento', 'Execução', 'Revisão', 'Entrega'] },
]

interface ProjectPhasesProps {
  phases: ProjectPhase[]
  onAdd: (title: string) => void
  onToggle: (id: string) => void
  onRemove: (id: string) => void
  onReorder: (next: ProjectPhase[]) => void
  onApplyTemplate: (titles: string[]) => void
}

export function ProjectPhases({ phases, onAdd, onToggle, onRemove, onReorder, onApplyTemplate }: ProjectPhasesProps) {
  const [newPhase, setNewPhase] = useState('')
  const [order, setOrder] = useState<ProjectPhase[] | null>(null) // non-null only while dragging
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const dragRef = useRef<{ index: number; pointerId: number } | null>(null)
  const rowRefs = useRef<(HTMLDivElement | null)[]>([])

  const list = order ?? phases
  const done = list.filter((p) => p.done).length
  const pct = list.length > 0 ? Math.round((done / list.length) * 100) : 0

  function handleAdd() {
    const t = newPhase.trim()
    if (!t) return
    onAdd(t)
    setNewPhase('')
  }

  // ---- Drag to reorder (pointer capture on the grip handle) ----
  function onGripDown(e: React.PointerEvent<HTMLButtonElement>, index: number) {
    if (list.length < 2) return
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    dragRef.current = { index, pointerId: e.pointerId }
    setOrder(phases)
    setDraggingId(list[index].id)
  }

  function onGripMove(e: React.PointerEvent<HTMLButtonElement>) {
    const d = dragRef.current
    if (!d || e.pointerId !== d.pointerId) return
    const cur = order ?? phases
    let target = d.index
    for (let i = 0; i < list.length; i++) {
      const el = rowRefs.current[i]
      if (!el) continue
      const r = el.getBoundingClientRect()
      if (e.clientY < r.top + r.height / 2) { target = i; break }
      target = i
    }
    if (target !== d.index) {
      const next = [...cur]
      const [moved] = next.splice(d.index, 1)
      next.splice(target, 0, moved)
      d.index = target
      setOrder(next)
    }
  }

  function endDrag() {
    const d = dragRef.current
    if (!d) return
    dragRef.current = null
    setDraggingId(null)
    const final = order
    setOrder(null)
    if (final) onReorder(final)
  }

  return (
    <section>
      <div className="mb-2.5 flex items-center gap-2">
        <span className="flex h-4 w-4 items-center justify-center text-primary">
          <Sparkles className="h-4 w-4" />
        </span>
        <h3 className="text-sm font-semibold">Fases & Processos</h3>
        <div className="ml-auto flex items-center gap-2">
          {list.length > 0 && <span className="text-xs font-medium tabular-nums text-muted-foreground">{done}/{list.length}</span>}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                <LayoutTemplate className="h-3.5 w-3.5" /> Modelos
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="text-xs">Adicionar fases de um modelo</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {PHASE_TEMPLATES.map((tpl) => (
                <DropdownMenuItem key={tpl.name} onClick={() => onApplyTemplate(tpl.phases)} className="flex-col items-start gap-0.5 py-1.5">
                  <span className="text-sm font-medium">{tpl.name}</span>
                  <span className="line-clamp-1 text-[11px] text-muted-foreground">{tpl.phases.join(' · ')}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {list.length > 0 && (
        <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out" style={{ width: `${pct}%` }} />
        </div>
      )}

      <div className="space-y-1">
        {list.map((p, i) => {
          const dragging = draggingId === p.id
          return (
            <div
              key={p.id}
              ref={(el) => { rowRefs.current[i] = el }}
              className={cn(
                'group/prow flex items-center gap-1.5 rounded-lg py-1.5 pr-1.5 transition-colors',
                dragging ? 'relative z-10 bg-card shadow-lg ring-2 ring-primary/40' : 'hover:bg-muted/60'
              )}
            >
              <button
                onPointerDown={(e) => onGripDown(e, i)}
                onPointerMove={onGripMove}
                onPointerUp={endDrag}
                onLostPointerCapture={endDrag}
                aria-label="Reordenar fase"
                className={cn(
                  'shrink-0 touch-none rounded p-0.5 text-muted-foreground/40 transition-colors hover:text-muted-foreground',
                  list.length > 1 ? (dragging ? 'cursor-grabbing text-muted-foreground' : 'cursor-grab') : 'cursor-default opacity-30'
                )}
              >
                <GripVertical className="h-4 w-4" />
              </button>
              <span className="w-4 shrink-0 text-center text-[11px] font-medium tabular-nums text-muted-foreground/60">{i + 1}</span>
              <Checkbox checked={p.done} onCheckedChange={() => onToggle(p.id)} aria-label={p.title} />
              <span className={cn('flex-1 text-sm transition-colors', p.done && 'text-muted-foreground line-through')}>{p.title}</span>
              <button
                onClick={() => onRemove(p.id)}
                aria-label="Remover fase"
                className="rounded p-1 text-muted-foreground opacity-0 transition-all hover:bg-destructive/10 hover:text-destructive group-hover/prow:opacity-100"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          )
        })}

        {list.length === 0 && (
          <div className="rounded-xl border border-dashed p-4 text-center">
            <Sparkles className="mx-auto mb-1.5 h-4 w-4 text-muted-foreground/50" />
            <p className="mb-3 text-xs text-muted-foreground">Comece com um modelo de processo:</p>
            <div className="flex flex-wrap justify-center gap-1.5">
              {PHASE_TEMPLATES.map((tpl) => (
                <button
                  key={tpl.name}
                  onClick={() => onApplyTemplate(tpl.phases)}
                  className="rounded-full border bg-card px-2.5 py-1 text-xs font-medium transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
                >
                  {tpl.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="mt-2 flex items-center gap-2">
        <Input
          value={newPhase}
          onChange={(e) => setNewPhase(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAdd() } }}
          placeholder="Nova fase ou etapa..."
          className="h-9"
        />
        <button onClick={handleAdd} disabled={!newPhase.trim()} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-40">
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </section>
  )
}
