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
import { projectSchema, type ProjectInput } from '@/lib/validations/projects'
import { createProject, updateProject } from '@/actions/projects'
import { useToast } from '@/components/ui/use-toast'
import type { Client, Project } from '@/types'

interface CreateProjectDialogProps {
  clients: Client[]
  trigger?: React.ReactNode
  editProject?: Project | null
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onSuccess?: () => void
}

export function CreateProjectDialog({ clients, trigger, editProject, open: controlledOpen, onOpenChange: controlledOnOpenChange, onSuccess }: CreateProjectDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const open = controlledOpen ?? internalOpen
  const setOpen = controlledOnOpenChange ?? setInternalOpen
  const isEdit = !!editProject
  const { toast } = useToast()

  const form = useForm<ProjectInput>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: editProject?.name ?? '',
      description: editProject?.description ?? '',
      status: editProject?.status ?? 'planning',
      client_id: editProject?.client_id ?? null,
      deadline: editProject?.deadline ?? '',
    },
  })

  // Keep the form in sync when opening in edit mode (or switching target project).
  useEffect(() => {
    if (open && editProject) {
      form.reset({
        name: editProject.name,
        description: editProject.description ?? '',
        status: editProject.status,
        client_id: editProject.client_id ?? null,
        deadline: editProject.deadline ?? '',
      })
    }
  }, [open, editProject, form])

  async function onSubmit(data: ProjectInput) {
    const result = isEdit
      ? await updateProject(editProject!.id, data)
      : await createProject(data)
    if (result.error) {
      toast({ title: 'Erro', description: result.error, variant: 'destructive' })
    } else {
      toast({ title: isEdit ? 'Projeto atualizado!' : 'Projeto criado!' })
      if (!isEdit) form.reset()
      setOpen(false)
      onSuccess?.()
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {controlledOpen === undefined && (
        <DialogTrigger asChild>
          {trigger ?? <Button size="sm"><Plus className="h-4 w-4" />Novo projeto</Button>}
        </DialogTrigger>
      )}
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar projeto' : 'Novo projeto'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel>Nome *</FormLabel>
                <FormControl><Input placeholder="Nome do projeto" autoFocus {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="status" render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="planning">Planejamento</SelectItem>
                      <SelectItem value="in_progress">Em andamento</SelectItem>
                      <SelectItem value="waiting_client">Aguardando cliente</SelectItem>
                      <SelectItem value="completed">Concluído</SelectItem>
                      <SelectItem value="paused">Pausado</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />

              <FormField control={form.control} name="deadline" render={({ field }) => (
                <FormItem>
                  <FormLabel>Prazo</FormLabel>
                  <FormControl><Input type="date" {...field} value={field.value ?? ''} /></FormControl>
                </FormItem>
              )} />
            </div>

            {clients.length > 0 && (
              <FormField control={form.control} name="client_id" render={({ field }) => (
                <FormItem>
                  <FormLabel>Cliente</FormLabel>
                  <Select value={field.value ?? 'none'} onValueChange={(v) => field.onChange(v === 'none' ? null : v)}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Nenhum cliente" /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="none">Nenhum cliente</SelectItem>
                      {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />
            )}

            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem>
                <FormLabel>Descrição</FormLabel>
                <FormControl>
                  <Textarea placeholder="Descreva o projeto..." className="h-20 resize-none" {...field} value={field.value ?? ''} />
                </FormControl>
              </FormItem>
            )} />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? <><Loader2 className="h-4 w-4 animate-spin" />Salvando...</> : isEdit ? 'Salvar' : 'Criar projeto'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
