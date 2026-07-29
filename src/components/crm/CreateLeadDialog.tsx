'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Plus } from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { leadSchema, type LeadInput } from '@/lib/validations/leads'
import { createLead, updateLead } from '@/actions/leads'
import { useToast } from '@/components/ui/use-toast'
import { LEAD_STAGES, LEAD_STAGE_LABELS, LEAD_SOURCES } from '@/lib/utils'
import type { Lead } from '@/types'

interface CreateLeadDialogProps {
  trigger?: React.ReactNode
  editLead?: Lead | null
  defaultStage?: LeadInput['stage']
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onSuccess?: () => void
}

const emptyLead: LeadInput = {
  name: '', company: '', email: '', phone: '', source: '',
  stage: 'new', value: 0, notes: '', expected_close_date: '', lost_reason: '',
}

export function CreateLeadDialog({
  trigger, editLead, defaultStage, open: controlledOpen, onOpenChange: controlledOnOpenChange, onSuccess,
}: CreateLeadDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const open = controlledOpen ?? internalOpen
  const setOpen = controlledOnOpenChange ?? setInternalOpen
  const { toast } = useToast()
  const isEdit = !!editLead

  const form = useForm<LeadInput>({
    resolver: zodResolver(leadSchema),
    defaultValues: { ...emptyLead, stage: defaultStage ?? 'new' },
  })

  useEffect(() => {
    if (editLead) {
      form.reset({
        name: editLead.name,
        company: editLead.company ?? '',
        email: editLead.email ?? '',
        phone: editLead.phone ?? '',
        source: editLead.source ?? '',
        stage: editLead.stage,
        value: editLead.value ?? 0,
        notes: editLead.notes ?? '',
        expected_close_date: editLead.expected_close_date ?? '',
        lost_reason: editLead.lost_reason ?? '',
      })
    } else {
      form.reset({ ...emptyLead, stage: defaultStage ?? 'new' })
    }
  }, [editLead, defaultStage, form])

  const stage = form.watch('stage')

  async function onSubmit(data: LeadInput) {
    const result = isEdit ? await updateLead(editLead!.id, data) : await createLead(data)
    if (result.error) {
      toast({ title: 'Erro', description: result.error, variant: 'destructive' })
    } else {
      toast({ title: isEdit ? 'Lead atualizado!' : 'Lead criado!' })
      form.reset({ ...emptyLead, stage: defaultStage ?? 'new' })
      setOpen(false)
      onSuccess?.()
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!controlledOpen && (
        <DialogTrigger asChild>
          {trigger ?? <Button size="sm"><Plus className="h-4 w-4" />Novo lead</Button>}
        </DialogTrigger>
      )}
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar lead' : 'Novo lead'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel>Nome do contato *</FormLabel>
                <FormControl><Input placeholder="Ex: Maria Silva" autoFocus {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="company" render={({ field }) => (
                <FormItem>
                  <FormLabel>Empresa</FormLabel>
                  <FormControl><Input placeholder="Empresa" {...field} value={field.value ?? ''} /></FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="phone" render={({ field }) => (
                <FormItem>
                  <FormLabel>Telefone</FormLabel>
                  <FormControl><Input placeholder="(00) 00000-0000" {...field} value={field.value ?? ''} /></FormControl>
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="email" render={({ field }) => (
              <FormItem>
                <FormLabel>E-mail</FormLabel>
                <FormControl><Input type="email" placeholder="email@exemplo.com" {...field} value={field.value ?? ''} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="value" render={({ field }) => (
                <FormItem>
                  <FormLabel>Valor estimado (R$)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" min="0" placeholder="0,00" {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="expected_close_date" render={({ field }) => (
                <FormItem>
                  <FormLabel>Previsão de fechamento</FormLabel>
                  <FormControl><Input type="date" {...field} value={field.value ?? ''} /></FormControl>
                </FormItem>
              )} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="stage" render={({ field }) => (
                <FormItem>
                  <FormLabel>Estágio</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      {LEAD_STAGES.map((s) => <SelectItem key={s} value={s}>{LEAD_STAGE_LABELS[s]}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />
              <FormField control={form.control} name="source" render={({ field }) => (
                <FormItem>
                  <FormLabel>Origem</FormLabel>
                  <Select value={field.value ?? ''} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {LEAD_SOURCES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />
            </div>

            {stage === 'lost' && (
              <FormField control={form.control} name="lost_reason" render={({ field }) => (
                <FormItem>
                  <FormLabel>Motivo da perda</FormLabel>
                  <FormControl><Input placeholder="Ex: preço, concorrente, sem retorno..." {...field} value={field.value ?? ''} /></FormControl>
                </FormItem>
              )} />
            )}

            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem>
                <FormLabel>Observações</FormLabel>
                <FormControl>
                  <Textarea placeholder="Anotações sobre o lead..." className="h-20 resize-none" {...field} value={field.value ?? ''} />
                </FormControl>
              </FormItem>
            )} />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? (
                  <><Loader2 className="h-4 w-4 animate-spin" />Salvando...</>
                ) : isEdit ? 'Salvar' : 'Criar lead'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
