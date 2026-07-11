'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'
import type { Task, TaskStatus } from '@/types'
import { KanbanCard } from './KanbanCard'

const COLUMNS: {
  status: TaskStatus
  label: string
  dot: string
  ring: string
  headerBg: string
  emptyText: string
}[] = [
  { status: 'pending', label: 'A fazer', dot: 'bg-slate-400', ring: 'ring-slate-300', headerBg: 'bg-slate-400/10', emptyText: 'Nada pendente por aqui.' },
  { status: 'in_progress', label: 'Em andamento', dot: 'bg-blue-500', ring: 'ring-blue-400', headerBg: 'bg-blue-500/10', emptyText: 'Nada em andamento.' },
  { status: 'completed', label: 'Concluída', dot: 'bg-green-500', ring: 'ring-green-400', headerBg: 'bg-green-500/10', emptyText: 'Nada concluído ainda.' },
]

interface KanbanBoardProps {
  tasks: Task[]
  onStatusChange: (taskId: string, status: TaskStatus) => void
  onEdit: (task: Task) => void
  onDelete: (taskId: string) => Promise<void>
}

interface DragState {
  task: Task
  pointerId: number
  startX: number
  startY: number
  offsetX: number
  offsetY: number
  width: number
  active: boolean
}

export function KanbanBoard({ tasks, onStatusChange, onEdit, onDelete }: KanbanBoardProps) {
  const dragRef = useRef<DragState | null>(null)
  const colRefs = useRef<Partial<Record<TaskStatus, HTMLDivElement | null>>>({})
  const onStatusChangeRef = useRef(onStatusChange)
  onStatusChangeRef.current = onStatusChange

  const [activeId, setActiveId] = useState<string | null>(null)
  const [overCol, setOverCol] = useState<TaskStatus | null>(null)
  const [ghost, setGhost] = useState<{ x: number; y: number; width: number; task: Task } | null>(null)
  const [mounted, setMounted] = useState(false)

  // Keep the latest overCol readable inside the (stable) pointerup handler.
  const overColRef = useRef<TaskStatus | null>(null)
  overColRef.current = overCol

  useEffect(() => setMounted(true), [])

  // Stable listener refs so add/removeEventListener always match.
  const moveRef = useRef<(e: PointerEvent) => void>()
  const upRef = useRef<(e: PointerEvent) => void>()
  const keyRef = useRef<(e: KeyboardEvent) => void>()

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
        setActiveId(d.task.id)
        document.body.style.userSelect = 'none'
        document.body.style.cursor = 'grabbing'
      }

      setGhost({ x: e.clientX - d.offsetX, y: e.clientY - d.offsetY, width: d.width, task: d.task })

      let found: TaskStatus | null = null
      for (const col of COLUMNS) {
        const el = colRefs.current[col.status]
        if (!el) continue
        const r = el.getBoundingClientRect()
        if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) {
          found = col.status
          break
        }
      }
      setOverCol(found)
    }

    upRef.current = (e: PointerEvent) => {
      const d = dragRef.current
      if (!d || e.pointerId !== d.pointerId) return
      if (d.active && overColRef.current && overColRef.current !== d.task.status) {
        onStatusChangeRef.current(d.task.id, overColRef.current)
      }
      reset()
    }

    keyRef.current = (e: KeyboardEvent) => {
      if (e.key === 'Escape') reset()
    }

    return detach
  }, [])

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>, task: Task) {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    const target = e.target as HTMLElement
    if (target.closest('[data-no-drag]')) return
    // On touch/pen, only the grip handle starts a drag (keeps scrolling & taps intact).
    if (e.pointerType !== 'mouse' && !target.closest('[data-drag-handle]')) return

    const rect = e.currentTarget.getBoundingClientRect()
    dragRef.current = {
      task,
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

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {COLUMNS.map((col) => {
        const colTasks = tasks.filter((t) => t.status === col.status)
        const isOver = overCol === col.status
        return (
          <div
            key={col.status}
            ref={(el) => { colRefs.current[col.status] = el }}
            className={cn(
              'flex flex-col rounded-2xl border bg-muted/30 transition-colors duration-200',
              isOver && activeId ? cn('ring-2 ring-offset-1 ring-offset-background bg-muted/60', col.ring) : 'ring-0'
            )}
          >
            {/* Column header */}
            <div className="flex items-center gap-2 px-3.5 pt-3.5 pb-2">
              <span className={cn('h-2 w-2 rounded-full', col.dot)} />
              <h3 className="text-sm font-semibold">{col.label}</h3>
              <span className={cn('ml-auto rounded-full px-2 py-0.5 text-xs font-medium text-foreground/70', col.headerBg)}>
                {colTasks.length}
              </span>
            </div>

            {/* Column body */}
            <div className="flex flex-1 flex-col gap-2 p-2.5 min-h-[7rem]">
              {colTasks.map((task) => (
                <div
                  key={task.id}
                  onPointerDown={(e) => handlePointerDown(e, task)}
                  className="animate-pop-in touch-pan-y select-none"
                >
                  <KanbanCard task={task} onEdit={onEdit} onDelete={onDelete} dragging={activeId === task.id} />
                </div>
              ))}

              {colTasks.length === 0 && (
                <div
                  className={cn(
                    'flex flex-1 items-center justify-center rounded-xl border border-dashed px-3 py-6 text-center text-xs text-muted-foreground transition-colors',
                    isOver && activeId ? 'border-primary/50 text-primary bg-primary/5' : 'border-border/70'
                  )}
                >
                  {isOver && activeId ? 'Solte aqui' : col.emptyText}
                </div>
              )}
            </div>
          </div>
        )
      })}

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
          <KanbanCard task={ghost.task} preview />
        </div>,
        document.body
      )}
    </div>
  )
}
