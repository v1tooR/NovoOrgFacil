import { z } from 'zod'

export const noteSchema = z.object({
  title: z.string().trim().max(200, 'Título muito longo').default(''),
  content: z.string().max(10000, 'Conteúdo muito longo').optional().nullable(),
  is_pinned: z.boolean().default(false),
  tags: z.array(z.string().trim().min(1).max(30)).max(10, 'Use no máximo 10 tags').default([]),
  note_color: z.enum(['default', 'yellow', 'blue', 'green', 'rose', 'purple']).default('default'),
  is_archived: z.boolean().default(false),
  client_id: z.string().uuid().optional().nullable(),
  project_id: z.string().uuid().optional().nullable(),
}).superRefine((data, context) => {
  if (!data.title.trim() && !data.content?.trim()) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['content'],
      message: 'Escreva alguma coisa na nota',
    })
  }
})

export type NoteInput = z.infer<typeof noteSchema>
