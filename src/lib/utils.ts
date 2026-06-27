import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, isToday, isBefore, startOfDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type {
  TaskStatus,
  TaskPriority,
  ProjectStatus,
  FinancialStatus,
  FinancialType,
} from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export function formatDate(date: string | Date | null, pattern = 'dd/MM/yyyy'): string {
  if (!date) return '—'
  return format(new Date(date), pattern, { locale: ptBR })
}

export function formatDateRelative(date: string | Date | null): string {
  if (!date) return '—'
  const d = new Date(date)
  if (isToday(d)) return 'Hoje'
  return format(d, "dd 'de' MMM", { locale: ptBR })
}

export function isOverdue(dueDate: string | null): boolean {
  if (!dueDate) return false
  return isBefore(startOfDay(new Date(dueDate)), startOfDay(new Date()))
}

export function getInitials(name: string | null | undefined): string {
  if (!name) return '?'
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
}

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  pending: 'Pendente',
  in_progress: 'Em andamento',
  completed: 'Concluída',
}

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
}

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  planning: 'Planejamento',
  in_progress: 'Em andamento',
  waiting_client: 'Aguardando cliente',
  completed: 'Concluído',
  paused: 'Pausado',
}

export const FINANCIAL_TYPE_LABELS: Record<FinancialType, string> = {
  income: 'Receita',
  expense: 'Despesa',
}

export const FINANCIAL_STATUS_LABELS: Record<FinancialStatus, string> = {
  pending: 'Pendente',
  paid: 'Pago',
  received: 'Recebido',
  overdue: 'Atrasado',
}

export const INCOME_CATEGORIES = [
  'Serviço prestado',
  'Consultoria',
  'Projeto',
  'Recorrente',
  'Produto',
  'Comissão',
  'Outros',
]

export const EXPENSE_CATEGORIES = [
  'Ferramentas',
  'Assinaturas',
  'Marketing',
  'Equipamento',
  'Pessoal',
  'Impostos',
  'Outros',
]
