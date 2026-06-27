'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { noteSchema, type NoteInput } from '@/lib/validations/notes'

export async function createNote(data: NoteInput) {
  const validated = noteSchema.safeParse(data)
  if (!validated.success) return { error: 'Dados inválidos.' }

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado.' }

  const { error } = await supabase.from('quick_notes').insert({
    ...validated.data,
    user_id: user.id,
    client_id: validated.data.client_id || null,
    project_id: validated.data.project_id || null,
    content: validated.data.content || null,
  })

  if (error) return { error: 'Erro ao criar nota.' }

  revalidatePath('/app/notas')
  revalidatePath('/app')
  return { success: true }
}

export async function updateNote(id: string, data: NoteInput) {
  const validated = noteSchema.safeParse(data)
  if (!validated.success) return { error: 'Dados inválidos.' }

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado.' }

  const { error } = await supabase
    .from('quick_notes')
    .update({
      ...validated.data,
      client_id: validated.data.client_id || null,
      project_id: validated.data.project_id || null,
    })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: 'Erro ao atualizar nota.' }

  revalidatePath('/app/notas')
  return { success: true }
}

export async function toggleNotePin(id: string, isPinned: boolean) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado.' }

  const { error } = await supabase
    .from('quick_notes')
    .update({ is_pinned: isPinned })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: 'Erro ao atualizar nota.' }

  revalidatePath('/app/notas')
  return { success: true }
}

export async function deleteNote(id: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado.' }

  const { error } = await supabase
    .from('quick_notes')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: 'Erro ao excluir nota.' }

  revalidatePath('/app/notas')
  return { success: true }
}
