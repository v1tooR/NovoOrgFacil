import { z } from 'zod'

/** Teto por importação: protege o payload da Server Action e o banco. */
export const IMPORT_MAX_ENTRIES = 500

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida')

/**
 * O que fazer com a linha do extrato:
 * - create: vira um lançamento novo
 * - settle: quita um lançamento pendente que já existia
 * - subscription: lança e avança o ciclo da assinatura correspondente
 */
export const importActionSchema = z.enum(['create', 'settle', 'subscription'])

export const importEntrySchema = z.object({
  fitid: z.string().trim().min(1, 'Identificador ausente').max(120),
  type: z.enum(['income', 'expense']),
  title: z.string().trim().min(1, 'Descrição obrigatória').max(200),
  amount: z.coerce.number().positive('Valor deve ser positivo').max(9_999_999_99),
  category: z.string().trim().min(1, 'Categoria obrigatória').max(60),
  due_date: isoDate,
  action: importActionSchema.default('create'),
  /** Lançamento a quitar ou assinatura a vincular, conforme a ação. */
  target_id: z.string().uuid().optional().nullable(),
}).superRefine((data, context) => {
  if (data.action !== 'create' && !data.target_id) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['target_id'],
      message: 'Conciliação sem destino.',
    })
  }
})

export const importOfxSchema = z.object({
  account: z.string().trim().max(60).optional().nullable(),
  entries: z.array(importEntrySchema)
    .min(1, 'Selecione ao menos um lançamento')
    .max(IMPORT_MAX_ENTRIES, `Máximo de ${IMPORT_MAX_ENTRIES} lançamentos por importação`),
})

export const importContextSchema = z.object({
  periodStart: isoDate,
  periodEnd: isoDate,
  fitids: z.array(z.string().max(120)).max(IMPORT_MAX_ENTRIES),
})

export type ImportAction = z.infer<typeof importActionSchema>
export type ImportEntryInput = z.infer<typeof importEntrySchema>
export type ImportOfxInput = z.infer<typeof importOfxSchema>
export type ImportContextInput = z.infer<typeof importContextSchema>
