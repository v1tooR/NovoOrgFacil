'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { resetPasswordSchema, type ResetPasswordInput } from '@/lib/validations/auth'
import { updatePassword } from '@/actions/auth'
import { createClient } from '@/lib/supabase/client'

type SessionState = 'checking' | 'ready' | 'invalid'

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground animate-fade-in">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  )
}

function ResetPasswordForm() {
  const searchParams = useSearchParams()
  const [sessionState, setSessionState] = useState<SessionState>('checking')
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const form = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirm_password: '' },
  })

  useEffect(() => {
    const supabase = createClient()

    async function establishSession() {
      const code = searchParams.get('code')
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (error) {
          setSessionState('invalid')
          return
        }
      }

      const { data: { session } } = await supabase.auth.getSession()
      setSessionState(session ? 'ready' : 'invalid')
    }

    establishSession()
  }, [searchParams])

  async function onSubmit(data: ResetPasswordInput) {
    setError(null)
    const result = await updatePassword(data)
    if (result?.error) setError(result.error)
  }

  if (sessionState === 'checking') {
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground animate-fade-in">
        <Loader2 className="h-6 w-6 animate-spin" />
        <p className="text-sm">Verificando link de recuperação...</p>
      </div>
    )
  }

  if (sessionState === 'invalid') {
    return (
      <div className="space-y-6 text-center animate-fade-in">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">Link inválido ou expirado</h1>
          <p className="text-sm text-muted-foreground">
            Solicite um novo link de recuperação de senha.
          </p>
        </div>
        <Link href="/forgot-password">
          <Button variant="outline" className="w-full">Solicitar novo link</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-bold tracking-tight">Defina sua nova senha</h1>
        <p className="text-sm text-muted-foreground">Escolha uma senha forte para sua conta.</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nova senha</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Mínimo 8 caracteres"
                      className="h-10 pr-10"
                      {...field}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="confirm_password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Confirmar nova senha</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      type={showConfirm ? 'text' : 'password'}
                      placeholder="Repita a senha"
                      className="h-10 pr-10"
                      {...field}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      tabIndex={-1}
                    >
                      {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {error && (
            <div className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full h-10" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Salvando...</>
            ) : (
              'Redefinir senha'
            )}
          </Button>
        </form>
      </Form>
    </div>
  )
}
