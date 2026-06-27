'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Settings, LogOut } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { PageTitle } from '@/components/shared/PageTitle'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { useToast } from '@/components/ui/use-toast'
import { logout } from '@/actions/auth'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { getInitials } from '@/lib/utils'

const profileSchema = z.object({
  full_name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
})

type ProfileInput = z.infer<typeof profileSchema>

export default function ConfiguracoesPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()
  const supabase = createClient()

  const form = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: { full_name: '' },
  })

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setEmail(user.email ?? '')
        const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single()
        form.reset({ full_name: profile?.full_name ?? '' })
      }
      setLoading(false)
    }
    load()
  }, [])

  async function onSubmit(data: ProfileInput) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase.from('profiles').update({ full_name: data.full_name }).eq('id', user.id)

    if (error) {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' })
    } else {
      toast({ title: 'Perfil atualizado!' })
    }
  }

  return (
    <div className="space-y-8 animate-fade-in max-w-lg">
      <PageTitle title="Configurações" description="Gerencie sua conta e preferências." />

      {/* Profile section */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold">Perfil</h2>
        <div className="p-5 rounded-xl border bg-card space-y-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-12 w-12">
              <AvatarFallback className="text-base">
                {getInitials(form.watch('full_name') || email)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-sm">{form.watch('full_name') || 'Seu nome'}</p>
              <p className="text-xs text-muted-foreground">{email}</p>
            </div>
          </div>

          {!loading && (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="full_name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome completo</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <Button type="submit" size="sm" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? (
                    <><Loader2 className="h-4 w-4 animate-spin" />Salvando...</>
                  ) : 'Salvar alterações'}
                </Button>
              </form>
            </Form>
          )}
        </div>
      </div>

      {/* Account section */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold">Conta</h2>
        <div className="p-5 rounded-xl border bg-card space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">E-mail</p>
              <p className="text-xs text-muted-foreground">{email}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Danger zone */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-destructive">Sessão</h2>
        <div className="p-5 rounded-xl border border-destructive/20 bg-card">
          <p className="text-sm text-muted-foreground mb-3">Ao sair, você precisará fazer login novamente.</p>
          <form action={logout}>
            <Button type="submit" variant="destructive" size="sm">
              <LogOut className="h-4 w-4" />
              Sair da conta
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
