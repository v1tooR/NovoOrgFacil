'use server'

import { revalidatePath } from 'next/cache'
import { randomUUID } from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { hasFreelancerAccess } from '@/lib/supabase/access'
import { addMonthsToDate, splitAmount } from '@/lib/finance'
import {
  financeCreateSchema,
  financeSchema,
  financeStatusSchema,
  financialCategorySchema,
  financialSeriesIdSchema,
  type FinanceCreateInput,
  type FinanceInput,
} from '@/lib/validations/finance'
import type { FinancialCategory, FinancialStatus } from '@/types'

export async function createFinancialEntry(data: FinanceCreateInput) {
  const validated = financeCreateSchema.safeParse(data)
  if (!validated.success) return { error: 'Dados inválidos.' }

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado.' }

  const requestedProfessionalLink = Boolean(validated.data.client_id || validated.data.project_id)
  const canUseProfessionalLinks = !requestedProfessionalLink
    || await hasFreelancerAccess(supabase, user.id)

  const { schedule_type, repeat_count, ...entry } = validated.data
  const count = schedule_type === 'single' ? 1 : repeat_count
  const seriesId = schedule_type === 'single' ? null : randomUUID()
  const amounts = schedule_type === 'installment'
    ? splitAmount(entry.amount, count)
    : Array.from({ length: count }, () => entry.amount)
  const settledStatus = entry.status === 'paid' || entry.status === 'received'

  const rows = amounts.map((amount, index) => ({
    ...entry,
    amount,
    due_date: addMonthsToDate(entry.due_date, index),
    status: index === 0 ? entry.status : 'pending',
    user_id: user.id,
    client_id: canUseProfessionalLinks ? entry.client_id || null : null,
    project_id: canUseProfessionalLinks ? entry.project_id || null : null,
    paid_at: index === 0 && settledStatus
      ? entry.paid_at || new Date().toISOString().split('T')[0]
      : null,
    description: entry.description || null,
    series_id: seriesId,
    series_type: schedule_type === 'single' ? null : schedule_type,
    series_number: schedule_type === 'single' ? null : index + 1,
    series_count: schedule_type === 'single' ? null : count,
  }))

  const { error } = await supabase.from('financial_entries').insert(rows)

  if (error) return { error: 'Erro ao criar lançamento.' }

  revalidatePath('/app/financeiro')
  revalidatePath('/app')
  return { success: true, createdCount: count }
}

export async function getFinancialCategories() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado.', categories: [] as FinancialCategory[] }

  const { data, error } = await supabase
    .from('financial_categories')
    .select('*')
    .eq('user_id', user.id)
    .order('name')

  if (error) return { error: 'Erro ao carregar categorias.', categories: [] as FinancialCategory[] }
  return { categories: (data ?? []) as FinancialCategory[] }
}

export async function createFinancialCategory(input: { type: 'income' | 'expense'; name: string }) {
  const validated = financialCategorySchema.safeParse(input)
  if (!validated.success) return { error: validated.error.issues[0]?.message ?? 'Categoria inválida.' }

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado.' }

  const { data, error } = await supabase
    .from('financial_categories')
    .insert({ ...validated.data, user_id: user.id })
    .select('*')
    .single()

  if (error?.code === '23505') return { error: 'Essa categoria já existe.' }
  if (error || !data) return { error: 'Erro ao criar categoria.' }

  return { category: data as FinancialCategory }
}

export async function updateFinancialEntry(id: string, data: FinanceInput) {
  const validated = financeSchema.safeParse(data)
  if (!validated.success) return { error: 'Dados inválidos.' }

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado.' }

  const requestedProfessionalLink = Boolean(validated.data.client_id || validated.data.project_id)
  const canUseProfessionalLinks = !requestedProfessionalLink
    || await hasFreelancerAccess(supabase, user.id)

  const { error } = await supabase
    .from('financial_entries')
    .update({
      ...validated.data,
      client_id: canUseProfessionalLinks ? validated.data.client_id || null : null,
      project_id: canUseProfessionalLinks ? validated.data.project_id || null : null,
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

export async function deleteFinancialSeries(seriesId: string) {
  const validated = financialSeriesIdSchema.safeParse(seriesId)
  if (!validated.success) return { error: 'Série inválida.' }

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado.' }

  const { error } = await supabase
    .from('financial_entries')
    .delete()
    .eq('series_id', validated.data)
    .eq('user_id', user.id)

  if (error) return { error: 'Erro ao excluir a série.' }

  revalidatePath('/app/financeiro')
  revalidatePath('/app')
  return { success: true }
}
