'use client'

import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Landmark, Loader2, Repeat } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/components/ui/use-toast'
import { getFinancialCategories, updateFinancialEntry } from '@/actions/finance'
import { financeSchema, type FinanceInput } from '@/lib/validations/finance'
import { formatMoneyInput, parseMoneyInput } from '@/lib/finance'
import { toDateOnly } from '@/lib/subscriptions'
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, formatCurrency } from '@/lib/utils'
import type { Client, FinancialCategory, FinancialEntry, Project } from '@/types'

interface EditFinanceDialogProps {
  entry: FinancialEntry
  clients: Client[]
  projects: Project[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved?: () => void | Promise<void>
}

export function EditFinanceDialog({
  entry,
  clients,
  projects,
  open,
  onOpenChange,
  onSaved,
}: EditFinanceDialogProps) {
  const [customCategories, setCustomCategories] = useState<FinancialCategory[]>([])
  const { toast } = useToast()

  const form = useForm<FinanceInput>({
    resolver: zodResolver(financeSchema),
    defaultValues: {
      type: entry.type,
      title: entry.title,
      description: entry.description ?? '',
      amount: Number(entry.amount),
      category: entry.category,
      status: entry.status,
      due_date: entry.due_date,
      paid_at: entry.paid_at,
      client_id: entry.client_id,
      project_id: entry.project_id,
    },
  })

  const type = form.watch('type')
  const amount = form.watch('amount') || 0

  useEffect(() => {
    if (!open) return
    let active = true
    getFinancialCategories().then((result) => {
      if (active) setCustomCategories(result.categories)
    })
    return () => { active = false }
  }, [open])

  const categories = useMemo(() => {
    const defaults = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES
    const custom = customCategories.filter((category) => category.type === type).map((category) => category.name)
    const unique = new Map<string, string>()
    for (const name of [...defaults, ...custom]) unique.set(name.toLocaleLowerCase('pt-BR'), name)
    // A categoria atual pode ter vindo de uma importação: nunca some da lista.
    if (entry.category) unique.set(entry.category.toLocaleLowerCase('pt-BR'), entry.category)
    return Array.from(unique.values())
  }, [customCategories, entry.category, type])

  async function onSubmit(data: FinanceInput) {
    // paid_at acompanha o status, como no fluxo de mudança rápida do card.
    const isSettled = data.status === 'paid' || data.status === 'received'
    const result = await updateFinancialEntry(entry.id, {
      ...data,
      paid_at: isSettled ? data.paid_at || toDateOnly(new Date()) : null,
    })

    if (result.error) {
      toast({ title: 'Erro', description: result.error, variant: 'destructive' })
      return
    }

    toast({ title: 'Lançamento atualizado!' })
    onOpenChange(false)
    await onSaved?.()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] gap-4 overflow-y-auto overflow-x-hidden sm:max-w-[620px]">
        <DialogHeader className="pr-8">
          <DialogTitle>Editar lançamento</DialogTitle>
          <DialogDescription className="text-balance">
            Ajuste valor, categoria, data ou situação deste lançamento.
          </DialogDescription>
        </DialogHeader>

        {(entry.import_source === 'ofx' || entry.subscription_id || entry.series_id) && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
            {entry.import_source === 'ofx' && (
              <span className="flex items-center gap-1.5"><Landmark className="h-3.5 w-3.5" />Importado do extrato</span>
            )}
            {entry.subscription_id && (
              <span className="flex items-center gap-1.5"><Repeat className="h-3.5 w-3.5" />Pagamento de assinatura</span>
            )}
            {entry.series_id && entry.series_number && entry.series_count && (
              <span>Parcela {entry.series_number}/{entry.series_count} · editar afeta só esta</span>
            )}
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="min-w-0 space-y-4">
            <FormField control={form.control} name="type" render={({ field }) => (
              <FormItem className="min-w-0">
                <Tabs
                  value={field.value}
                  onValueChange={(value) => {
                    field.onChange(value)
                    // Status e categorias são específicos do tipo.
                    form.setValue('status', 'pending')
                    if (!categories.includes(form.getValues('category'))) form.setValue('category', '')
                  }}
                >
                  <TabsList className="w-full">
                    <TabsTrigger value="income" className="flex-1">Receita</TabsTrigger>
                    <TabsTrigger value="expense" className="flex-1">Despesa</TabsTrigger>
                  </TabsList>
                </Tabs>
              </FormItem>
            )} />

            <FormField control={form.control} name="title" render={({ field }) => (
              <FormItem className="min-w-0">
                <FormLabel>Título *</FormLabel>
                <FormControl><Input autoFocus {...field} /></FormControl>
                <FormMessage />
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

              <FormField control={form.control} name="due_date" render={({ field }) => (
                <FormItem className="min-w-0">
                  <FormLabel>Data *</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
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

              <FormField control={form.control} name="status" render={({ field }) => (
                <FormItem className="min-w-0">
                  <FormLabel>Situação</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="pending">Pendente</SelectItem>
                      {type === 'income'
                        ? <SelectItem value="received">Recebido</SelectItem>
                        : <SelectItem value="paid">Pago</SelectItem>}
                      <SelectItem value="overdue">Atrasado</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />
            </div>

            {(clients.length > 0 || projects.length > 0) && (
              <div className="grid gap-4 sm:grid-cols-2">
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
            )}

            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem className="min-w-0">
                <FormLabel>Observações</FormLabel>
                <FormControl>
                  <Textarea rows={2} className="resize-none" {...field} value={field.value ?? ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <DialogFooter className="sticky bottom-0 -mx-5 -mb-5 items-center gap-2 border-t bg-background px-5 py-3.5 sm:-mx-6 sm:-mb-6 sm:space-x-0 sm:px-6">
              <span className="mr-auto hidden text-xs text-muted-foreground tabular-nums sm:block">
                {type === 'income' ? '+' : '-'}{formatCurrency(amount)}
              </span>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting
                  ? <><Loader2 className="h-4 w-4 animate-spin" />Salvando...</>
                  : 'Salvar alterações'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
