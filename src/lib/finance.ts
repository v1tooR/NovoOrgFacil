const moneyFormatter = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export function formatMoneyInput(value: number) {
  return value > 0 ? moneyFormatter.format(value) : ''
}

export function parseMoneyInput(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 12)
  return digits ? Number(digits) / 100 : 0
}

export function splitAmount(total: number, count: number) {
  const totalInCents = Math.round(total * 100)
  const baseInCents = Math.floor(totalInCents / count)
  const remainder = totalInCents % count

  return Array.from({ length: count }, (_, index) => (
    baseInCents + (index < remainder ? 1 : 0)
  ) / 100)
}

export function addMonthsToDate(date: string, months: number) {
  const [year, month, day] = date.split('-').map(Number)
  const target = new Date(year, month - 1 + months, 1)
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate()
  const safeDay = Math.min(day, lastDay)

  return [
    target.getFullYear(),
    String(target.getMonth() + 1).padStart(2, '0'),
    String(safeDay).padStart(2, '0'),
  ].join('-')
}
