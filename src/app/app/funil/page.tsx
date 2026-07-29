import { createClient } from '@/lib/supabase/server'
import { PageTitle } from '@/components/shared/PageTitle'
import { LeadFunnelBoard } from '@/components/crm/LeadFunnelBoard'
import type { Lead, Client } from '@/types'

export default async function FunilPage() {
  const supabase = createClient()

  const [{ data: leads }, { data: clients }] = await Promise.all([
    supabase.from('leads').select('*, client:clients(id,name)').order('created_at', { ascending: false }),
    supabase.from('clients').select('*').order('name'),
  ])

  return (
    <div className="space-y-6 animate-fade-in">
      <PageTitle
        title="Funil"
        description="Acompanhe seus leads do primeiro contato até a conversão."
      />

      <LeadFunnelBoard initialLeads={(leads as Lead[]) ?? []} clients={(clients as Client[]) ?? []} />
    </div>
  )
}
