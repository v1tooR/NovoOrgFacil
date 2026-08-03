'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  FileUp,
  Link2,
  Loader2,
  Upload,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { getImportContext, importOfxEntries } from '@/actions/import'
import {
  OfxParseError,
  decodeOfxBuffer,
  matchesVendor,
  maskAccount,
  parseOfx,
  suggestCategory,
  type OfxStatement,
  type OfxTransaction,
} from '@/lib/ofx'
import { advanceChargeDate, daysUntil, parseDateOnly } from '@/lib/subscriptions'
import { IMPORT_MAX_ENTRIES, type ImportAction } from '@/lib/validations/import'
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, cn, formatCurrency, formatDate } from '@/lib/utils'
import type { FinancialType } from '@/types'

interface ImportOfxDialogProps {
  trigger?: React.ReactNode
  /** Controlado quando o dialog é montado sob demanda (carregamento lazy). */
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onImported?: () => void | Promise<void>
}

interface RowMatch {
  action: Exclude<ImportAction, 'create'>
  targetId: string
  /** Texto curto explicando o que a conciliação vai fazer. */
  label: string
}

interface ReviewRow {
  fitid: string
  date: string
  amount: number
  type: FinancialType
  title: string
  category: string
  selected: boolean
  action: ImportAction
  match: RowMatch | null
  /** Já existe um lançamento com esse FITID: importação repetida. */
  alreadyImported: boolean
  /** Mesmo valor e data de um lançamento já quitado: provável duplicata. */
  possibleDuplicate: boolean
}

const MAX_FILE_BYTES = 5 * 1024 * 1024
/** Janela de tolerância entre o vencimento cadastrado e o débito real. */
const SETTLE_DAY_WINDOW = 3
const CENT = 0.005

type RowFilter = 'all' | 'new' | 'reconciled' | 'expense' | 'income'

export function ImportOfxDialog({
  trigger,
  open: controlledOpen,
  onOpenChange,
  onImported,
}: ImportOfxDialogProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false)
  const [statement, setStatement] = useState<OfxStatement | null>(null)
  const [rows, setRows] = useState<ReviewRow[]>([])
  const [filter, setFilter] = useState<RowFilter>('all')
  const [reading, setReading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()
  const open = controlledOpen ?? uncontrolledOpen

  const reset = useCallback(() => {
    setStatement(null)
    setRows([])
    setFilter('all')
    setDragging(false)
    if (inputRef.current) inputRef.current.value = ''
  }, [])

  const handleFile = useCallback(async (file: File) => {
    if (file.size > MAX_FILE_BYTES) {
      toast({ title: 'Arquivo muito grande', description: 'O limite é de 5 MB.', variant: 'destructive' })
      return
    }

    setReading(true)
    try {
      const parsed = parseOfx(decodeOfxBuffer(await file.arrayBuffer()))

      // Contexto do servidor: o que já foi importado e o que pode duplicar.
      const { context } = await getImportContext({
        periodStart: parsed.periodStart ?? parsed.transactions[parsed.transactions.length - 1].date,
        periodEnd: parsed.periodEnd ?? parsed.transactions[0].date,
        fitids: parsed.transactions.slice(0, IMPORT_MAX_ENTRIES).map((transaction) => transaction.fitid),
      })

      const importedFitids = new Set(context.importedFitids)
      const settledEntries = context.existingEntries.filter(
        (entry) => entry.status === 'paid' || entry.status === 'received'
      )
      const openEntries = context.existingEntries.filter(
        (entry) => entry.status === 'pending' || entry.status === 'overdue'
      )
      // Um lançamento pendente só pode ser quitado por uma transação.
      const claimed = new Set<string>()

      const findMatch = (transaction: OfxTransaction): RowMatch | null => {
        const openEntry = openEntries.find((entry) => (
          !claimed.has(entry.id)
          && entry.type === transaction.type
          && Math.abs(entry.amount - transaction.amount) < CENT
          && Math.abs(daysUntil(entry.due_date, parseDateOnly(transaction.date))) <= SETTLE_DAY_WINDOW
        ))

        if (openEntry) {
          claimed.add(openEntry.id)
          return {
            action: 'settle',
            targetId: openEntry.id,
            label: `Quita "${openEntry.title}" (${formatDate(openEntry.due_date)})`,
          }
        }

        if (transaction.type !== 'expense') return null

        const subscription = context.subscriptions.find((item) => (
          !claimed.has(item.id)
          && Math.abs(item.amount - transaction.amount) < CENT
          && matchesVendor(transaction.description, item.name)
        ))

        if (!subscription) return null
        claimed.add(subscription.id)
        return {
          action: 'subscription',
          targetId: subscription.id,
          label: `Assinatura ${subscription.name} · próxima em ${formatDate(advanceChargeDate(transaction.date, subscription.cycle))}`,
        }
      }

      let selectedCount = 0
      const reviewRows = parsed.transactions.map((transaction): ReviewRow => {
        const alreadyImported = importedFitids.has(transaction.fitid)
        const match = alreadyImported ? null : findMatch(transaction)
        const possibleDuplicate = !alreadyImported && !match && settledEntries.some((entry) => (
          entry.type === transaction.type
          && entry.due_date === transaction.date
          && Math.abs(entry.amount - transaction.amount) < CENT
        ))
        const selectable = !alreadyImported && !possibleDuplicate && selectedCount < IMPORT_MAX_ENTRIES
        if (selectable) selectedCount += 1

        return {
          fitid: transaction.fitid,
          date: transaction.date,
          amount: transaction.amount,
          type: transaction.type,
          title: transaction.description,
          category: match?.action === 'subscription'
            ? context.subscriptions.find((item) => item.id === match.targetId)?.category
              ?? suggestCategory(transaction.description, transaction.type, context.subscriptions)
            : suggestCategory(transaction.description, transaction.type, context.subscriptions),
          selected: selectable,
          action: match?.action ?? 'create',
          match,
          alreadyImported,
          possibleDuplicate,
        }
      })

      setStatement(parsed)
      setRows(reviewRows)
    } catch (error) {
      toast({
        title: 'Não foi possível ler o arquivo',
        description: error instanceof OfxParseError
          ? error.message
          : 'Verifique se o arquivo é um extrato OFX exportado pelo seu banco.',
        variant: 'destructive',
      })
    } finally {
      setReading(false)
    }
  }, [toast])

  const summary = useMemo(() => {
    const selected = rows.filter((row) => row.selected)
    return {
      selectedCount: selected.length,
      income: selected.filter((row) => row.type === 'income').reduce((total, row) => total + row.amount, 0),
      expenses: selected.filter((row) => row.type === 'expense').reduce((total, row) => total + row.amount, 0),
      alreadyImported: rows.filter((row) => row.alreadyImported).length,
      duplicates: rows.filter((row) => row.possibleDuplicate).length,
      matched: rows.filter((row) => row.match).length,
      reconciling: selected.filter((row) => row.action !== 'create').length,
    }
  }, [rows])

  const visibleRows = useMemo(() => {
    if (filter === 'all') return rows
    if (filter === 'new') return rows.filter((row) => !row.alreadyImported && !row.possibleDuplicate)
    if (filter === 'reconciled') return rows.filter((row) => row.match)
    return rows.filter((row) => row.type === filter)
  }, [filter, rows])

  const updateRow = useCallback((fitid: string, patch: Partial<ReviewRow>) => {
    setRows((current) => current.map((row) => (row.fitid === fitid ? { ...row, ...patch } : row)))
  }, [])

  function toggleAll(selected: boolean) {
    let count = rows.filter((row) => row.selected).length
    setRows((current) => current.map((row) => {
      if (row.alreadyImported) return { ...row, selected: false }
      if (!selected) return { ...row, selected: false }
      if (row.selected || count >= IMPORT_MAX_ENTRIES) return row
      count += 1
      return { ...row, selected: true }
    }))
  }

  function handleOpenChange(nextOpen: boolean) {
    onOpenChange?.(nextOpen)
    if (controlledOpen === undefined) setUncontrolledOpen(nextOpen)
    if (!nextOpen) reset()
  }

  async function handleImport() {
    const selected = rows.filter((row) => row.selected)
    if (selected.length === 0) return

    setImporting(true)
    const result = await importOfxEntries({
      account: statement?.accountId ? maskAccount(statement.accountId) : null,
      entries: selected.map((row) => ({
        fitid: row.fitid,
        type: row.type,
        title: row.title,
        amount: row.amount,
        category: row.category,
        due_date: row.date,
        action: row.action,
        target_id: row.action === 'create' ? null : row.match?.targetId ?? null,
      })),
    })
    setImporting(false)

    if (result.error) {
      toast({ title: 'Erro na importação', description: result.error, variant: 'destructive' })
      return
    }

    const details = [
      result.settled ? `${result.settled} quitado${result.settled === 1 ? '' : 's'}` : null,
      result.linked ? `${result.linked} vinculado${result.linked === 1 ? '' : 's'} a assinatura` : null,
      result.skipped ? `${result.skipped} já existia${result.skipped === 1 ? '' : 'm'}` : null,
      result.failed ? `${result.failed} falhou` : null,
    ].filter(Boolean)

    toast({
      title: `${result.imported} lançamento${result.imported === 1 ? '' : 's'} importado${result.imported === 1 ? '' : 's'}!`,
      description: details.length > 0 ? `${details.join(' · ')}.` : undefined,
    })
    handleOpenChange(false)
    await onImported?.()
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {controlledOpen === undefined && (
        <DialogTrigger asChild>
          {trigger ?? <Button variant="outline" size="sm"><Upload className="h-4 w-4" />Importar OFX</Button>}
        </DialogTrigger>
      )}
      <DialogContent className={cn(
        'max-h-[90vh] gap-4 overflow-y-auto overflow-x-hidden',
        statement ? 'sm:max-w-[820px]' : 'sm:max-w-[520px]'
      )}>
        <DialogHeader className="pr-8">
          <DialogTitle>Importar extrato OFX</DialogTitle>
          <DialogDescription className="text-balance">
            {statement
              ? 'Revise o que será lançado. Nada é enviado ao servidor até você confirmar.'
              : 'Exporte o extrato em OFX no app do seu banco e solte o arquivo aqui.'}
          </DialogDescription>
        </DialogHeader>

        {!statement ? (
          <div className="min-w-0 space-y-3">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              onDragOver={(event) => { event.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={(event) => {
                event.preventDefault()
                setDragging(false)
                const file = event.dataTransfer.files?.[0]
                if (file) handleFile(file)
              }}
              disabled={reading}
              className={cn(
                'flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-6 py-10 text-center transition-colors',
                dragging ? 'border-foreground bg-muted/60' : 'border-foreground/30 hover:border-foreground hover:bg-muted/40'
              )}
            >
              {reading ? (
                <>
                  <Loader2 className="h-7 w-7 animate-spin" />
                  <p className="text-sm font-semibold">Lendo o extrato…</p>
                </>
              ) : (
                <>
                  <FileUp className="h-7 w-7" />
                  <p className="text-sm font-semibold">Solte o arquivo .ofx aqui</p>
                  <p className="text-xs text-muted-foreground">ou toque para escolher no dispositivo</p>
                </>
              )}
            </button>

            <input
              ref={inputRef}
              type="file"
              accept=".ofx,.qfx,application/x-ofx,text/plain"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) handleFile(file)
              }}
            />

            <ul className="space-y-1 text-xs leading-relaxed text-muted-foreground">
              <li>· O arquivo é lido no seu navegador — só os lançamentos que você marcar são salvos.</li>
              <li>· Cada transação traz um identificador do banco, então reimportar o mesmo período não duplica nada.</li>
              <li>· As categorias são sugeridas pela descrição e pelas assinaturas que você já cadastrou.</li>
            </ul>
          </div>
        ) : (
          <div className="min-w-0 space-y-3">
            {/* Resumo do extrato */}
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-xl border bg-muted/30 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">
                  {maskAccount(statement.accountId) ?? 'Conta não identificada'}
                  {statement.bankId && <span className="ml-2 text-xs font-normal text-muted-foreground">Banco {statement.bankId}</span>}
                </p>
                <p className="text-xs text-muted-foreground">
                  {statement.periodStart && statement.periodEnd
                    ? `${formatDate(statement.periodStart)} a ${formatDate(statement.periodEnd)}`
                    : `${rows.length} transações`}
                  {' · '}{rows.length} no arquivo
                </p>
              </div>
              <div className="flex gap-4 text-right">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Entradas</p>
                  <p className="text-sm font-bold tabular-nums">{formatCurrency(summary.income)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Saídas</p>
                  <p className="text-sm font-bold tabular-nums">{formatCurrency(summary.expenses)}</p>
                </div>
              </div>
            </div>

            {summary.matched > 0 && (
              <div className="flex items-start gap-2.5 rounded-xl border bg-card px-3.5 py-2.5">
                <Link2 className="mt-0.5 h-4 w-4 shrink-0" />
                <p className="text-xs leading-relaxed">
                  <span className="font-semibold">{summary.matched}</span> transaç{summary.matched === 1 ? 'ão bate' : 'ões batem'} com algo que você já tinha.
                  Em vez de criar um lançamento repetido, elas quitam o pendente ou avançam a assinatura — troque no seletor de cada linha se preferir.
                </p>
              </div>
            )}

            {(summary.alreadyImported > 0 || summary.duplicates > 0) && (
              <div className="flex items-start gap-2.5 rounded-xl border border-dashed border-foreground px-3.5 py-2.5">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <p className="text-xs leading-relaxed">
                  {summary.alreadyImported > 0 && (
                    <><span className="font-semibold">{summary.alreadyImported}</span> já foram importados antes. </>
                  )}
                  {summary.duplicates > 0 && (
                    <><span className="font-semibold">{summary.duplicates}</span> batem com lançamentos que você já tinha (mesmo valor e data). </>
                  )}
                  Deixamos desmarcados — marque manualmente se quiser lançar mesmo assim.
                </p>
              </div>
            )}

            {/* Filtros e seleção em massa */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap gap-1.5">
                {([
                  { value: 'all', label: 'Todas' },
                  { value: 'new', label: 'Novas' },
                  ...(summary.matched > 0
                    ? [{ value: 'reconciled' as RowFilter, label: `Conciliar (${summary.matched})` }]
                    : []),
                  { value: 'expense', label: 'Saídas' },
                  { value: 'income', label: 'Entradas' },
                ] as { value: RowFilter; label: string }[]).map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setFilter(option.value)}
                    className={cn(
                      'rounded-full border px-3 py-1 text-xs font-medium transition-all',
                      filter === option.value
                        ? 'border-foreground bg-foreground text-background'
                        : 'bg-card text-muted-foreground hover:border-foreground/40 hover:text-foreground'
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <button type="button" onClick={() => toggleAll(true)} className="font-medium text-muted-foreground transition-colors hover:text-foreground">
                  Marcar todas
                </button>
                <span className="text-muted-foreground">·</span>
                <button type="button" onClick={() => toggleAll(false)} className="font-medium text-muted-foreground transition-colors hover:text-foreground">
                  Limpar
                </button>
              </div>
            </div>

            {/* Linhas do extrato */}
            <div className="max-h-[42vh] space-y-1.5 overflow-y-auto pr-1 scrollbar-thin">
              {visibleRows.map((row) => {
                const categories = row.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES
                const options = categories.includes(row.category) ? categories : [row.category, ...categories]

                const toggle = () => {
                  if (!row.alreadyImported) updateRow(row.fitid, { selected: !row.selected })
                }

                return (
                  <div
                    key={row.fitid}
                    role="checkbox"
                    aria-checked={row.selected}
                    aria-disabled={row.alreadyImported}
                    tabIndex={row.alreadyImported ? -1 : 0}
                    onClick={toggle}
                    onKeyDown={(event) => {
                      if (event.key === ' ' || event.key === 'Enter') {
                        event.preventDefault()
                        toggle()
                      }
                    }}
                    className={cn(
                      'flex items-start gap-3 rounded-lg border p-2.5 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
                      row.alreadyImported ? 'opacity-55' : 'cursor-pointer',
                      row.selected ? 'border-foreground/40 bg-card' : 'bg-muted/20'
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={row.selected}
                      disabled={row.alreadyImported}
                      readOnly
                      tabIndex={-1}
                      className="pointer-events-none mt-0.5 h-4 w-4 shrink-0 accent-foreground"
                    />

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <p className="min-w-0 flex-1 truncate text-sm font-medium">{row.title}</p>
                        <p className={cn('shrink-0 whitespace-nowrap text-sm font-semibold tabular-nums')}>
                          {row.type === 'income' ? '+' : '-'}{formatCurrency(row.amount)}
                        </p>
                      </div>

                      <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1.5">
                        <span className="text-xs text-muted-foreground tabular-nums">{formatDate(row.date)}</span>

                        <select
                          value={row.category}
                          onClick={(event) => event.stopPropagation()}
                          onChange={(event) => updateRow(row.fitid, { category: event.target.value })}
                          disabled={row.action === 'settle'}
                          className="h-7 max-w-[150px] rounded-md border border-input bg-card px-1.5 text-xs focus-visible:border-foreground focus-visible:outline-none disabled:opacity-50"
                        >
                          {options.map((category) => (
                            <option key={category} value={category}>{category}</option>
                          ))}
                        </select>

                        {row.match && (
                          <select
                            value={row.action}
                            onClick={(event) => event.stopPropagation()}
                            onChange={(event) => updateRow(row.fitid, { action: event.target.value as ImportAction })}
                            className="h-7 max-w-[190px] rounded-md border border-foreground bg-card px-1.5 text-xs font-medium focus-visible:outline-none"
                          >
                            <option value={row.match.action}>
                              {row.match.action === 'settle' ? 'Quitar existente' : 'Vincular à assinatura'}
                            </option>
                            <option value="create">Criar lançamento novo</option>
                          </select>
                        )}

                        {row.alreadyImported && (
                          <span className="inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                            <CheckCircle2 className="h-3 w-3" />Já importado
                          </span>
                        )}
                        {row.possibleDuplicate && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-dashed border-foreground px-1.5 py-0.5 text-[10px] font-medium">
                            <AlertTriangle className="h-3 w-3" />Possível duplicata
                          </span>
                        )}
                      </div>

                      {row.match && row.action !== 'create' && (
                        <p className="mt-1.5 flex items-center gap-1.5 text-[11px] leading-relaxed text-muted-foreground">
                          <Link2 className="h-3 w-3 shrink-0" />
                          <span className="truncate">{row.match.label}</span>
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}

              {visibleRows.length === 0 && (
                <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma transação neste filtro.</p>
              )}
            </div>
          </div>
        )}

        <DialogFooter className="sticky bottom-0 -mx-5 -mb-5 gap-2 border-t bg-background px-5 py-3.5 sm:-mx-6 sm:-mb-6 sm:space-x-0 sm:px-6">
          {statement ? (
            <>
              <Button type="button" variant="outline" onClick={reset} disabled={importing}>
                <ArrowLeft className="h-4 w-4" />Trocar arquivo
              </Button>
              <Button type="button" onClick={handleImport} disabled={importing || summary.selectedCount === 0}>
                {importing
                  ? <><Loader2 className="h-4 w-4 animate-spin" />Importando...</>
                  : summary.reconciling > 0
                    ? `Confirmar ${summary.selectedCount} (${summary.reconciling} conciliado${summary.reconciling === 1 ? '' : 's'})`
                    : `Importar ${summary.selectedCount} lançamento${summary.selectedCount === 1 ? '' : 's'}`}
              </Button>
            </>
          ) : (
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>Cancelar</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
