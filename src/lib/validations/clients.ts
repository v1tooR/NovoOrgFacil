import { z } from 'zod'

export const clientSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(150, 'Nome muito longo'),
  company: z.string().max(150, 'Nome muito longo').optional().nullable(),
  email: z.string().email('E-mail inválido').optional().nullable().or(z.literal('')),
  phone: z.string().max(20, 'Telefone muito longo').optional().nullable(),
  notes: z.string().max(2000, 'Observações muito longas').optional().nullable(),
})

export type ClientInput = z.infer<typeof clientSchema>
