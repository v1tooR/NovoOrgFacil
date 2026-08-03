'use client'

import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, MessageSquarePlus, Plus } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { createSubscription, updateSubscription } from '@/actions/subscriptions'
import { getFinancialCategories } from '@/actions/finance'
import { subscriptionSchema, type SubscriptionInput } from '@/lib/validations/subscription'
import { formatMoneyInput, parseMoneyInput } from '@/lib/finance'
import {
  SUBSCRIPTION_CYCLES,
  SUBSCRIPTION_CYCLE_ORDER,
  SUBSCRIPTION_PAYMENT_METHODS,
  SUBSCRIPTION_PRESETS,
  monthlyCost,
  toDateOnly,
  yearlyCost,
} from '@/lib/subscriptions'
import { EXPENSE_CATEGORIES, cn, formatCurrency } from '@/lib/utils'
import type { Client, FinancialCategory, Project, Subscription } from '@/types'

interface SubscriptionDialogProps {
  clients: Client[]
  projects: Project[]
  subscription?: Subscription
  trigger?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onSaved?: () => void | Promise<void>
}

/** Atalhos visíveis antes do usuário digitar — os mais usados primeiro. */
const QUICK_PRESETS = SUBSCRIPTION_PRESETS.slice(0, 8)

export function SubscriptionDialog({
  clients,
  projects,
  subscription,
  trigger,
  open: controlledOpen,
  onOpenChange,
  onSaved,
}: SubscriptionDialogProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false)
  const [customCategories, setCustomCategories] = useState<FinancialCategory[]>([])
  const [showNotes, setShowNotes] = useState(Boolean(subscription?.description))
  const { toast } = useToast()

  const open = controlledOpen ?? uncontrolledOpen
  const isEditing = Boolean(subscription)

  const form = useForm<SubscriptionInput>({
    resolver: zodResolver(subscriptionSchema),
    defaultValues: {
      name: subscription?.name ?? '',
      description: subscription?.description ?? '',
      amount: subscription?.amount ? Number(subscription.amount) : 0,
      cycle: subscription?.cycle ?? 'monthly',
      category: subscription?.category ?? 'Assinaturas',
      payment_method: subscription?.payment_method ?? '',
      next_charge_date: subscription?.next_charge_date ?? toDateOnly(new Date()),
      client_id: subscription?.client_id ?? null,
      project_id: subscription?.project_id ?? null,
    },
  })

  const amount = form.watch('amount') || 0
  const cycle = form.watch('cycle')
  const name = form.watch('name')

  useEffect(() => {
    if (!open) return
    let active = true
    getFinancialCategories().then((result) => {
      if (active) setCustomCategories(result.categories)
    })
    return () => { active = false }
  }, [open])

  const categories = useMemo(() => {
    const custom = customCategories.filter((category) => category.type === 'expense').map((category) => category.name)
    const unique = new Map<string, string>()
    for (const category of [...EXPENSE_CATEGORIES, ...custom]) {
      unique.set(category.toLocaleLowerCase('pt-BR'), category)
    }
    if (subscription?.category) unique.set(subscription.category.toLocaleLowerCase('pt-BR'), subscription.category)
    return Array.from(unique.values())
  }, [customCategories, subscription?.category])

  // Sempre renderizado (com traços quando vazio) para o modal não "pular".
  const preview = useMemo(() => {
    if (amount <= 0) return { month: '—', year: '—', day: '—' }
    const perMonth = monthlyCost({ amount, cycle })
    return {
      month: formatCurrency(perMonth),
      year: formatCurrency(yearlyCost({ amount, cycle })),
      day: formatCurrency(perMonth / 30),
    }
  }, [amount, cycle])

  const showPresets = !isEditing && !name.trim()

  function handleOpenChange(nextOpen: boolean) {
    onOpenChange?.(nextOpen)
    if (controlledOpen === undefined) setUncontrolledOpen(nextOpen)
    if (!nextOpen && !isEditing) {
      form.reset()
      setShowNotes(false)
    }
  }

  async function onSubmit(data: SubscriptionInput) {
    const result = subscription
      ? await updateSubscription(subscription.id, data)
      : await createSubscription(data)

    if (result.error) {
      toast({ title: 'Erro', description: result.error, variant: 'destructive' })
      return
    }

    toast({
      title: subscription ? 'Assinatura atualizada!' : 'Assinatura criada!',
      description: subscription
        ? undefined
        : `${formatCurrency(monthlyCost(data))} por mês no seu custo recorrente.`,
    })
    if (!subscription) form.reset()
    handleOpenChange(false)
    await onSaved?.()
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {trigger !== undefined && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="max-h-[90vh] gap-4 overflow-y-auto overflow-x-hidden sm:max-w-[620px]">
        <DialogHeader className="pr-8">
          <DialogTitle>{isEditing ? 'Editar assinatura' : 'Nova assinatura'}</DialogTitle>
          <DialogDescription className="text-balance">
            {isEditing
              ? 'Atualize valor, ciclo ou a data da próxima cobrança.'
              : 'Cadastre um gasto recorrente e veja o custo real por mês e por ano.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="min-w-0 space-y-4">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem className="min-w-0">
                <FormLabel>Nome *</FormLabel>
                <FormControl>
                  <Input placeholder="Netflix, aluguel da sala, academia…" autoFocus={!isEditing} {...field} />
                </FormControl>
                <FormMessage />
                {showPresets && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {QUICK_PRESETS.map((preset) => (
                      <button
                        key={preset.name}
                        type="button"
                        onClick={() => {
                          form.setValue('name', preset.name, { shouldValidate: true })
                          form.setValue('category', preset.category, { shouldValidate: true })
                        }}
                        className="rounded-full border bg-card px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:border-foreground hover:bg-foreground hover:text-background"
                      >
                        {preset.name}
                      </button>
                    ))}
                  </div>
                )}
              </FormItem>
            )} />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField control={form.control} name="amount" render={({ field }) => (
                <FormItem className="min-w-0">
                  <FormLabel>Valor *</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
                      <Input
                        type="text"
                        inputMode="numeric"
                        autoComplete="off"
                        placeholder="0,00"
                        className="pl-10 text-right font-medium tabular-nums"
                        value={formatMoneyInput(field.value)}
                        onBlur={field.onBlur}
                        onChange={(event) => field.onChange(parseMoneyInput(event.target.value))}
                        ref={field.ref}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="cycle" render={({ field }) => (
                <FormItem className="min-w-0">
                  <FormLabel>Ciclo *</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      {SUBSCRIPTION_CYCLE_ORDER.map((value) => (
                        <SelectItem key={value} value={value}>{SUBSCRIPTION_CYCLES[value].label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            {/* Custo normalizado: é o que revela o gasto real de ciclos longos. */}
            <div className={cn(
              'grid grid-cols-3 divide-x overflow-hidden rounded-xl border transition-colors',
              amount > 0 ? 'bg-muted/40' : 'bg-muted/20'
            )}>
              {[
                { label: 'Por mês', value: preview.month },
                { label: 'Por ano', value: preview.year },
                { label: 'Por dia', value: preview.day },
              ].map((item) => (
                <div key={item.label} className="min-w-0 px-2 py-2.5 text-center">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">{item.label}</p>
                  <p className={cn(
                    'mt-0.5 truncate text-sm font-bold tabular-nums',
                    amount <= 0 && 'text-muted-foreground'
                  )}>
                    {item.value}
                  </p>
                </div>
              ))}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField control={form.control} name="next_charge_date" render={({ field }) => (
                <FormItem className="min-w-0">
                  <FormLabel>Próxima cobrança *</FormLabel>
                  <FormControl><Input type="date" className="w-full" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="category" render={({ field }) => (
                <FormItem className="min-w-0">
                  <FormLabel>Categoria *</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {categories.map((category) => <SelectItem key={category} value={category}>{category}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField control={form.control} name="payment_method" render={({ field }) => (
                <FormItem className="min-w-0">
                  <FormLabel>Pagamento</FormLabel>
                  <Select
                    value={field.value || 'none'}
                    onValueChange={(value) => field.onChange(value === 'none' ? '' : value)}
                  >
                    <FormControl><SelectTrigger><SelectValue placeholder="Não informado" /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="none">Não informado</SelectItem>
                      {SUBSCRIPTION_PAYMENT_METHODS.map((method) => (
                        <SelectItem key={method} value={method}>{method}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />

              {clients.length > 0 && (
                <FormField control={form.control} name="client_id" render={({ field }) => (
                  <FormItem className="min-w-0">
                    <FormLabel>Cliente</FormLabel>
                    <Select value={field.value ?? 'none'} onValueChange={(value) => field.onChange(value === 'none' ? null : value)}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="none">Nenhum cliente</SelectItem>
                        {clients.map((client) => <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )} />
              )}

              {projects.length > 0 && (
                <FormField control={form.control} name="project_id" render={({ field }) => (
                  <FormItem className="min-w-0">
                    <FormLabel>Projeto</FormLabel>
                    <Select value={field.value ?? 'none'} onValueChange={(value) => field.onChange(value === 'none' ? null : value)}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="none">Nenhum projeto</SelectItem>
                        {projects.map((project) => <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )} />
              )}
            </div>

            {showNotes ? (
              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem className="min-w-0">
                  <FormLabel>Observações</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={2}
                      autoFocus={!isEditing}
                      placeholder="Plano contratado, quem usa, fidelidade…"
                      className="resize-none"
                      {...field}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            ) : (
              <button
                type="button"
                onClick={() => setShowNotes(true)}
                className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                <MessageSquarePlus className="h-3.5 w-3.5" />Adicionar observação
              </button>
            )}

            {/* Rodapé fixo: em telas baixas o botão continua ao alcance. */}
            <DialogFooter className="sticky bottom-0 -mx-5 -mb-5 gap-2 border-t bg-background px-5 py-3.5 sm:-mx-6 sm:-mb-6 sm:space-x-0 sm:px-6">
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>Cancelar</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting
                  ? <><Loader2 className="h-4 w-4 animate-spin" />Salvando...</>
                  : isEditing ? 'Salvar alterações' : <><Plus className="h-4 w-4" />Criar assinatura</>}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
