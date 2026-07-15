'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Pin, Plus, X } from 'lucide-react'
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
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { noteSchema, type NoteInput } from '@/lib/validations/notes'
import { createNote, updateNote } from '@/actions/notes'
import { useToast } from '@/components/ui/use-toast'
import { cn } from '@/lib/utils'
import type { NoteColor, QuickNote } from '@/types'

const DRAFT_KEY = 'notas:nova:rascunho'

const EMPTY_NOTE: NoteInput = {
  title: '',
  content: '',
  is_pinned: false,
  tags: [],
  note_color: 'default',
  is_archived: false,
  client_id: null,
  project_id: null,
}

const NOTE_COLORS: { value: NoteColor; label: string; className: string }[] = [
  { value: 'default', label: 'Neutra', className: 'bg-card border-foreground/30' },
  { value: 'yellow', label: 'Amarela', className: 'bg-amber-300 border-amber-500' },
  { value: 'blue', label: 'Azul', className: 'bg-blue-400 border-blue-600' },
  { value: 'green', label: 'Verde', className: 'bg-emerald-400 border-emerald-600' },
  { value: 'rose', label: 'Rosa', className: 'bg-rose-400 border-rose-600' },
  { value: 'purple', label: 'Roxa', className: 'bg-violet-400 border-violet-600' },
]

interface CreateNoteDialogProps {
  trigger?: React.ReactNode
  editNote?: QuickNote | null
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onSaved?: () => void | Promise<void>
}

export function CreateNoteDialog({
  trigger,
  editNote,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  onSaved,
}: CreateNoteDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const [tagInput, setTagInput] = useState('')
  const isControlled = controlledOpen !== undefined
  const open = controlledOpen ?? internalOpen
  const setOpen = controlledOnOpenChange ?? setInternalOpen
  const { toast } = useToast()
  const isEdit = Boolean(editNote)

  const form = useForm<NoteInput>({
    resolver: zodResolver(noteSchema),
    defaultValues: EMPTY_NOTE,
  })

  useEffect(() => {
    if (!open) return
    setTagInput('')

    if (editNote) {
      form.reset({
        title: editNote.title,
        content: editNote.content ?? '',
        is_pinned: editNote.is_pinned,
        tags: editNote.tags ?? [],
        note_color: editNote.note_color ?? 'default',
        is_archived: editNote.is_archived ?? false,
      })
      return
    }

    try {
      const draft = window.localStorage.getItem(DRAFT_KEY)
      form.reset(draft ? { ...EMPTY_NOTE, ...JSON.parse(draft) } : EMPTY_NOTE)
    } catch {
      form.reset(EMPTY_NOTE)
    }
  }, [editNote, form, open])

  useEffect(() => {
    if (!open || isEdit) return

    const subscription = form.watch((value) => {
      const hasDraft = Boolean(value.title?.trim() || value.content?.trim() || value.tags?.length)
      if (hasDraft) window.localStorage.setItem(DRAFT_KEY, JSON.stringify(value))
      else window.localStorage.removeItem(DRAFT_KEY)
    })

    return () => subscription.unsubscribe()
  }, [form, isEdit, open])

  function addTag(value: string) {
    const tag = value.trim().replace(/^#/, '')
    const current = form.getValues('tags')
    if (!tag || current.length >= 10) return
    if (current.some((item) => item.toLocaleLowerCase('pt-BR') === tag.toLocaleLowerCase('pt-BR'))) {
      setTagInput('')
      return
    }

    form.setValue('tags', [...current, tag], { shouldDirty: true, shouldValidate: true })
    setTagInput('')
  }

  async function onSubmit(data: NoteInput) {
    const result = isEdit
      ? await updateNote(editNote!.id, data)
      : await createNote(data)

    if (result.error) {
      toast({ title: 'Erro', description: result.error, variant: 'destructive' })
      return
    }

    if (!isEdit) window.localStorage.removeItem(DRAFT_KEY)
    toast({ title: isEdit ? 'Nota atualizada!' : 'Nota criada!' })
    setOpen(false)
    form.reset(EMPTY_NOTE)
    await onSaved?.()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!isControlled && (
        <DialogTrigger asChild>
          {trigger ?? <Button size="sm"><Plus className="h-4 w-4" />Nova nota</Button>}
        </DialogTrigger>
      )}
      <DialogContent className="max-h-[92vh] max-w-xl overflow-y-auto sm:max-w-[620px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar nota' : 'Capture uma ideia'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Ajuste o conteúdo e a organização da nota.' : 'Escreva primeiro; título e organização podem vir depois.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
                event.preventDefault()
                form.handleSubmit(onSubmit)()
              }
            }}
            className="space-y-5"
          >
            <FormField control={form.control} name="content" render={({ field }) => (
              <FormItem>
                <FormLabel>Nota</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="O que você quer lembrar?"
                    className="min-h-[190px] resize-y text-sm leading-relaxed sm:min-h-[240px]"
                    autoFocus
                    {...field}
                    value={field.value ?? ''}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="title" render={({ field }) => (
              <FormItem>
                <FormLabel>Título <span className="font-normal text-muted-foreground">(opcional)</span></FormLabel>
                <FormControl>
                  <Input placeholder="Gerado pela primeira linha se ficar vazio" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="tags" render={({ field }) => (
              <FormItem>
                <FormLabel>Tags <span className="font-normal text-muted-foreground">(opcional)</span></FormLabel>
                <div className="rounded-md border bg-card p-2 focus-within:border-foreground focus-within:ring-1 focus-within:ring-ring">
                  {field.value.length > 0 && (
                    <div className="mb-2 flex flex-wrap gap-1.5">
                      {field.value.map((tag) => (
                        <span key={tag} className="inline-flex items-center gap-1 rounded-full border bg-muted px-2 py-1 text-[11px]">
                          #{tag}
                          <button
                            type="button"
                            onClick={() => field.onChange(field.value.filter((item) => item !== tag))}
                            className="rounded-full text-muted-foreground hover:text-foreground"
                            aria-label={`Remover tag ${tag}`}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  <input
                    value={tagInput}
                    onChange={(event) => setTagInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ',') {
                        event.preventDefault()
                        addTag(tagInput)
                      }
                    }}
                    onBlur={() => addTag(tagInput)}
                    maxLength={30}
                    placeholder={field.value.length ? 'Adicionar outra tag' : 'Digite e pressione Enter'}
                    className="h-7 w-full bg-transparent px-1 text-sm outline-none placeholder:text-muted-foreground/70"
                  />
                </div>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid gap-4 border-t pt-4 sm:grid-cols-[1fr_auto] sm:items-end">
              <FormField control={form.control} name="note_color" render={({ field }) => (
                <FormItem>
                  <FormLabel>Cor de destaque</FormLabel>
                  <div className="flex flex-wrap gap-2">
                    {NOTE_COLORS.map((color) => (
                      <button
                        key={color.value}
                        type="button"
                        title={color.label}
                        aria-label={color.label}
                        aria-pressed={field.value === color.value}
                        onClick={() => field.onChange(color.value)}
                        className={cn(
                          'h-7 w-7 rounded-full border-2 transition-transform hover:scale-110',
                          color.className,
                          field.value === color.value && 'ring-2 ring-foreground ring-offset-2 ring-offset-background'
                        )}
                      />
                    ))}
                  </div>
                </FormItem>
              )} />

              <FormField control={form.control} name="is_pinned" render={({ field }) => (
                <FormItem className="flex items-center gap-2 rounded-lg border px-3 py-2.5">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <FormLabel className="flex cursor-pointer items-center gap-1.5 text-xs font-medium">
                    <Pin className="h-3.5 w-3.5" />Fixar nota
                  </FormLabel>
                </FormItem>
              )} />
            </div>

            <DialogFooter className="gap-2 sm:items-center sm:justify-between sm:space-x-0">
              <p className="text-[10px] text-muted-foreground">
                {!isEdit ? 'Rascunho salvo neste dispositivo · ' : ''}<kbd className="rounded border px-1 py-0.5">Ctrl/⌘ + Enter</kbd>
              </p>
              <div className="flex flex-col-reverse gap-2 sm:flex-row">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting
                    ? <><Loader2 className="h-4 w-4 animate-spin" />Salvando...</>
                    : isEdit ? 'Salvar alterações' : 'Salvar nota'}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
