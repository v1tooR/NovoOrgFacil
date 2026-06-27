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
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form'
import { noteSchema, type NoteInput } from '@/lib/validations/notes'
import { createNote, updateNote } from '@/actions/notes'
import { useToast } from '@/components/ui/use-toast'
import type { QuickNote } from '@/types'

interface CreateNoteDialogProps {
  trigger?: React.ReactNode
  editNote?: QuickNote | null
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function CreateNoteDialog({ trigger, editNote, open: controlledOpen, onOpenChange: controlledOnOpenChange }: CreateNoteDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const open = controlledOpen ?? internalOpen
  const setOpen = controlledOnOpenChange ?? setInternalOpen
  const { toast } = useToast()
  const isEdit = !!editNote

  const form = useForm<NoteInput>({
    resolver: zodResolver(noteSchema),
    defaultValues: { title: '', content: '', is_pinned: false },
  })

  useEffect(() => {
    if (editNote) {
      form.reset({
        title: editNote.title,
        content: editNote.content ?? '',
        is_pinned: editNote.is_pinned,
      })
    } else {
      form.reset({ title: '', content: '', is_pinned: false })
    }
  }, [editNote, form])

  async function onSubmit(data: NoteInput) {
    const result = isEdit
      ? await updateNote(editNote!.id, data)
      : await createNote(data)

    if (result.error) {
      toast({ title: 'Erro', description: result.error, variant: 'destructive' })
    } else {
      toast({ title: isEdit ? 'Nota atualizada!' : 'Nota criada!' })
      form.reset()
      setOpen(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!controlledOpen && (
        <DialogTrigger asChild>
          {trigger ?? <Button size="sm"><Plus className="h-4 w-4" />Nova nota</Button>}
        </DialogTrigger>
      )}
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar nota' : 'Nova nota rápida'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="title" render={({ field }) => (
              <FormItem>
                <FormLabel>Título *</FormLabel>
                <FormControl>
                  <Input placeholder="Título da nota" autoFocus {...field} />
                </FormControl>
              </FormItem>
            )} />

            <FormField control={form.control} name="content" render={({ field }) => (
              <FormItem>
                <FormLabel>Conteúdo</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Escreva sua nota aqui..."
                    className="min-h-[120px] resize-none"
                    {...field}
                    value={field.value ?? ''}
                  />
                </FormControl>
              </FormItem>
            )} />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? (
                  <><Loader2 className="h-4 w-4 animate-spin" />Salvando...</>
                ) : isEdit ? 'Salvar' : 'Criar nota'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
