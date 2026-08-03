'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { hasFreelancerAccess } from '@/lib/supabase/access'
import { advanceChargeDate, rollChargeDateForward, toDateOnly } from '@/lib/subscriptions'
import {
  subscriptionSchema,
  subscriptionStatusSchema,
  type SubscriptionInput,
} from '@/lib/validations/subscription'
import type { Subscription, SubscriptionStatus } from '@/types'

function today() {
  return toDateOnly(new Date())
}

export async function getSubscriptions() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado.', subscriptions: [] as Subscription[] }

  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', user.id)
    .order('next_charge_date', { ascending: true })

  if (error) return { error: 'Erro ao carregar assinaturas.', subscriptions: [] as Subscription[] }
  return { subscriptions: (data ?? []) as Subscription[] }
}

export async function createSubscription(data: SubscriptionInput) {
  const validated = subscriptionSchema.safeParse(data)
  if (!validated.success) return { error: validated.error.issues[0]?.message ?? 'Dados inválidos.' }

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado.' }

  const requestedProfessionalLink = Boolean(validated.data.client_id || validated.data.project_id)
  const canUseProfessionalLinks = !requestedProfessionalLink
    || await hasFreelancerAccess(supabase, user.id)

  const { error } = await supabase.from('subscriptions').insert({
    ...validated.data,
    user_id: user.id,
    description: validated.data.description || null,
    payment_method: validated.data.payment_method || null,
    client_id: canUseProfessionalLinks ? validated.data.client_id || null : null,
    project_id: canUseProfessionalLinks ? validated.data.project_id || null : null,
    status: 'active',
    started_at: today(),
  })

  if (error) return { error: 'Erro ao criar assinatura.' }

  revalidatePath('/app/financeiro')
  return { success: true }
}

export async function updateSubscription(id: string, data: SubscriptionInput) {
  const validated = subscriptionSchema.safeParse(data)
  if (!validated.success) return { error: validated.error.issues[0]?.message ?? 'Dados inválidos.' }

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado.' }

  const requestedProfessionalLink = Boolean(validated.data.client_id || validated.data.project_id)
  const canUseProfessionalLinks = !requestedProfessionalLink
    || await hasFreelancerAccess(supabase, user.id)

  const { error } = await supabase
    .from('subscriptions')
    .update({
      ...validated.data,
      description: validated.data.description || null,
      payment_method: validated.data.payment_method || null,
      client_id: canUseProfessionalLinks ? validated.data.client_id || null : null,
      project_id: canUseProfessionalLinks ? validated.data.project_id || null : null,
    })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: 'Erro ao atualizar assinatura.' }

  revalidatePath('/app/financeiro')
  return { success: true }
}

export async function updateSubscriptionStatus(id: string, status: SubscriptionStatus) {
  const validated = subscriptionStatusSchema.safeParse({ status })
  if (!validated.success) return { error: 'Status inválido.' }

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado.' }

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('cycle, next_charge_date')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!subscription) return { error: 'Assinatura não encontrada.' }

  // Ao reativar, joga a cobrança para a próxima data futura do ciclo:
  // uma assinatura pausada por meses não deve voltar com data vencida.
  const nextChargeDate = status === 'active'
    ? rollChargeDateForward(subscription.next_charge_date, subscription.cycle)
    : subscription.next_charge_date

  const { error } = await supabase
    .from('subscriptions')
    .update({
      status,
      next_charge_date: nextChargeDate,
      canceled_at: status === 'canceled' ? today() : null,
    })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: 'Erro ao atualizar status.' }

  revalidatePath('/app/financeiro')
  return { success: true }
}

export async function deleteSubscription(id: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado.' }

  const { error } = await supabase
    .from('subscriptions')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: 'Erro ao excluir assinatura.' }

  revalidatePath('/app/financeiro')
  revalidatePath('/app')
  return { success: true }
}

/**
 * Registra a cobrança atual como despesa paga e avança o ciclo.
 * É o elo entre a assinatura (contrato) e o financeiro (histórico).
 */
export async function registerSubscriptionCharge(id: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado.' }

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single<Subscription>()

  if (!subscription) return { error: 'Assinatura não encontrada.' }
  if (subscription.status === 'canceled') return { error: 'Assinatura cancelada.' }

  const chargeDate = subscription.next_charge_date
  // Vínculos profissionais só acompanham o lançamento se o plano ainda permitir.
  const hasProfessionalLink = Boolean(subscription.client_id || subscription.project_id)
  const canUseProfessionalLinks = hasProfessionalLink
    && await hasFreelancerAccess(supabase, user.id)

  const { error: entryError } = await supabase.from('financial_entries').insert({
    user_id: user.id,
    type: 'expense',
    title: subscription.name,
    description: subscription.description,
    amount: subscription.amount,
    category: subscription.category,
    status: 'paid',
    due_date: chargeDate,
    paid_at: today(),
    client_id: canUseProfessionalLinks ? subscription.client_id : null,
    project_id: canUseProfessionalLinks ? subscription.project_id : null,
    subscription_id: subscription.id,
  })

  if (entryError) return { error: 'Erro ao registrar o pagamento.' }

  const nextChargeDate = advanceChargeDate(chargeDate, subscription.cycle)
  const { error: subscriptionError } = await supabase
    .from('subscriptions')
    .update({ next_charge_date: nextChargeDate })
    .eq('id', id)
    .eq('user_id', user.id)

  if (subscriptionError) return { error: 'Pagamento registrado, mas a próxima cobrança não avançou.' }

  revalidatePath('/app/financeiro')
  revalidatePath('/app')
  return { success: true, chargeDate, nextChargeDate }
}
