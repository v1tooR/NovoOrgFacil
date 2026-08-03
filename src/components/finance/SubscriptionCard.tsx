'use client'

import { useState } from 'react'
import {
  CalendarClock,
  Check,
  Loader2,
  MoreHorizontal,
  Pause,
  Pencil,
  Play,
  Trash2,
  XCircle,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ConfirmDeleteDialog } from '@/components/shared/ConfirmDeleteDialog'
import { useToast } from '@/components/ui/use-toast'
import {
  deleteSubscription,
  registerSubscriptionCharge,
  updateSubscriptionStatus,
} from '@/actions/subscriptions'
import {
  SUBSCRIPTION_CYCLES,
  cycleProgress,
  daysUntil,
  formatChargeCountdown,
  monthlyCost,
} from '@/lib/subscriptions'
import { cn, formatCurrency, formatDate, getInitials } from '@/lib/utils'
import type { Subscription } from '@/types'

interface SubscriptionCardProps {
  subscription: Subscription
  /** Fatia do custo mensal total (0 a 1), usada na barra de participação. */
  share?: number
  onEdit?: (subscription: Subscription) => void
  onChanged?: () => void | Promise<void>
}

export function SubscriptionCard({ subscription, share = 0, onEdit, onChanged }: SubscriptionCardProps) {
  const [pendingAction, setPendingAction] = useState<'charge' | 'status' | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const { toast } = useToast()

  const cycle = SUBSCRIPTION_CYCLES[subscription.cycle]
  const isActive = subscription.status === 'active'
  const isCanceled = subscription.status === 'canceled'
  const days = daysUntil(subscription.next_charge_date)
  const isOverdue = isActive && days < 0
  const isImminent = isActive && days >= 0 && days <= 3
  const progress = isActive ? cycleProgress(subscription) : 0
  const perMonth = monthlyCost(subscription)

  async function handleRegisterCharge() {
    if (pendingAction) return
    setPendingAction('charge')
    const result = await registerSubscriptionCharge(subscription.id)
    setPendingAction(null)

    if (result.error) {
      toast({ title: 'Erro', description: result.error, variant: 'destructive' })
      return
    }

    toast({
      title: 'Pagamento registrado!',
      description: `Despesa lançada. Próxima cobrança em ${formatDate(result.nextChargeDate!)}.`,
    })
    await onChanged?.()
  }

  async function handleStatus(status: Subscription['status']) {
    if (pendingAction) return
    setPendingAction('status')
    const result = await updateSubscriptionStatus(subscription.id, status)
    setPendingAction(null)

    if (result.error) {
      toast({ title: 'Erro', description: result.error, variant: 'destructive' })
      return
    }

    toast({
      title: status === 'active' ? 'Assinatura reativada!'
        : status === 'paused' ? 'Assinatura pausada.'
        : 'Assinatura cancelada.',
      description: status === 'canceled'
        ? `Você deixa de gastar ${formatCurrency(perMonth * 12)} por ano.`
        : undefined,
    })
    await onChanged?.()
  }

  return (
    <>
      <div className={cn(
        'group relative overflow-hidden rounded-xl border bg-card p-3.5 transition-all duration-200',
        'hover:-translate-y-0.5 hover:border-foreground/40 hover:shadow-[4px_4px_0_hsl(var(--foreground)/0.06)]',
        isOverdue && 'border-foreground border-dashed',
        !isActive && 'bg-muted/30'
      )}>
        <div className="flex items-start gap-3">
          <div className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-xs font-bold tracking-tight',
            isActive ? 'bg-foreground text-background' : 'border border-dashed bg-background text-muted-foreground'
          )}>
            {getInitials(subscription.name)}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <p className={cn('truncate text-sm font-semibold', isCanceled && 'line-through opacity-60')}>
                {subscription.name}
              </p>
              <div className="shrink-0 text-right">
                <p className="whitespace-nowrap text-sm font-bold tabular-nums">
                  {formatCurrency(subscription.amount)}
                  <span className="ml-0.5 text-[10px] font-medium text-muted-foreground">{cycle.suffix}</span>
                </p>
                {subscription.cycle !== 'monthly' && (
                  <p className="whitespace-nowrap text-[11px] text-muted-foreground tabular-nums">
                    ≈ {formatCurrency(perMonth)}/mês
                  </p>
                )}
              </div>
            </div>

            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
              <span className="rounded-sm border px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide">
                {cycle.label}
              </span>
              <span className="truncate">{subscription.category}</span>
              {subscription.payment_method && (
                <>
                  <span aria-hidden>·</span>
                  <span className="truncate">{subscription.payment_method}</span>
                </>
              )}
              {isActive && share >= 0.05 && (
                <>
                  <span aria-hidden>·</span>
                  <span className="whitespace-nowrap tabular-nums">{(share * 100).toFixed(0)}% do recorrente</span>
                </>
              )}
            </div>

            <div className="mt-2.5 flex items-center justify-between gap-2">
              {isActive ? (
                <div className="flex min-w-0 items-center gap-1.5">
                  <CalendarClock className={cn('h-3.5 w-3.5 shrink-0', isOverdue || isImminent ? 'text-foreground' : 'text-muted-foreground')} />
                  <span className={cn(
                    'truncate text-xs',
                    isOverdue || isImminent ? 'font-semibold text-foreground' : 'text-muted-foreground'
                  )}>
                    {formatChargeCountdown(days)}
                  </span>
                  <span className="hidden truncate text-xs text-muted-foreground sm:inline">
                    · {formatDate(subscription.next_charge_date)}
                  </span>
                </div>
              ) : (
                <Badge variant={isCanceled ? 'overdue' : 'paused'}>
                  {isCanceled ? 'Cancelada' : 'Pausada'}
                </Badge>
              )}

              <div className="flex shrink-0 items-center gap-1">
                {isActive && (
                  <button
                    type="button"
                    onClick={handleRegisterCharge}
                    disabled={pendingAction !== null}
                    title="Registrar pagamento e avançar o ciclo"
                    className={cn(
                      'inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-semibold transition-all',
                      'hover:border-foreground hover:bg-foreground hover:text-background disabled:opacity-50',
                      isOverdue || isImminent ? 'border-foreground' : 'border-border text-muted-foreground'
                    )}
                  >
                    {pendingAction === 'charge'
                      ? <Loader2 className="h-3 w-3 animate-spin" />
                      : <Check className="h-3 w-3" />}
                    Paguei
                  </button>
                )}

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52">
                    {onEdit && (
                      <DropdownMenuItem onClick={() => onEdit(subscription)}>
                        <Pencil className="h-4 w-4" /> Editar
                      </DropdownMenuItem>
                    )}
                    {isActive && (
                      <DropdownMenuItem disabled={pendingAction !== null} onClick={() => handleStatus('paused')}>
                        <Pause className="h-4 w-4" /> Pausar
                      </DropdownMenuItem>
                    )}
                    {!isActive && (
                      <DropdownMenuItem disabled={pendingAction !== null} onClick={() => handleStatus('active')}>
                        <Play className="h-4 w-4" /> Reativar
                      </DropdownMenuItem>
                    )}
                    {!isCanceled && (
                      <DropdownMenuItem disabled={pendingAction !== null} onClick={() => handleStatus('canceled')}>
                        <XCircle className="h-4 w-4" /> Marcar como cancelada
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="destructive" onClick={() => setConfirmDelete(true)}>
                      <Trash2 className="h-4 w-4" /> Excluir assinatura
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </div>

        {/* Trilha do ciclo: quanto já andou até a próxima cobrança. */}
        {isActive && (
          <div className="absolute inset-x-0 bottom-0 h-[3px] bg-muted">
            <div
              className={cn('h-full transition-[width] duration-500', isOverdue ? 'bg-foreground' : 'bg-foreground/45')}
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>
        )}
      </div>

      <ConfirmDeleteDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Excluir assinatura"
        description={`"${subscription.name}" sai do controle de recorrentes. Os pagamentos já registrados continuam no financeiro.`}
        onConfirm={async () => {
          const result = await deleteSubscription(subscription.id)
          if (result.error) {
            toast({ title: 'Erro', description: result.error, variant: 'destructive' })
            return
          }
          await onChanged?.()
        }}
      />
    </>
  )
}
