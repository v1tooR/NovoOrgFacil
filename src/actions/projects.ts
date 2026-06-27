'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { projectSchema, type ProjectInput } from '@/lib/validations/projects'

export async function createProject(data: ProjectInput) {
  const validated = projectSchema.safeParse(data)
  if (!validated.success) return { error: 'Dados inválidos.' }

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado.' }

  const { error } = await supabase.from('projects').insert({
    ...validated.data,
    user_id: user.id,
    client_id: validated.data.client_id || null,
    deadline: validated.data.deadline || null,
    description: validated.data.description || null,
  })

  if (error) return { error: 'Erro ao criar projeto.' }

  revalidatePath('/app/projetos')
  revalidatePath('/app')
  return { success: true }
}

export async function updateProject(id: string, data: ProjectInput) {
  const validated = projectSchema.safeParse(data)
  if (!validated.success) return { error: 'Dados inválidos.' }

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado.' }

  const { error } = await supabase
    .from('projects')
    .update({
      ...validated.data,
      client_id: validated.data.client_id || null,
      deadline: validated.data.deadline || null,
    })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: 'Erro ao atualizar projeto.' }

  revalidatePath('/app/projetos')
  return { success: true }
}

export async function deleteProject(id: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado.' }

  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: 'Erro ao excluir projeto.' }

  revalidatePath('/app/projetos')
  return { success: true }
}
