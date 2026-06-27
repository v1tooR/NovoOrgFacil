'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { taskSchema, type TaskInput } from '@/lib/validations/tasks'

export async function createTask(data: TaskInput) {
  const validated = taskSchema.safeParse(data)
  if (!validated.success) {
    return { error: 'Dados inválidos.' }
  }

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado.' }

  const { error } = await supabase.from('tasks').insert({
    ...validated.data,
    user_id: user.id,
    due_date: validated.data.due_date || null,
    due_time: validated.data.due_time || null,
    project_id: validated.data.project_id || null,
    client_id: validated.data.client_id || null,
  })

  if (error) return { error: 'Erro ao criar tarefa. Tente novamente.' }

  revalidatePath('/app')
  revalidatePath('/app/tarefas')
  return { success: true }
}

export async function updateTask(id: string, data: Partial<TaskInput>) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado.' }

  const { error } = await supabase
    .from('tasks')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: 'Erro ao atualizar tarefa.' }

  revalidatePath('/app')
  revalidatePath('/app/tarefas')
  return { success: true }
}

export async function toggleTaskStatus(id: string, completed: boolean) {
  return updateTask(id, { status: completed ? 'completed' : 'pending' })
}

export async function deleteTask(id: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado.' }

  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: 'Erro ao excluir tarefa.' }

  revalidatePath('/app')
  revalidatePath('/app/tarefas')
  return { success: true }
}
