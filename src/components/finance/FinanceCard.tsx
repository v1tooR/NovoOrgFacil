'use client'

import { useState } from 'react'
import { MoreHorizontal, Pencil, Trash2, TrendingUp, TrendingDown, CheckCircle2, Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent, DropdownMenuLabel } from '@/components/ui/dropdown-menu'
import { ConfirmDeleteDialog } from '@/components/shared/ConfirmDeleteDialog'
import { deleteFinancialEntry, updateFinancialEntryStatus } from '@/actions/finance'
import { useToast } from '@/components/ui/use-toast'
import { cn, formatCurrency, formatDate, FINANCIAL_STATUS_LABELS } from '@/lib/utils'
import type { FinancialEntry, FinancialStatus } from '@/types'

const statusVariants: Record<string, any> = {
  pending: 'pending',
  paid: 'paid',
  received: 'received',
  overdue: 'overdue',
}

// Estados disponíveis por tipo: receitas usam "Recebido", despesas usam "Pago".
const STATUS_OPTIONS: Record<FinancialEntry['type'], FinancialStatus[]> = {
  income: ['pending', 'received', 'overdue'],
  expense: ['pending', 'paid', 'overdue'],
}

interface FinanceCardProps {
  entry: FinancialEntry
  onEdit?: (entry: FinancialEntry) => void
  onChanged?: () => void
}

export function FinanceCard({ entry, onEdit, onChanged }: FinanceCardProps) {
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [updating, setUpdating] = useState(false)
  const { toast } = useToast()
  const isIncome = entry.type === 'income'

  async function handleStatusChange(status: FinancialStatus) {
    if (status === entry.status || updating) return
    setUpdating(true)
    const result = await updateFinancialEntryStatus(entry.id, status)
    setUpdating(false)
    if (result.error) {
      toast({ title: 'Erro', description: result.error, variant: 'destructive' })
    } else {
      toast({ title: `Status alterado para "${FINANCIAL_STATUS_LABELS[status]}".` })
      onChanged?.()
    }
  }

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
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuSub>
                <DropdownMenuSubTrigger disabled={updating}>
                  {updating ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  Alterar status
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuLabel className="text-xs text-muted-foreground">Marcar como</DropdownMenuLabel>
                  {STATUS_OPTIONS[entry.type].map((status) => (
                    <DropdownMenuItem
                      key={status}
                      disabled={status === entry.status}
                      onClick={() => handleStatusChange(status)}
                    >
                      <Badge variant={statusVariants[status]} className="text-[10px]">
                        {FINANCIAL_STATUS_LABELS[status]}
                      </Badge>
                      {status === entry.status && <span className="ml-auto text-xs text-muted-foreground">Atual</span>}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
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
        onConfirm={async () => { await deleteFinancialEntry(entry.id); onChanged?.() }}
      />
    </>
  )
}
