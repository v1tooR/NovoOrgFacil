'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { FREELANCER_ONLY_ERROR, hasFreelancerAccess } from '@/lib/supabase/access'
import { leadSchema, convertLeadSchema, LEAD_STAGE_VALUES, type LeadInput, type ConvertLeadInput } from '@/lib/validations/leads'

/** Normaliza os campos opcionais que o formulário envia como string vazia. */
function normalizeLead(data: LeadInput) {
  return {
    name: data.name,
    company: data.company || null,
    email: data.email || null,
    phone: data.phone || null,
    source: data.source || null,
    stage: data.stage,
    value: data.value ?? 0,
    notes: data.notes || null,
    expected_close_date: data.expected_close_date || null,
    lost_reason: data.stage === 'lost' ? (data.lost_reason || null) : null,
  }
}

export async function createLead(data: LeadInput) {
  const validated = leadSchema.safeParse(data)
  if (!validated.success) return { error: 'Dados inválidos.' }

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado.' }
  if (!(await hasFreelancerAccess(supabase, user.id))) return { error: FREELANCER_ONLY_ERROR }

  const { error } = await supabase.from('leads').insert({
    ...normalizeLead(validated.data),
    user_id: user.id,
  })

  if (error) return { error: 'Erro ao criar lead.' }

  revalidatePath('/app/funil')
  return { success: true }
}

export async function updateLead(id: string, data: LeadInput) {
  const validated = leadSchema.safeParse(data)
  if (!validated.success) return { error: 'Dados inválidos.' }

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado.' }
  if (!(await hasFreelancerAccess(supabase, user.id))) return { error: FREELANCER_ONLY_ERROR }

  const { error } = await supabase
    .from('leads')
    .update(normalizeLead(validated.data))
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: 'Erro ao atualizar lead.' }

  revalidatePath('/app/funil')
  return { success: true }
}

/** Move um lead entre estágios (usado no arrastar-e-soltar do funil). */
export async function updateLeadStage(id: string, stage: LeadInput['stage']) {
  if (!LEAD_STAGE_VALUES.includes(stage)) return { error: 'Estágio inválido.' }

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado.' }
  if (!(await hasFreelancerAccess(supabase, user.id))) return { error: FREELANCER_ONLY_ERROR }

  // Ao sair de "Perdido", limpa o motivo da perda.
  const patch: Record<string, unknown> = { stage }
  if (stage !== 'lost') patch.lost_reason = null

  const { error } = await supabase
    .from('leads')
    .update(patch)
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: 'Erro ao mover o lead.' }

  revalidatePath('/app/funil')
  return { success: true }
}

export async function deleteLead(id: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado.' }
  if (!(await hasFreelancerAccess(supabase, user.id))) return { error: FREELANCER_ONLY_ERROR }

  const { error } = await supabase
    .from('leads')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: 'Erro ao excluir lead.' }

  revalidatePath('/app/funil')
  return { success: true }
}

/**
 * Converte um lead ganho em cliente: cria um novo cliente (pré-preenchido)
 * ou vincula a um existente, marca o lead como 'won' e grava o client_id.
 */
export async function convertLeadToClient(leadId: string, payload: ConvertLeadInput) {
  const validated = convertLeadSchema.safeParse(payload)
  if (!validated.success) return { error: 'Dados inválidos.' }

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado.' }
  if (!(await hasFreelancerAccess(supabase, user.id))) return { error: FREELANCER_ONLY_ERROR }

  let clientId: string

  if (validated.data.mode === 'new') {
    const { data: created, error: clientError } = await supabase
      .from('clients')
      .insert({
        user_id: user.id,
        name: validated.data.name,
        company: validated.data.company || null,
        email: validated.data.email || null,
        phone: validated.data.phone || null,
        notes: validated.data.notes || null,
      })
      .select('id')
      .single()

    if (clientError || !created) return { error: 'Erro ao criar o cliente.' }
    clientId = created.id
  } else {
    // Confirma que o cliente pertence ao usuário antes de vincular.
    const { data: existing, error: lookupError } = await supabase
      .from('clients')
      .select('id')
      .eq('id', validated.data.client_id)
      .eq('user_id', user.id)
      .single()

    if (lookupError || !existing) return { error: 'Cliente não encontrado.' }
    clientId = existing.id
  }

  const { error } = await supabase
    .from('leads')
    .update({ client_id: clientId, stage: 'won', lost_reason: null })
    .eq('id', leadId)
    .eq('user_id', user.id)

  if (error) return { error: 'Erro ao converter o lead.' }

  revalidatePath('/app/funil')
  revalidatePath('/app/clientes')
  revalidatePath('/app')
  return { success: true, clientId }
}
