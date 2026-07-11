'use client'

import { List, LayoutGrid } from 'lucide-react'
import { cn } from '@/lib/utils'

export type TaskView = 'list' | 'kanban'

interface ViewToggleProps {
  value: TaskView
  onChange: (view: TaskView) => void
}

const OPTIONS: { value: TaskView; label: string; icon: typeof List }[] = [
  { value: 'list', label: 'Lista', icon: List },
  { value: 'kanban', label: 'Kanban', icon: LayoutGrid },
]

export function ViewToggle({ value, onChange }: ViewToggleProps) {
  return (
    <div role="tablist" aria-label="Modo de visualização" className="inline-flex items-center rounded-lg bg-muted p-1">
      {OPTIONS.map((opt) => {
        const active = value === opt.value
        const Icon = opt.icon
        return (
          <button
            key={opt.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              'flex items-center gap-1.5 rounded-md px-3 py-1 text-sm font-medium transition-all duration-200',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              active
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Icon className="h-4 w-4" />
            <span className="hidden sm:inline">{opt.label}</span>
          </button>
        )
      })}
    </div>
  )
}
