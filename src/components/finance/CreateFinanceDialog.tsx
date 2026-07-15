'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { CalendarDays, Check, CreditCard, Loader2, Plus, Repeat2, X } from 'lucide-react'
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { financeCreateSchema, type FinanceCreateInput } from '@/lib/validations/finance'
import {
  createFinancialCategory,
  createFinancialEntry,
  getFinancialCategories,
} from '@/actions/finance'
import { useToast } from '@/components/ui/use-toast'
import { addMonthsToDate, formatMoneyInput, parseMoneyInput, splitAmount } from '@/lib/finance'
import { EXPENSE_CATEGORIES, formatCurrency, INCOME_CATEGORIES } from '@/lib/utils'
import type { Client, FinancialCategory, Project } from '@/types'

interface CreateFinanceDialogProps {
  clients: Client[]
  projects: Project[]
  trigger?: React.ReactNode
  defaultType?: 'income' | 'expense'
  onCreated?: () => void | Promise<void>
}

function formatDateBr(date: string) {
  const [year, month, day] = date.split('-')
  return day && month && year ? `${day}/${month}/${year}` : date
}

export function CreateFinanceDialog({
  clients,
  projects,
  trigger,
  defaultType = 'income',
  onCreated,
}: CreateFinanceDialogProps) {
  const [open, setOpen] = useState(false)
  const [customCategories, setCustomCategories] = useState<FinancialCategory[]>([])
  const [loadingCategories, setLoadingCategories] = useState(false)
  const [addingCategory, setAddingCategory] = useState(false)
  const [categoryName, setCategoryName] = useState('')
  const [savingCategory, setSavingCategory] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  const form = useForm<FinanceCreateInput>({
    resolver: zodResolver(financeCreateSchema),
    defaultValues: {
      type: defaultType,
      title: '',
      description: '',
      amount: 0,
      category: '',
      status: 'pending',
      due_date: new Date().toISOString().split('T')[0],
      client_id: null,
      project_id: null,
      schedule_type: 'single',
      repeat_count: 2,
    },
  })

  const type = form.watch('type')
  const scheduleType = form.watch('schedule_type')
  const amount = form.watch('amount') || 0
  const repeatCount = form.watch('repeat_count') || 2
  const dueDate = form.watch('due_date')

  useEffect(() => {
    if (!open) return

    let active = true
    setLoadingCategories(true)
    getFinancialCategories().then((result) => {
      if (!active) return
      setLoadingCategories(false)
      setCustomCategories(result.categories)
      if (result.error) {
        toast({ title: 'Categorias', description: result.error, variant: 'destructive' })
      }
    })

    return () => { active = false }
  }, [open, toast])

  const categories = useMemo(() => {
    const defaults = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES
    const custom = customCategories.filter((category) => category.type === type).map((category) => category.name)
    const unique = new Map<string, string>()

    for (const name of [...defaults, ...custom]) unique.set(name.toLocaleLowerCase('pt-BR'), name)
    return Array.from(unique.values())
  }, [customCategories, type])

  const schedulePreview = useMemo(() => {
    if (scheduleType === 'single' || !dueDate || amount <= 0) return null

    const count = Math.min(60, Math.max(2, Number(repeatCount) || 2))
    const lastDate = addMonthsToDate(dueDate, count - 1)

    if (scheduleType === 'installment') {
      const installments = splitAmount(amount, count)
      const groups = new Map<number, number>()
      for (const installment of installments) {
        groups.set(installment, (groups.get(installment) ?? 0) + 1)
      }
      return {
        title: `${count} parcelas mensais`,
        description: Array.from(groups.entries())
          .map(([installment, quantity]) => `${quantity}x de ${formatCurrency(installment)}`)
          .join(' + '),
        total: `Total: ${formatCurrency(amount)}`,
        period: `${formatDateBr(dueDate)} até ${formatDateBr(lastDate)}`,
      }
    }

    return {
      title: `${count} lançamentos mensais`,
      description: `${count}x de ${formatCurrency(amount)}`,
      total: `Total previsto: ${formatCurrency(amount * count)}`,
      period: `${formatDateBr(dueDate)} até ${formatDateBr(lastDate)}`,
    }
  }, [amount, dueDate, repeatCount, scheduleType])

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen)
    if (!nextOpen) {
      setAddingCategory(false)
      setCategoryName('')
    }
  }

  async function handleCreateCategory() {
    const name = categoryName.trim()
    if (!name) return

    const existing = categories.find((category) => category.toLocaleLowerCase('pt-BR') === name.toLocaleLowerCase('pt-BR'))
    if (existing) {
      form.setValue('category', existing, { shouldValidate: true })
      setAddingCategory(false)
      setCategoryName('')
      return
    }

    setSavingCategory(true)
    const result = await createFinancialCategory({ type, name })
    setSavingCategory(false)

    if (result.error || !result.category) {
      toast({ title: 'Erro ao criar categoria', description: result.error, variant: 'destructive' })
      return
    }

    setCustomCategories((current) => [...current, result.category!])
    form.setValue('category', result.category.name, { shouldValidate: true })
    setAddingCategory(false)
    setCategoryName('')
    toast({ title: 'Categoria criada!' })
  }

  async function onSubmit(data: FinanceCreateInput) {
    const result = await createFinancialEntry(data)
    if (result.error) {
      toast({ title: 'Erro', description: result.error, variant: 'destructive' })
      return
    }

    const count = result.createdCount ?? 1
    toast({
      title: count > 1
        ? `${count} lançamentos criados!`
        : type === 'income' ? 'Receita criada!' : 'Despesa criada!',
      description: data.schedule_type === 'installment'
        ? 'O total foi dividido e distribuído pelos próximos meses.'
        : data.schedule_type === 'recurring'
          ? 'A recorrência mensal foi adicionada ao financeiro.'
          : undefined,
    })
    form.reset()
    handleOpenChange(false)
    await onCreated?.()
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger ?? <Button size="sm"><Plus className="h-4 w-4" />Novo lançamento</Button>}
      </DialogTrigger>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>Novo lançamento</DialogTitle>
          <DialogDescription>
            Registre uma movimentação única, parcelada ou recorrente.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField control={form.control} name="type" render={({ field }) => (
              <FormItem>
                <Tabs
                  value={field.value}
                  onValueChange={(value) => {
                    field.onChange(value)
                    form.setValue('category', '')
                    form.setValue('status', 'pending')
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
              <FormItem>
                <FormLabel>Título *</FormLabel>
                <FormControl>
                  <Input placeholder={type === 'income' ? 'Ex: Serviço de design' : 'Ex: Compra no cartão'} autoFocus {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField control={form.control} name="amount" render={({ field }) => (
                <FormItem>
                  <FormLabel>{scheduleType === 'installment' ? 'Valor total *' : 'Valor *'}</FormLabel>
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
                <FormItem>
                  <FormLabel>{scheduleType === 'single' ? 'Data *' : 'Primeiro vencimento *'}</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField control={form.control} name="category" render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between gap-2">
                    <FormLabel>Categoria *</FormLabel>
                    {loadingCategories && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
                  </div>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {categories.map((category) => <SelectItem key={category} value={category}>{category}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                  {!addingCategory ? (
                    <button
                      type="button"
                      className="flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                      onClick={() => setAddingCategory(true)}
                    >
                      <Plus className="h-3.5 w-3.5" />Criar categoria específica
                    </button>
                  ) : (
                    <div className="flex gap-1.5">
                      <Input
                        value={categoryName}
                        onChange={(event) => setCategoryName(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault()
                            handleCreateCategory()
                          }
                        }}
                        maxLength={60}
                        placeholder="Nome da categoria"
                        className="h-9"
                        autoFocus
                      />
                      <Button type="button" size="icon" className="h-9 w-9 shrink-0" disabled={savingCategory || !categoryName.trim()} onClick={handleCreateCategory}>
                        {savingCategory ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                      </Button>
                      <Button type="button" size="icon" variant="outline" className="h-9 w-9 shrink-0" onClick={() => { setAddingCategory(false); setCategoryName('') }}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </FormItem>
              )} />

              <FormField control={form.control} name="status" render={({ field }) => (
                <FormItem>
                  <FormLabel>Status da primeira cobrança</FormLabel>
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

            <FormField control={form.control} name="schedule_type" render={({ field }) => (
              <FormItem className="space-y-2">
                <FormLabel>Forma de lançamento</FormLabel>
                <Tabs value={field.value} onValueChange={field.onChange}>
                  <TabsList className="grid h-auto w-full grid-cols-3">
                    <TabsTrigger value="single" className="gap-1.5 px-2"><CalendarDays className="h-3.5 w-3.5" />Único</TabsTrigger>
                    <TabsTrigger value="installment" className="gap-1.5 px-2"><CreditCard className="h-3.5 w-3.5" />Parcelado</TabsTrigger>
                    <TabsTrigger value="recurring" className="gap-1.5 px-2"><Repeat2 className="h-3.5 w-3.5" />Recorrente</TabsTrigger>
                  </TabsList>
                </Tabs>
              </FormItem>
            )} />

            {scheduleType !== 'single' && (
              <div className="grid gap-3 rounded-xl border bg-muted/30 p-4 sm:grid-cols-[150px_1fr] sm:items-end">
                <FormField control={form.control} name="repeat_count" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{scheduleType === 'installment' ? 'Número de parcelas' : 'Número de meses'}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        inputMode="numeric"
                        min={2}
                        max={60}
                        {...field}
                        onChange={(event) => field.onChange(Number(event.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                {schedulePreview && (
                  <div className="rounded-lg border bg-card p-3 text-xs">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold text-foreground">{schedulePreview.title}</p>
                      <p className="font-medium tabular-nums">{schedulePreview.total}</p>
                    </div>
                    <p className="mt-1 text-muted-foreground">{schedulePreview.description}</p>
                    <p className="mt-1 text-muted-foreground">{schedulePreview.period}</p>
                  </div>
                )}
              </div>
            )}

            {(clients.length > 0 || projects.length > 0) && (
              <div className="grid gap-4 sm:grid-cols-2">
                {clients.length > 0 && (
                  <FormField control={form.control} name="client_id" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cliente</FormLabel>
                      <Select value={field.value ?? 'none'} onValueChange={(value) => field.onChange(value === 'none' ? null : value)}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Nenhum cliente" /></SelectTrigger></FormControl>
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
                    <FormItem>
                      <FormLabel>Projeto</FormLabel>
                      <Select value={field.value ?? 'none'} onValueChange={(value) => field.onChange(value === 'none' ? null : value)}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Nenhum projeto" /></SelectTrigger></FormControl>
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

            <DialogFooter className="gap-2 border-t pt-4 sm:space-x-0">
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>Cancelar</Button>
              <Button type="submit" disabled={form.formState.isSubmitting || savingCategory}>
                {form.formState.isSubmitting
                  ? <><Loader2 className="h-4 w-4 animate-spin" />Salvando...</>
                  : scheduleType === 'installment'
                    ? `Criar ${repeatCount || 2} parcelas`
                    : scheduleType === 'recurring'
                      ? `Criar ${repeatCount || 2} recorrências`
                      : 'Criar lançamento'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
