'use client'

import { useState, useEffect } from 'react'
import { Loader2, UserPlus } from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/components/ui/use-toast'
import { convertLeadToClient } from '@/actions/leads'
import type { Lead, Client } from '@/types'

interface ConvertLeadDialogProps {
  lead: Lead | null
  clients: Client[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function ConvertLeadDialog({ lead, clients, open, onOpenChange, onSuccess }: ConvertLeadDialogProps) {
  const { toast } = useToast()
  const [mode, setMode] = useState<'new' | 'existing'>('new')
  const [loading, setLoading] = useState(false)

  const [name, setName] = useState('')
  const [company, setCompany] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [clientId, setClientId] = useState('')

  // Pré-preenche os campos com os dados do lead sempre que abrir.
  useEffect(() => {
    if (lead && open) {
      setMode(clients.length > 0 ? 'new' : 'new')
      setName(lead.name)
      setCompany(lead.company ?? '')
      setEmail(lead.email ?? '')
      setPhone(lead.phone ?? '')
      setClientId('')
    }
  }, [lead, open, clients.length])

  async function handleConfirm() {
    if (!lead) return

    if (mode === 'new' && name.trim().length === 0) {
      toast({ title: 'Informe o nome do cliente', variant: 'destructive' })
      return
    }
    if (mode === 'existing' && !clientId) {
      toast({ title: 'Selecione um cliente', variant: 'destructive' })
      return
    }

    setLoading(true)
    const result = mode === 'new'
      ? await convertLeadToClient(lead.id, { mode: 'new', name, company, email, phone, notes: lead.notes ?? '' })
      : await convertLeadToClient(lead.id, { mode: 'existing', client_id: clientId })
    setLoading(false)

    if (result.error) {
      toast({ title: 'Erro', description: result.error, variant: 'destructive' })
      return
    }

    toast({ title: 'Lead convertido em cliente!' })
    onOpenChange(false)
    onSuccess?.()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><UserPlus className="h-4 w-4" />Converter em cliente</DialogTitle>
          <DialogDescription>
            {lead ? `Transforme "${lead.name}" em cliente para acompanhar no Financeiro e Projetos.` : ''}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={mode} onValueChange={(v) => setMode(v as 'new' | 'existing')}>
          <TabsList className="w-full">
            <TabsTrigger value="new" className="flex-1">Novo cliente</TabsTrigger>
            <TabsTrigger value="existing" className="flex-1" disabled={clients.length === 0}>Vincular existente</TabsTrigger>
          </TabsList>
        </Tabs>

        {mode === 'new' ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome do cliente" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Empresa</Label>
                <Input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Empresa" />
              </div>
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(00) 00000-0000" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>E-mail</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@exemplo.com" />
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <Label>Cliente</Label>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger><SelectValue placeholder="Selecione um cliente" /></SelectTrigger>
              <SelectContent>
                {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancelar</Button>
          <Button type="button" onClick={handleConfirm} disabled={loading}>
            {loading ? <><Loader2 className="h-4 w-4 animate-spin" />Convertendo...</> : 'Converter'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
