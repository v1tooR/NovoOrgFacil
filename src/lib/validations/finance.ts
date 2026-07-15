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

export const financeCreateSchema = financeSchema.extend({
  schedule_type: z.enum(['single', 'installment', 'recurring']).default('single'),
  repeat_count: z.coerce.number().int().min(2, 'Mínimo de 2 vezes').max(60, 'Máximo de 60 vezes').default(2),
}).superRefine((data, context) => {
  if (data.schedule_type === 'installment' && Math.round(data.amount * 100) < data.repeat_count) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['amount'],
      message: 'O valor total precisa permitir parcelas de pelo menos R$ 0,01',
    })
  }
})

export const financialCategorySchema = z.object({
  type: z.enum(['income', 'expense']),
  name: z.string().trim().min(1, 'Informe o nome da categoria').max(60, 'Nome muito longo'),
})

export const financeStatusSchema = z.object({
  status: z.enum(['pending', 'paid', 'received', 'overdue']),
})

export const financialSeriesIdSchema = z.string().uuid('Série inválida')

export type FinanceInput = z.infer<typeof financeSchema>
export type FinanceCreateInput = z.infer<typeof financeCreateSchema>
