'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn, formatCurrency, LEAD_STAGES, LEAD_STAGE_LABELS } from '@/lib/utils'
import { updateLeadStage, deleteLead } from '@/actions/leads'
import { useToast } from '@/components/ui/use-toast'
import { Button } from '@/components/ui/button'
import type { Lead, LeadStage, Client } from '@/types'
import { LeadCard } from './LeadCard'
import { CreateLeadDialog } from './CreateLeadDialog'
import { ConvertLeadDialog } from './ConvertLeadDialog'

const STAGE_DOT: Record<LeadStage, string> = {
  new: 'bg-foreground/25',
  contacted: 'bg-primary/50',
  proposal: 'bg-warning',
  negotiation: 'bg-primary',
  won: 'bg-success',
  lost: 'bg-destructive/60',
}

interface LeadFunnelBoardProps {
  initialLeads: Lead[]
  clients: Client[]
}

interface DragState {
  lead: Lead
  pointerId: number
  startX: number
  startY: number
  offsetX: number
  offsetY: number
  width: number
  active: boolean
}

export function LeadFunnelBoard({ initialLeads, clients }: LeadFunnelBoardProps) {
  const { toast } = useToast()
  const supabase = createClient()

  const [leads, setLeads] = useState<Lead[]>(initialLeads)
  const [editLead, setEditLead] = useState<Lead | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [convertLead, setConvertLead] = useState<Lead | null>(null)
  const [convertOpen, setConvertOpen] = useState(false)

  const dragRef = useRef<DragState | null>(null)
  const colRefs = useRef<Partial<Record<LeadStage, HTMLDivElement | null>>>({})

  const [activeId, setActiveId] = useState<string | null>(null)
  const [overCol, setOverCol] = useState<LeadStage | null>(null)
  const [ghost, setGhost] = useState<{ x: number; y: number; width: number; lead: Lead } | null>(null)
  const [mounted, setMounted] = useState(false)

  const overColRef = useRef<LeadStage | null>(null)
  overColRef.current = overCol

  useEffect(() => setMounted(true), [])

  async function reload() {
    const { data } = await supabase
      .from('leads')
      .select('*, client:clients(id,name)')
      .order('created_at', { ascending: false })
    setLeads((data ?? []) as Lead[])
  }

  async function handleStageChange(leadId: string, stage: LeadStage) {
    const lead = leads.find((l) => l.id === leadId)
    if (!lead || lead.stage === stage) return

    const previous = leads
    setLeads((ls) => ls.map((l) => (l.id === leadId ? { ...l, stage } : l)))

    const result = await updateLeadStage(leadId, stage)
    if (result.error) {
      setLeads(previous)
      toast({ title: 'Erro', description: result.error, variant: 'destructive' })
      return
    }

    // Ao ganhar um lead ainda não convertido, oferece a conversão em cliente.
    if (stage === 'won' && !lead.client_id) {
      setConvertLead({ ...lead, stage })
      setConvertOpen(true)
    }
  }

  async function handleDelete(leadId: string) {
    const previous = leads
    setLeads((ls) => ls.filter((l) => l.id !== leadId))
    const result = await deleteLead(leadId)
    if (result.error) {
      setLeads(previous)
      toast({ title: 'Erro', description: result.error, variant: 'destructive' })
    }
  }

  function openEdit(lead: Lead) {
    setEditLead(lead)
    setEditOpen(true)
  }

  function openConvert(lead: Lead) {
    setConvertLead(lead)
    setConvertOpen(true)
  }

  // ---- Drag machinery (pointer-based, portado do KanbanBoard) ----
  const moveRef = useRef<(e: PointerEvent) => void>()
  const upRef = useRef<(e: PointerEvent) => void>()
  const keyRef = useRef<(e: KeyboardEvent) => void>()
  const stageChangeRef = useRef(handleStageChange)
  stageChangeRef.current = handleStageChange

  useEffect(() => {
    function detach() {
      window.removeEventListener('pointermove', moveRef.current!)
      window.removeEventListener('pointerup', upRef.current!)
      window.removeEventListener('pointercancel', upRef.current!)
      window.removeEventListener('keydown', keyRef.current!)
      document.body.style.userSelect = ''
      document.body.style.cursor = ''
    }

    function reset() {
      dragRef.current = null
      setActiveId(null)
      setOverCol(null)
      setGhost(null)
      detach()
    }

    moveRef.current = (e: PointerEvent) => {
      const d = dragRef.current
      if (!d || e.pointerId !== d.pointerId) return
      const dx = e.clientX - d.startX
      const dy = e.clientY - d.startY

      if (!d.active) {
        if (Math.hypot(dx, dy) < 6) return
        d.active = true
        setActiveId(d.lead.id)
        document.body.style.userSelect = 'none'
        document.body.style.cursor = 'grabbing'
      }

      setGhost({ x: e.clientX - d.offsetX, y: e.clientY - d.offsetY, width: d.width, lead: d.lead })

      let found: LeadStage | null = null
      for (const stage of LEAD_STAGES) {
        const el = colRefs.current[stage]
        if (!el) continue
        const r = el.getBoundingClientRect()
        if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) {
          found = stage
          break
        }
      }
      setOverCol(found)
    }

    upRef.current = (e: PointerEvent) => {
      const d = dragRef.current
      if (!d || e.pointerId !== d.pointerId) return
      if (d.active && overColRef.current && overColRef.current !== d.lead.stage) {
        stageChangeRef.current(d.lead.id, overColRef.current)
      }
      reset()
    }

    keyRef.current = (e: KeyboardEvent) => {
      if (e.key === 'Escape') reset()
    }

    return detach
  }, [])

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>, lead: Lead) {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    const target = e.target as HTMLElement
    if (target.closest('[data-no-drag]')) return
    if (e.pointerType !== 'mouse' && !target.closest('[data-drag-handle]')) return

    const rect = e.currentTarget.getBoundingClientRect()
    dragRef.current = {
      lead,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
      width: rect.width,
      active: false,
    }
    window.addEventListener('pointermove', moveRef.current!)
    window.addEventListener('pointerup', upRef.current!)
    window.addEventListener('pointercancel', upRef.current!)
    window.addEventListener('keydown', keyRef.current!)
  }

  // Total em aberto = tudo que ainda não foi ganho nem perdido.
  const openPipeline = leads
    .filter((l) => l.stage !== 'won' && l.stage !== 'lost')
    .reduce((s, l) => s + Number(l.value), 0)
  const wonTotal = leads.filter((l) => l.stage === 'won').reduce((s, l) => s + Number(l.value), 0)

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-4 text-xs">
          <div>
            <span className="text-muted-foreground">Em aberto: </span>
            <span className="font-semibold tabular-nums">{formatCurrency(openPipeline)}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Ganho: </span>
            <span className="font-semibold tabular-nums text-success">{formatCurrency(wonTotal)}</span>
          </div>
        </div>
        <CreateLeadDialog
          onSuccess={reload}
          trigger={<Button size="sm"><Plus className="h-4 w-4" />Novo lead</Button>}
        />
      </div>

      {/* Board */}
      <div className="flex gap-3 overflow-x-auto pb-3 -mx-1 px-1">
        {LEAD_STAGES.map((stage) => {
          const colLeads = leads.filter((l) => l.stage === stage)
          const colTotal = colLeads.reduce((s, l) => s + Number(l.value), 0)
          const isOver = overCol === stage
          return (
            <div
              key={stage}
              ref={(el) => { colRefs.current[stage] = el }}
              className={cn(
                'flex w-[16.5rem] shrink-0 flex-col rounded-2xl border bg-muted/30 transition-colors duration-200',
                isOver && activeId ? 'ring-2 ring-primary/50 ring-offset-1 ring-offset-background bg-muted/60' : 'ring-0'
              )}
            >
              {/* Column header */}
              <div className="flex items-center gap-2 px-3.5 pt-3.5 pb-2">
                <span className={cn('h-2 w-2 rounded-full', STAGE_DOT[stage])} />
                <h3 className="text-sm font-semibold">{LEAD_STAGE_LABELS[stage]}</h3>
                <span className="ml-auto rounded-full bg-background px-2 py-0.5 text-xs font-medium text-foreground/70">
                  {colLeads.length}
                </span>
              </div>
              {colTotal > 0 && (
                <p className="px-3.5 pb-1 text-[11px] tabular-nums text-muted-foreground">{formatCurrency(colTotal)}</p>
              )}

              {/* Column body */}
              <div className="flex flex-1 flex-col gap-2 p-2.5 min-h-[7rem]">
                {colLeads.map((lead) => (
                  <div
                    key={lead.id}
                    onPointerDown={(e) => handlePointerDown(e, lead)}
                    className="animate-pop-in touch-pan-y select-none"
                  >
                    <LeadCard
                      lead={lead}
                      onEdit={openEdit}
                      onConvert={openConvert}
                      onDelete={handleDelete}
                      dragging={activeId === lead.id}
                    />
                  </div>
                ))}

                {colLeads.length === 0 && (
                  <div
                    className={cn(
                      'flex flex-1 items-center justify-center rounded-xl border border-dashed px-3 py-6 text-center text-xs text-muted-foreground transition-colors',
                      isOver && activeId ? 'border-primary/50 text-primary bg-primary/5' : 'border-border/70'
                    )}
                  >
                    {isOver && activeId ? 'Solte aqui' : 'Sem leads'}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Floating drag preview */}
      {mounted && ghost && createPortal(
        <div
          className="pointer-events-none fixed left-0 top-0 z-50"
          style={{
            transform: `translate3d(${ghost.x}px, ${ghost.y}px, 0)`,
            width: ghost.width,
            ['--kanban-card-w' as string]: `${ghost.width}px`,
          }}
        >
          <LeadCard lead={ghost.lead} preview />
        </div>,
        document.body
      )}

      {/* Edit dialog (controlled) */}
      <CreateLeadDialog
        editLead={editLead}
        open={editOpen}
        onOpenChange={(o) => { setEditOpen(o); if (!o) setEditLead(null) }}
        onSuccess={reload}
      />

      {/* Convert dialog */}
      <ConvertLeadDialog
        lead={convertLead}
        clients={clients}
        open={convertOpen}
        onOpenChange={(o) => { setConvertOpen(o); if (!o) setConvertLead(null) }}
        onSuccess={reload}
      />
    </div>
  )
}
