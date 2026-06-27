'use client'

import { useState } from 'react'
import { MoreHorizontal, Pencil, Trash2, TrendingUp, TrendingDown } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { ConfirmDeleteDialog } from '@/components/shared/ConfirmDeleteDialog'
import { deleteFinancialEntry } from '@/actions/finance'
import { cn, formatCurrency, formatDate, FINANCIAL_STATUS_LABELS } from '@/lib/utils'
import type { FinancialEntry } from '@/types'

const statusVariants: Record<string, any> = {
  pending: 'pending',
  paid: 'paid',
  received: 'received',
  overdue: 'overdue',
}

interface FinanceCardProps {
  entry: FinancialEntry
  onEdit?: (entry: FinancialEntry) => void
}

export function FinanceCard({ entry, onEdit }: FinanceCardProps) {
  const [deleteOpen, setDeleteOpen] = useState(false)
  const isIncome = entry.type === 'income'

  return (
    <>
      <div className="group flex items-center gap-3 p-3.5 rounded-xl border bg-card hover:shadow-sm transition-all duration-150">
        <div className={cn(
          'h-8 w-8 rounded-lg flex items-center justify-center shrink-0',
          isIncome ? 'bg-green-50' : 'bg-red-50'
        )}>
          {isIncome
            ? <TrendingUp className="h-4 w-4 text-green-600" />
            : <TrendingDown className="h-4 w-4 text-red-500" />}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{entry.title}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-muted-foreground">{entry.category}</span>
            <span className="text-muted-foreground">·</span>
            <span className="text-xs text-muted-foreground">{formatDate(entry.due_date)}</span>
            {entry.client && (
              <>
                <span className="text-muted-foreground">·</span>
                <span className="text-xs text-muted-foreground truncate">{entry.client.name}</span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="text-right">
            <p className={cn('text-sm font-semibold', isIncome ? 'text-green-600' : 'text-red-500')}>
              {isIncome ? '+' : '-'}{formatCurrency(entry.amount)}
            </p>
            <Badge variant={statusVariants[entry.status]} className="text-[10px] mt-0.5">
              {FINANCIAL_STATUS_LABELS[entry.status]}
            </Badge>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="opacity-0 group-hover:opacity-100 focus:opacity-100 p-1 rounded-md hover:bg-muted transition-all">
                <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              {onEdit && (
                <DropdownMenuItem onClick={() => onEdit(entry)}>
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
      </div>

      <ConfirmDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Excluir lançamento"
        description={`Tem certeza que deseja excluir "${entry.title}"?`}
        onConfirm={async () => { await deleteFinancialEntry(entry.id) }}
      />
    </>
  )
}
