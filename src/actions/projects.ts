'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { projectSchema, type ProjectInput } from '@/lib/validations/projects'
import type { ProjectPhase, ProjectStatus } from '@/types'

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

export async function updateProjectStatus(id: string, status: ProjectStatus) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado.' }

  const { error } = await supabase
    .from('projects')
    .update({ status })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: 'Erro ao atualizar status.' }

  revalidatePath('/app/projetos')
  revalidatePath('/app')
  return { success: true }
}

export async function updateProjectPhases(id: string, phases: ProjectPhase[]) {
  // Guard: only accept a well-formed checklist so a bad payload can't corrupt the column.
  const clean = Array.isArray(phases)
    ? phases
        .filter((p) => p && typeof p.id === 'string' && typeof p.title === 'string')
        .map((p) => ({ id: p.id, title: p.title.slice(0, 200), done: Boolean(p.done) }))
    : []

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado.' }

  const { error } = await supabase
    .from('projects')
    .update({ phases: clean })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: 'Erro ao salvar fases.' }

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
