import { z } from 'zod'

export const subscriptionSchema = z.object({
  name: z.string().trim().min(1, 'Nome é obrigatório').max(120, 'Nome muito longo'),
  description: z.string().max(500, 'Observação muito longa').optional().nullable(),
  amount: z.coerce.number().positive('Valor deve ser positivo'),
  cycle: z.enum(['weekly', 'monthly', 'quarterly', 'semiannual', 'yearly']).default('monthly'),
  category: z.string().min(1, 'Categoria é obrigatória').max(60, 'Categoria muito longa'),
  payment_method: z.string().max(60).optional().nullable(),
  next_charge_date: z.string().min(1, 'Data da próxima cobrança é obrigatória'),
  client_id: z.string().uuid().optional().nullable(),
  project_id: z.string().uuid().optional().nullable(),
})

export const subscriptionStatusSchema = z.object({
  status: z.enum(['active', 'paused', 'canceled']),
})

export type SubscriptionInput = z.infer<typeof subscriptionSchema>
