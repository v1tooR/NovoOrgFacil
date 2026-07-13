'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { financeSchema, financeStatusSchema, type FinanceInput } from '@/lib/validations/finance'
import type { FinancialStatus } from '@/types'

export async function createFinancialEntry(data: FinanceInput) {
  const validated = financeSchema.safeParse(data)
  if (!validated.success) return { error: 'Dados inválidos.' }

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado.' }

  const { error } = await supabase.from('financial_entries').insert({
    ...validated.data,
    user_id: user.id,
    client_id: validated.data.client_id || null,
    project_id: validated.data.project_id || null,
    paid_at: validated.data.paid_at || null,
    description: validated.data.description || null,
  })

  if (error) return { error: 'Erro ao criar lançamento.' }

  revalidatePath('/app/financeiro')
  revalidatePath('/app')
  return { success: true }
}

export async function updateFinancialEntry(id: string, data: FinanceInput) {
  const validated = financeSchema.safeParse(data)
  if (!validated.success) return { error: 'Dados inválidos.' }

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado.' }

  const { error } = await supabase
    .from('financial_entries')
    .update({
      ...validated.data,
      client_id: validated.data.client_id || null,
      project_id: validated.data.project_id || null,
      paid_at: validated.data.paid_at || null,
    })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: 'Erro ao atualizar lançamento.' }

  revalidatePath('/app/financeiro')
  return { success: true }
}

export async function updateFinancialEntryStatus(id: string, status: FinancialStatus) {
  const validated = financeStatusSchema.safeParse({ status })
  if (!validated.success) return { error: 'Status inválido.' }

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado.' }

  // Registra a data de pagamento/recebimento; limpa quando volta a pendente/atrasado.
  const isSettled = status === 'paid' || status === 'received'
  const { error } = await supabase
    .from('financial_entries')
    .update({
      status,
      paid_at: isSettled ? new Date().toISOString() : null,
    })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: 'Erro ao atualizar status.' }

  revalidatePath('/app/financeiro')
  revalidatePath('/app')
  return { success: true }
}

export async function deleteFinancialEntry(id: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado.' }

  const { error } = await supabase
    .from('financial_entries')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: 'Erro ao excluir lançamento.' }

  revalidatePath('/app/financeiro')
  return { success: true }
}
