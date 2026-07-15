import type { SupabaseClient } from '@supabase/supabase-js'

export async function hasFreelancerAccess(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('account_type')
    .eq('id', userId)
    .single()

  return !error && data?.account_type === 'freelancer'
}

export const FREELANCER_ONLY_ERROR = 'Recurso disponível apenas no plano Profissional.'
