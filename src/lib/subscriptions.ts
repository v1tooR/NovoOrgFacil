import { addMonthsToDate } from '@/lib/finance'
import type { Subscription, SubscriptionCycle, SubscriptionStatus } from '@/types'

interface CycleMeta {
  label: string
  /** Sufixo curto usado ao lado do valor: "R$ 39,90 /mês". */
  suffix: string
  /** Meses avançados a cada cobrança (0 para o ciclo semanal). */
  months: number
  /** Multiplicador para normalizar o valor em custo mensal. */
  monthlyFactor: number
}

/** Ordem de exibição: do ciclo mais curto para o mais longo. */
export const SUBSCRIPTION_CYCLES: Record<SubscriptionCycle, CycleMeta> = {
  weekly: { label: 'Semanal', suffix: '/semana', months: 0, monthlyFactor: 52 / 12 },
  monthly: { label: 'Mensal', suffix: '/mês', months: 1, monthlyFactor: 1 },
  quarterly: { label: 'Trimestral', suffix: '/trimestre', months: 3, monthlyFactor: 1 / 3 },
  semiannual: { label: 'Semestral', suffix: '/semestre', months: 6, monthlyFactor: 1 / 6 },
  yearly: { label: 'Anual', suffix: '/ano', months: 12, monthlyFactor: 1 / 12 },
}

export const SUBSCRIPTION_CYCLE_ORDER: SubscriptionCycle[] = [
  'weekly', 'monthly', 'quarterly', 'semiannual', 'yearly',
]

export const SUBSCRIPTION_STATUS_LABELS: Record<SubscriptionStatus, string> = {
  active: 'Ativa',
  paused: 'Pausada',
  canceled: 'Cancelada',
}

export const SUBSCRIPTION_PAYMENT_METHODS = [
  'Cartão de crédito',
  'Cartão de débito',
  'Pix',
  'Boleto',
  'Débito automático',
  'Outro',
]

/** Serviços comuns no Brasil — preenchem nome e categoria em um toque. */
export const SUBSCRIPTION_PRESETS: { name: string; category: string }[] = [
  { name: 'Netflix', category: 'Assinaturas' },
  { name: 'Spotify', category: 'Assinaturas' },
  { name: 'Amazon Prime', category: 'Assinaturas' },
  { name: 'Disney+', category: 'Assinaturas' },
  { name: 'YouTube Premium', category: 'Assinaturas' },
  { name: 'ChatGPT Plus', category: 'Ferramentas' },
  { name: 'Adobe Creative Cloud', category: 'Ferramentas' },
  { name: 'Canva Pro', category: 'Ferramentas' },
  { name: 'Microsoft 365', category: 'Ferramentas' },
  { name: 'iCloud', category: 'Ferramentas' },
  { name: 'Google One', category: 'Ferramentas' },
  { name: 'Academia', category: 'Pessoal' },
]

/** Converte 'yyyy-MM-dd' em Date local, sem o deslocamento de fuso do ISO. */
export function parseDateOnly(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function toDateOnly(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}

export function addDaysToDate(date: string, days: number) {
  const target = parseDateOnly(date)
  target.setDate(target.getDate() + days)
  return toDateOnly(target)
}

/** Próxima data de cobrança depois de um ciclo completo. */
export function advanceChargeDate(date: string, cycle: SubscriptionCycle, times = 1) {
  const { months } = SUBSCRIPTION_CYCLES[cycle]
  return months === 0
    ? addDaysToDate(date, 7 * times)
    : addMonthsToDate(date, months * times)
}

/** Dias entre hoje e a data (negativo = cobrança atrasada). */
export function daysUntil(date: string, reference = new Date()) {
  const target = parseDateOnly(date)
  const base = new Date(reference.getFullYear(), reference.getMonth(), reference.getDate())
  return Math.round((target.getTime() - base.getTime()) / 86_400_000)
}

/**
 * Reposiciona a cobrança no futuro quando a assinatura ficou parada
 * (ex.: retomada depois de meses pausada), preservando o dia do ciclo.
 */
export function rollChargeDateForward(date: string, cycle: SubscriptionCycle, reference = new Date()) {
  let next = date
  // Trava de segurança: ciclos semanais em datas muito antigas.
  for (let guard = 0; guard < 600 && daysUntil(next, reference) < 0; guard += 1) {
    next = advanceChargeDate(next, cycle)
  }
  return next
}

/** Custo normalizado por mês — é o que torna ciclos diferentes comparáveis. */
export function monthlyCost(subscription: Pick<Subscription, 'amount' | 'cycle'>) {
  return Number(subscription.amount) * SUBSCRIPTION_CYCLES[subscription.cycle].monthlyFactor
}

export function yearlyCost(subscription: Pick<Subscription, 'amount' | 'cycle'>) {
  return monthlyCost(subscription) * 12
}

export function sumMonthlyCost(subscriptions: Pick<Subscription, 'amount' | 'cycle'>[]) {
  return subscriptions.reduce((total, subscription) => total + monthlyCost(subscription), 0)
}

/** Texto humano do vencimento: "Hoje", "em 3 dias", "Atrasada há 2 dias". */
export function formatChargeCountdown(days: number) {
  if (days < -1) return `Atrasada há ${Math.abs(days)} dias`
  if (days === -1) return 'Atrasada há 1 dia'
  if (days === 0) return 'Cobra hoje'
  if (days === 1) return 'Cobra amanhã'
  if (days <= 45) return `Em ${days} dias`
  return `Em ${Math.round(days / 30)} meses`
}

/** Fração do ciclo já percorrida (0 a 1) — alimenta a barra de progresso. */
export function cycleProgress(subscription: Pick<Subscription, 'cycle' | 'next_charge_date'>, reference = new Date()) {
  const cycleStart = advanceChargeDate(subscription.next_charge_date, subscription.cycle, -1)
  const totalDays = daysUntil(subscription.next_charge_date, parseDateOnly(cycleStart))
  if (totalDays <= 0) return 1
  const elapsed = totalDays - daysUntil(subscription.next_charge_date, reference)
  return Math.min(1, Math.max(0, elapsed / totalDays))
}
