import { z } from 'zod'

export const projectSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(200, 'Nome muito longo'),
  description: z.string().max(2000, 'Descrição muito longa').optional().nullable(),
  status: z.enum(['planning', 'in_progress', 'waiting_client', 'completed', 'paused']).default('planning'),
  client_id: z.string().uuid().optional().nullable(),
  deadline: z.string().optional().nullable(),
})

export type ProjectInput = z.infer<typeof projectSchema>
