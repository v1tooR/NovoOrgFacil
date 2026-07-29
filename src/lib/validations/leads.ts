import { z } from 'zod'

export const LEAD_STAGE_VALUES = ['new', 'contacted', 'proposal', 'negotiation', 'won', 'lost'] as const

export const leadSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(150, 'Nome muito longo'),
  company: z.string().max(150, 'Nome muito longo').optional().nullable(),
  email: z.string().email('E-mail inválido').optional().nullable().or(z.literal('')),
  phone: z.string().max(20, 'Telefone muito longo').optional().nullable(),
  source: z.string().max(60, 'Origem muito longa').optional().nullable(),
  stage: z.enum(LEAD_STAGE_VALUES).default('new'),
  value: z.coerce.number().min(0, 'Valor inválido').max(1_000_000_000, 'Valor muito alto').default(0),
  notes: z.string().max(2000, 'Observações muito longas').optional().nullable(),
  expected_close_date: z.string().optional().nullable().or(z.literal('')),
  lost_reason: z.string().max(300, 'Motivo muito longo').optional().nullable(),
})

export type LeadInput = z.infer<typeof leadSchema>

/** Conversão de um lead ganho em cliente: cria um novo ou vincula a um existente. */
export const convertLeadSchema = z.discriminatedUnion('mode', [
  z.object({
    mode: z.literal('new'),
    name: z.string().min(1, 'Nome é obrigatório').max(150, 'Nome muito longo'),
    company: z.string().max(150).optional().nullable(),
    email: z.string().email('E-mail inválido').optional().nullable().or(z.literal('')),
    phone: z.string().max(20).optional().nullable(),
    notes: z.string().max(2000).optional().nullable(),
  }),
  z.object({
    mode: z.literal('existing'),
    client_id: z.string().uuid('Cliente inválido'),
  }),
])

export type ConvertLeadInput = z.infer<typeof convertLeadSchema>
