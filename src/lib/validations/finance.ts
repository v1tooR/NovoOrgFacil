import { z } from 'zod'

export const financeSchema = z.object({
  type: z.enum(['income', 'expense']),
  title: z.string().min(1, 'Título é obrigatório').max(200, 'Título muito longo'),
  description: z.string().max(1000, 'Descrição muito longa').optional().nullable(),
  amount: z.coerce.number().positive('Valor deve ser positivo'),
  category: z.string().min(1, 'Categoria é obrigatória'),
  status: z.enum(['pending', 'paid', 'received', 'overdue']).default('pending'),
  due_date: z.string().min(1, 'Data é obrigatória'),
  paid_at: z.string().optional().nullable(),
  client_id: z.string().uuid().optional().nullable(),
  project_id: z.string().uuid().optional().nullable(),
})

export const financeStatusSchema = z.object({
  status: z.enum(['pending', 'paid', 'received', 'overdue']),
})

export type FinanceInput = z.infer<typeof financeSchema>
