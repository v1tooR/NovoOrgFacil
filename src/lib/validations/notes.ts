import { z } from 'zod'

export const noteSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório').max(200, 'Título muito longo'),
  content: z.string().max(10000, 'Conteúdo muito longo').optional().nullable(),
  is_pinned: z.boolean().default(false),
  client_id: z.string().uuid().optional().nullable(),
  project_id: z.string().uuid().optional().nullable(),
})

export type NoteInput = z.infer<typeof noteSchema>
