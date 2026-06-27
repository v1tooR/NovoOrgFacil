'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Users } from 'lucide-react'
import { PageTitle } from '@/components/shared/PageTitle'
import { ClientCard } from '@/components/clients/ClientCard'
import { CreateClientDialog } from '@/components/clients/CreateClientDialog'
import { EmptyState } from '@/components/shared/EmptyState'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import type { Client } from '@/types'

export default function ClientesPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [editClient, setEditClient] = useState<Client | null>(null)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('clients').select('*').order('name')
      setClients((data ?? []) as Client[])
      setLoading(false)
    }
    load()
  }, [])

  const filtered = clients.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.company?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6 animate-fade-in">
      <PageTitle
        title="Clientes"
        description="Gerencie seus clientes e contatos."
        action={<CreateClientDialog />}
      />

      {!loading && clients.length > 0 && (
        <Input
          placeholder="Buscar por nome, empresa ou e-mail..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
      )}

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28 w-full" />)}
        </div>
      ) : clients.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Nenhum cliente ainda"
          description="Adicione seus clientes para organizar melhor seus projetos."
          action={<CreateClientDialog />}
        />
      ) : filtered.length === 0 ? (
        <EmptyState icon={Users} title="Nenhum resultado encontrado" description="Tente buscar por outro termo." />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((client) => (
            <ClientCard key={client.id} client={client} onEdit={setEditClient} />
          ))}
        </div>
      )}

      <CreateClientDialog
        editClient={editClient}
        open={!!editClient}
        onOpenChange={(open) => !open && setEditClient(null)}
      />
    </div>
  )
}
