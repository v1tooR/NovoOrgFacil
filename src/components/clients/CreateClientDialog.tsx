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
import { clientSchema, type ClientInput } from '@/lib/validations/clients'
import { createClient_, updateClient } from '@/actions/clients'
import { useToast } from '@/components/ui/use-toast'
import type { Client } from '@/types'

interface CreateClientDialogProps {
  trigger?: React.ReactNode
  editClient?: Client | null
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function CreateClientDialog({ trigger, editClient, open: controlledOpen, onOpenChange: controlledOnOpenChange }: CreateClientDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const open = controlledOpen ?? internalOpen
  const setOpen = controlledOnOpenChange ?? setInternalOpen
  const { toast } = useToast()
  const isEdit = !!editClient

  const form = useForm<ClientInput>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      name: '', company: '', email: '', phone: '', notes: '',
    },
  })

  useEffect(() => {
    if (editClient) {
      form.reset({
        name: editClient.name,
        company: editClient.company ?? '',
        email: editClient.email ?? '',
        phone: editClient.phone ?? '',
        notes: editClient.notes ?? '',
      })
    } else {
      form.reset({ name: '', company: '', email: '', phone: '', notes: '' })
    }
  }, [editClient, form])

  async function onSubmit(data: ClientInput) {
    const result = isEdit
      ? await updateClient(editClient!.id, data)
      : await createClient_(data)

    if (result.error) {
      toast({ title: 'Erro', description: result.error, variant: 'destructive' })
    } else {
      toast({ title: isEdit ? 'Cliente atualizado!' : 'Cliente criado!' })
      form.reset()
      setOpen(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!controlledOpen && (
        <DialogTrigger asChild>
          {trigger ?? <Button size="sm"><Plus className="h-4 w-4" />Novo cliente</Button>}
        </DialogTrigger>
      )}
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar cliente' : 'Novo cliente'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel>Nome *</FormLabel>
                <FormControl><Input placeholder="Nome do cliente" autoFocus {...field} /></FormControl>
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

            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem>
                <FormLabel>Observações</FormLabel>
                <FormControl>
                  <Textarea placeholder="Informações adicionais..." className="h-20 resize-none" {...field} value={field.value ?? ''} />
                </FormControl>
              </FormItem>
            )} />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? (
                  <><Loader2 className="h-4 w-4 animate-spin" />Salvando...</>
                ) : isEdit ? 'Salvar' : 'Criar cliente'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
