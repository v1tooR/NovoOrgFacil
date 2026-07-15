'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { AccountType } from '@/types'

export async function switchAccountType(next: AccountType) {
  if (next !== 'personal' && next !== 'freelancer') {
    return { error: 'Tipo de plano inválido.' }
  }

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado.' }

  const { data, error } = await supabase.rpc('set_own_account_type', {
    new_account_type: next,
  })

  if (error || data !== next) {
    return { error: 'Não foi possível alterar o plano. Tente novamente.' }
  }

  revalidatePath('/app', 'layout')
  return { success: true, accountType: data as AccountType }
}
