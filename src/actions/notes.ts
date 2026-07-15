'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { hasFreelancerAccess } from '@/lib/supabase/access'
import { noteSchema, type NoteInput } from '@/lib/validations/notes'

function normalizedNote(data: NoteInput) {
  const content = data.content?.trim() || null
  const generatedTitle = content?.split('\n').find((line) => line.trim())?.trim().slice(0, 80)
  const uniqueTags = new Map<string, string>()
  for (const tag of data.tags) uniqueTags.set(tag.toLocaleLowerCase('pt-BR'), tag)

  return {
    ...data,
    title: data.title.trim() || generatedTitle || 'Nota sem título',
    content,
    tags: Array.from(uniqueTags.values()),
  }
}

export async function createNote(data: NoteInput) {
  const validated = noteSchema.safeParse(data)
  if (!validated.success) return { error: 'Dados inválidos.' }

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado.' }

  const requestedProfessionalLink = Boolean(validated.data.client_id || validated.data.project_id)
  const canUseProfessionalLinks = !requestedProfessionalLink
    || await hasFreelancerAccess(supabase, user.id)
  const note = normalizedNote(validated.data)

  const { error } = await supabase.from('quick_notes').insert({
    ...note,
    user_id: user.id,
    client_id: canUseProfessionalLinks ? note.client_id || null : null,
    project_id: canUseProfessionalLinks ? note.project_id || null : null,
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

  const requestedProfessionalLink = Boolean(validated.data.client_id || validated.data.project_id)
  const canUseProfessionalLinks = !requestedProfessionalLink
    || await hasFreelancerAccess(supabase, user.id)
  const note = normalizedNote(validated.data)
  const { client_id, project_id, ...noteFields } = note
  const patch: Record<string, unknown> = noteFields

  if (client_id !== undefined) {
    patch.client_id = canUseProfessionalLinks ? client_id || null : null
  }
  if (project_id !== undefined) {
    patch.project_id = canUseProfessionalLinks ? project_id || null : null
  }

  const { error } = await supabase
    .from('quick_notes')
    .update(patch)
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

export async function toggleNoteArchive(id: string, isArchived: boolean) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado.' }

  const { error } = await supabase
    .from('quick_notes')
    .update({ is_archived: isArchived, ...(isArchived ? { is_pinned: false } : {}) })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: isArchived ? 'Erro ao arquivar nota.' : 'Erro ao restaurar nota.' }

  revalidatePath('/app/notas')
  revalidatePath('/app')
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
