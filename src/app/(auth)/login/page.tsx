'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowRight, Eye, EyeOff, Loader2, LockKeyhole } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { loginSchema, type LoginInput } from '@/lib/validations/auth'
import { login } from '@/actions/auth'

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  async function onSubmit(data: LoginInput) {
    setError(null)
    const result = await login(data)
    if (result?.error) setError(result.error)
  }

  return (
    <div className="animate-fade-in">
      <header className="mb-8 border-b border-foreground/15 pb-6">
        <div className="mb-5 flex items-center justify-between gap-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
            Acesso / Workspace
          </p>
          <span className="border border-foreground/20 px-2 py-1 text-[9px] uppercase tracking-wider text-muted-foreground">
            Área segura
          </span>
        </div>
        <h1 className="text-3xl font-bold leading-none tracking-[-0.06em] sm:text-4xl">
          Bem-vindo de volta.
        </h1>
        <p className="mt-3 max-w-sm text-xs leading-relaxed text-muted-foreground sm:text-sm">
          Entre com seus dados para continuar organizando seu trabalho.
        </p>
      </header>

      <div className="mb-5 flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
        <LockKeyhole className="h-3.5 w-3.5" />
        Suas credenciais são protegidas
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem className="space-y-2">
                <div className="flex items-center justify-between">
                  <FormLabel className="text-[10px] font-semibold uppercase tracking-[0.16em]">E-mail</FormLabel>
                  <span className="text-[9px] tabular-nums text-muted-foreground">01</span>
                </div>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="seu@email.com"
                    autoComplete="email"
                    className="h-12 rounded-none border-foreground/25 bg-card px-4 focus-visible:border-foreground"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FormLabel className="text-[10px] font-semibold uppercase tracking-[0.16em]">Senha</FormLabel>
                    <span className="text-[9px] tabular-nums text-muted-foreground">02</span>
                  </div>
                  <Link href="/forgot-password" className="text-[10px] font-medium underline decoration-foreground/30 underline-offset-4 transition-colors hover:decoration-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    Esqueci a senha
                  </Link>
                </div>
                <div className="relative">
                  <FormControl>
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      className="h-12 rounded-none border-foreground/25 bg-card px-4 pr-12 focus-visible:border-foreground"
                      {...field}
                    />
                  </FormControl>
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute inset-y-0 right-0 flex w-12 items-center justify-center border-l border-foreground/15 text-muted-foreground transition-colors hover:bg-foreground hover:text-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          {error && (
            <div role="alert" aria-live="polite" className="border border-dashed border-foreground bg-background px-4 py-3 text-xs font-medium text-foreground">
              {error}
            </div>
          )}

          <Button
            type="submit"
            className="group h-12 w-full rounded-none text-xs uppercase tracking-[0.16em]"
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Entrando...
              </>
            ) : (
              <>
                Entrar
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </>
            )}
          </Button>
        </form>
      </Form>

      <div className="mt-8 flex flex-col items-center justify-between gap-3 border-t border-foreground/15 pt-5 text-xs sm:flex-row">
        <span className="text-muted-foreground">Primeiro acesso por aqui?</span>
        <Link
          href="/register"
          className="inline-flex items-center gap-2 font-semibold underline decoration-foreground/30 underline-offset-4 transition-colors hover:decoration-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Criar conta grátis <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  )
}
