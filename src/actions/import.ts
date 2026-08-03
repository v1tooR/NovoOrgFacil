'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { addDaysToDate, parseDateOnly, rollChargeDateForward } from '@/lib/subscriptions'
import {
  importContextSchema,
  importOfxSchema,
  type ImportContextInput,
  type ImportEntryInput,
  type ImportOfxInput,
} from '@/lib/validations/import'
import type { FinancialStatus, FinancialType, SubscriptionCycle } from '@/types'

export interface ImportContextEntry {
  id: string
  title: string
  due_date: string
  amount: number
  type: FinancialType
  status: FinancialStatus
}

export interface ImportContextSubscription {
  id: string
  name: string
  category: string
  amount: number
  cycle: SubscriptionCycle
  next_charge_date: string
}

export interface ImportContext {
  /** FITIDs que já existem na conta — importação é idempotente. */
  importedFitids: string[]
  /** Lançamentos do período: pendentes viram conciliação, quitados viram alerta de duplicata. */
  existingEntries: ImportContextEntry[]
  /** Assinaturas ativas: casam com a cobrança e avançam o ciclo. */
  subscriptions: ImportContextSubscription[]
}

const EMPTY_CONTEXT: ImportContext = { importedFitids: [], existingEntries: [], subscriptions: [] }

/** Executa em lotes para não abrir centenas de conexões de uma vez. */
async function inChunks<T, R>(items: T[], size: number, worker: (item: T) => Promise<R>) {
  const results: R[] = []
  for (let index = 0; index < items.length; index += size) {
    results.push(...await Promise.all(items.slice(index, index + size).map(worker)))
  }
  return results
}

export async function getImportContext(input: ImportContextInput) {
  const validated = importContextSchema.safeParse(input)
  if (!validated.success) return { error: 'Período inválido.', context: EMPTY_CONTEXT }

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado.', context: EMPTY_CONTEXT }

  const { periodStart, periodEnd, fitids } = validated.data

  // Conciliação olha alguns dias além do período: o débito costuma cair
  // depois do vencimento que o usuário cadastrou.
  const matchStart = addDaysToDate(periodStart, -7)
  const matchEnd = addDaysToDate(periodEnd, 7)

  const [imported, existing, subscriptions] = await Promise.all([
    fitids.length > 0
      ? supabase
          .from('financial_entries')
          .select('import_fitid')
          .eq('user_id', user.id)
          .in('import_fitid', fitids)
      : Promise.resolve({ data: [] as { import_fitid: string | null }[] }),
    supabase
      .from('financial_entries')
      .select('id, title, due_date, amount, type, status')
      .eq('user_id', user.id)
      .gte('due_date', matchStart)
      .lte('due_date', matchEnd),
    supabase
      .from('subscriptions')
      .select('id, name, category, amount, cycle, next_charge_date')
      .eq('user_id', user.id)
      .eq('status', 'active'),
  ])

  return {
    context: {
      importedFitids: (imported.data ?? [])
        .map((row) => row.import_fitid)
        .filter((fitid): fitid is string => Boolean(fitid)),
      existingEntries: (existing.data ?? []).map((row) => ({
        id: row.id as string,
        title: row.title as string,
        due_date: row.due_date as string,
        amount: Number(row.amount),
        type: row.type as FinancialType,
        status: row.status as FinancialStatus,
      })),
      subscriptions: (subscriptions.data ?? []).map((row) => ({
        id: row.id as string,
        name: row.name as string,
        category: row.category as string,
        amount: Number(row.amount),
        cycle: row.cycle as SubscriptionCycle,
        next_charge_date: row.next_charge_date as string,
      })),
    },
  }
}

/**
 * Aplica as linhas revisadas pelo usuário. O cliente é apenas a origem do
 * arquivo: tudo é revalidado aqui e o user_id vem sempre da sessão.
 * Transações do extrato já aconteceram, então entram quitadas.
 */
export async function importOfxEntries(input: ImportOfxInput) {
  const validated = importOfxSchema.safeParse(input)
  if (!validated.success) {
    return { error: validated.error.issues[0]?.message ?? 'Dados inválidos.' }
  }

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado.' }

  const { account, entries } = validated.data
  const importAccount = account || null

  // Deduplica dentro do próprio payload antes de consultar o banco.
  const uniqueEntries = Array.from(
    new Map(entries.map((entry) => [entry.fitid, entry])).values()
  )

  const { data: existing, error: existingError } = await supabase
    .from('financial_entries')
    .select('import_fitid')
    .eq('user_id', user.id)
    .in('import_fitid', uniqueEntries.map((entry) => entry.fitid))

  if (existingError) return { error: 'Erro ao verificar lançamentos já importados.' }

  const alreadyImported = new Set(
    (existing ?? []).map((row) => row.import_fitid).filter(Boolean) as string[]
  )
  const pending = uniqueEntries.filter((entry) => !alreadyImported.has(entry.fitid))
  const skipped = uniqueEntries.length - pending.length

  if (pending.length === 0) {
    return { success: true, imported: 0, settled: 0, linked: 0, skipped }
  }

  const settledStatus = (type: FinancialType) => (type === 'income' ? 'received' : 'paid')

  const toRow = (entry: ImportEntryInput, subscriptionId: string | null) => ({
    user_id: user.id,
    type: entry.type,
    title: entry.title,
    description: null,
    amount: entry.amount,
    category: entry.category,
    status: settledStatus(entry.type),
    due_date: entry.due_date,
    paid_at: entry.due_date,
    subscription_id: subscriptionId,
    import_fitid: entry.fitid,
    import_source: 'ofx',
    import_account: importAccount,
  })

  const creations = pending.filter((entry) => entry.action === 'create')
  const settlements = pending.filter((entry) => entry.action === 'settle')
  const links = pending.filter((entry) => entry.action === 'subscription')

  let imported = 0
  let failed = 0

  if (creations.length > 0) {
    const { error } = await supabase.from('financial_entries').insert(creations.map((entry) => toRow(entry, null)))
    // 23505: corrida com outra importação — o índice único fez o trabalho.
    if (error && error.code !== '23505') return { error: 'Erro ao importar os lançamentos.' }
    if (error) failed += creations.length
    else imported += creations.length
  }

  // Quitação: preserva o lançamento que o usuário já tinha e apenas o marca
  // como pago, carimbando o FITID para a idempotência valer também aqui.
  const settleResults = await inChunks(settlements, 10, async (entry) => {
    const { data, error } = await supabase
      .from('financial_entries')
      .update({
        status: settledStatus(entry.type),
        paid_at: entry.due_date,
        import_fitid: entry.fitid,
        import_source: 'ofx',
        import_account: importAccount,
      })
      .eq('id', entry.target_id!)
      .eq('user_id', user.id)
      .in('status', ['pending', 'overdue'])
      .select('id')

    return !error && (data?.length ?? 0) > 0
  })
  const settled = settleResults.filter(Boolean).length
  failed += settleResults.length - settled

  // Assinatura: lança a despesa vinculada e empurra a próxima cobrança
  // para depois da data que o extrato confirmou.
  const linkResults = await inChunks(links, 10, async (entry) => {
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('cycle, next_charge_date')
      .eq('id', entry.target_id!)
      .eq('user_id', user.id)
      .single()

    if (!subscription) return false

    const { error } = await supabase
      .from('financial_entries')
      .insert(toRow(entry, entry.target_id!))

    if (error) return false

    await supabase
      .from('subscriptions')
      .update({
        next_charge_date: rollChargeDateForward(
          subscription.next_charge_date as string,
          subscription.cycle as SubscriptionCycle,
          parseDateOnly(addDaysToDate(entry.due_date, 1))
        ),
      })
      .eq('id', entry.target_id!)
      .eq('user_id', user.id)

    return true
  })
  const linked = linkResults.filter(Boolean).length
  failed += linkResults.length - linked

  revalidatePath('/app/financeiro')
  revalidatePath('/app')

  if (imported + settled + linked === 0) {
    return { error: 'Nenhum lançamento pôde ser aplicado. Tente novamente.' }
  }

  return { success: true, imported, settled, linked, skipped, failed }
}
