'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { loginSchema, registerSchema, forgotPasswordSchema, resetPasswordSchema } from '@/lib/validations/auth'
import type { LoginInput, RegisterInput, ForgotPasswordInput, ResetPasswordInput } from '@/lib/validations/auth'

export async function login(data: LoginInput) {
  const validated = loginSchema.safeParse(data)
  if (!validated.success) {
    return { error: 'Dados inválidos. Verifique e tente novamente.' }
  }

  const supabase = createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email: validated.data.email,
    password: validated.data.password,
  })

  if (error) {
    if (error.message.includes('Invalid login credentials')) {
      return { error: 'E-mail ou senha incorretos.' }
    }
    return { error: 'Não foi possível fazer login. Tente novamente.' }
  }

  revalidatePath('/', 'layout')
  redirect('/app')
}

export async function register(data: RegisterInput) {
  const validated = registerSchema.safeParse(data)
  if (!validated.success) {
    return { error: 'Dados inválidos. Verifique e tente novamente.' }
  }

  const supabase = createClient()
  const { error } = await supabase.auth.signUp({
    email: validated.data.email,
    password: validated.data.password,
    options: {
      data: { full_name: validated.data.full_name },
    },
  })

  if (error) {
    if (error.message.includes('already registered')) {
      return { error: 'Este e-mail já está cadastrado.' }
    }
    return { error: 'Não foi possível criar a conta. Tente novamente.' }
  }

  revalidatePath('/', 'layout')
  redirect('/app')
}

export async function forgotPassword(data: ForgotPasswordInput) {
  const validated = forgotPasswordSchema.safeParse(data)
  if (!validated.success) {
    return { error: 'E-mail inválido.' }
  }

  const supabase = createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(validated.data.email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/reset-password`,
  })

  if (error) {
    return { error: 'Não foi possível enviar o e-mail. Tente novamente.' }
  }

  return { success: true }
}

export async function updatePassword(data: ResetPasswordInput) {
  const validated = resetPasswordSchema.safeParse(data)
  if (!validated.success) {
    return { error: 'Dados inválidos. Verifique e tente novamente.' }
  }

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Link de recuperação inválido ou expirado. Solicite um novo.' }
  }

  const { error } = await supabase.auth.updateUser({ password: validated.data.password })
  if (error) {
    return { error: 'Não foi possível redefinir a senha. Tente novamente.' }
  }

  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}

export async function logout() {
  const supabase = createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}
