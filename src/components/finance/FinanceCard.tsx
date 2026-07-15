'use client'

import { useState } from 'react'
import { MoreHorizontal, Pencil, Trash2, TrendingUp, TrendingDown, CheckCircle2, CreditCard, Loader2, Repeat2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent, DropdownMenuLabel } from '@/components/ui/dropdown-menu'
import { ConfirmDeleteDialog } from '@/components/shared/ConfirmDeleteDialog'
import { deleteFinancialEntry, deleteFinancialSeries, updateFinancialEntryStatus } from '@/actions/finance'
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
  const [deleteTarget, setDeleteTarget] = useState<'entry' | 'series' | null>(null)
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
      <div className="group flex items-start gap-3 rounded-xl border bg-card p-3.5 transition-all duration-150 hover:shadow-sm sm:items-center">
        <div className={cn(
          'h-8 w-8 rounded-lg flex items-center justify-center shrink-0',
          isIncome ? 'bg-foreground text-background' : 'border bg-background text-foreground'
        )}>
          {isIncome
            ? <TrendingUp className="h-4 w-4" />
            : <TrendingDown className="h-4 w-4" />}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{entry.title}</p>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="max-w-full truncate text-xs text-muted-foreground">{entry.category}</span>
            <span className="text-muted-foreground">·</span>
            <span className="text-xs text-muted-foreground">{formatDate(entry.due_date)}</span>
            {entry.series_type && entry.series_number && entry.series_count && (
              <span className="inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                {entry.series_type === 'installment'
                  ? <CreditCard className="h-3 w-3" />
                  : <Repeat2 className="h-3 w-3" />}
                {entry.series_type === 'installment' ? 'Parcela' : 'Recorrência'} {entry.series_number}/{entry.series_count}
              </span>
            )}
            {entry.client && (
              <>
                <span className="text-muted-foreground">·</span>
                <span className="text-xs text-muted-foreground truncate">{entry.client.name}</span>
              </>
            )}
          </div>
        </div>

        <div className="flex min-w-0 shrink-0 items-center gap-1.5 sm:gap-2">
          <div className="min-w-0 text-right">
            <p className="whitespace-nowrap text-[clamp(0.6875rem,3.2vw,0.875rem)] font-semibold text-foreground tabular-nums">
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
              <DropdownMenuItem variant="destructive" onClick={() => setDeleteTarget('entry')}>
                <Trash2 className="h-4 w-4" /> Excluir lançamento
              </DropdownMenuItem>
              {entry.series_id && (
                <DropdownMenuItem variant="destructive" onClick={() => setDeleteTarget('series')}>
                  <Repeat2 className="h-4 w-4" /> Excluir toda a série
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <ConfirmDeleteDialog
        open={deleteTarget !== null}
        onOpenChange={(nextOpen) => !nextOpen && setDeleteTarget(null)}
        title={deleteTarget === 'series' ? 'Excluir toda a série' : 'Excluir lançamento'}
        description={deleteTarget === 'series'
          ? `Todas as ${entry.series_count} ocorrências de "${entry.title}" serão excluídas. Esta ação não pode ser desfeita.`
          : `Somente este lançamento de "${entry.title}" será excluído.`}
        onConfirm={async () => {
          const result = deleteTarget === 'series' && entry.series_id
            ? await deleteFinancialSeries(entry.series_id)
            : await deleteFinancialEntry(entry.id)

          if (result.error) {
            toast({ title: 'Erro', description: result.error, variant: 'destructive' })
            return
          }

          onChanged?.()
        }}
      />
    </>
  )
}
