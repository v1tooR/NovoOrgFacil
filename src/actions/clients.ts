'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { clientSchema, type ClientInput } from '@/lib/validations/clients'

export async function createClient_(data: ClientInput) {
  const validated = clientSchema.safeParse(data)
  if (!validated.success) return { error: 'Dados inválidos.' }

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado.' }

  const { error } = await supabase.from('clients').insert({
    ...validated.data,
    user_id: user.id,
    email: validated.data.email || null,
    company: validated.data.company || null,
    phone: validated.data.phone || null,
    notes: validated.data.notes || null,
  })

  if (error) return { error: 'Erro ao criar cliente.' }

  revalidatePath('/app/clientes')
  revalidatePath('/app')
  return { success: true }
}

export async function updateClient(id: string, data: ClientInput) {
  const validated = clientSchema.safeParse(data)
  if (!validated.success) return { error: 'Dados inválidos.' }

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado.' }

  const { error } = await supabase
    .from('clients')
    .update({ ...validated.data, email: validated.data.email || null })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: 'Erro ao atualizar cliente.' }

  revalidatePath('/app/clientes')
  return { success: true }
}

export async function deleteClient(id: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado.' }

  const { error } = await supabase
    .from('clients')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: 'Erro ao excluir cliente.' }

  revalidatePath('/app/clientes')
  return { success: true }
}
