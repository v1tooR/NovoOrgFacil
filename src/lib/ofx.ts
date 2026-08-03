import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '@/lib/utils'
import type { FinancialType } from '@/types'

export interface OfxTransaction {
  /** Identificador da transação no banco — chave de deduplicação. */
  fitid: string
  /** Data do lançamento (yyyy-MM-dd). */
  date: string
  /** Valor absoluto; o sinal vira `type`. */
  amount: number
  type: FinancialType
  description: string
  checkNumber: string | null
}

export interface OfxStatement {
  bankId: string | null
  accountId: string | null
  currency: string
  periodStart: string | null
  periodEnd: string | null
  balance: number | null
  transactions: OfxTransaction[]
}

export class OfxParseError extends Error {}

const ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&apos;': "'",
  '&nbsp;': ' ',
}

function decodeEntities(value: string) {
  return value
    .replace(/&(amp|lt|gt|quot|apos|nbsp);/gi, (match) => ENTITIES[match.toLowerCase()] ?? match)
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
}

/**
 * Extratos brasileiros costumam vir em windows-1252, não em UTF-8.
 * Decodifica respeitando o cabeçalho e, na dúvida, testa UTF-8 e cai
 * para 1252 se aparecerem caracteres de substituição.
 */
export function decodeOfxBuffer(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer)
  const header = new TextDecoder('windows-1252').decode(bytes.slice(0, 512))
  const declared = header.match(/(?:CHARSET:|encoding=")\s*"?([\w-]+)/i)?.[1]?.toUpperCase()

  if (declared && /1252|8859|LATIN/.test(declared)) {
    return new TextDecoder('windows-1252').decode(bytes)
  }

  const utf8 = new TextDecoder('utf-8').decode(bytes)
  return utf8.includes('�')
    ? new TextDecoder('windows-1252').decode(bytes)
    : utf8
}

function tagValue(chunk: string, tag: string) {
  const match = chunk.match(new RegExp(`<${tag}>\\s*([^<\\r\\n]*)`, 'i'))
  const value = match?.[1]?.trim()
  return value ? decodeEntities(value) : null
}

/** OFX usa YYYYMMDD[HHMMSS][.XXX][TZ] — só a parte da data interessa. */
function parseOfxDate(value: string | null) {
  const digits = value?.replace(/\D/g, '') ?? ''
  if (digits.length < 8) return null

  const [year, month, day] = [digits.slice(0, 4), digits.slice(4, 6), digits.slice(6, 8)]
  const date = new Date(Number(year), Number(month) - 1, Number(day))
  const isValid = date.getFullYear() === Number(year)
    && date.getMonth() === Number(month) - 1
    && date.getDate() === Number(day)

  return isValid ? `${year}-${month}-${day}` : null
}

/** Aceita "-39.90" (padrão) e "-39,90" (alguns bancos brasileiros). */
function parseOfxAmount(value: string | null) {
  if (!value) return null

  const cleaned = value.replace(/[^\d.,-]/g, '')
  const lastComma = cleaned.lastIndexOf(',')
  const lastDot = cleaned.lastIndexOf('.')
  const decimalSeparator = lastComma > lastDot ? ',' : '.'

  const normalized = decimalSeparator === ','
    ? cleaned.replace(/\./g, '').replace(',', '.')
    : cleaned.replace(/,/g, '')

  const amount = Number(normalized)
  return Number.isFinite(amount) ? amount : null
}

function cleanDescription(value: string | null) {
  return value?.replace(/\s+/g, ' ').trim().slice(0, 200) ?? ''
}

export function parseOfx(content: string): OfxStatement {
  if (!/<OFX>/i.test(content)) {
    throw new OfxParseError('Arquivo não parece ser um OFX válido.')
  }

  // Aggregates sempre têm tag de fechamento, mesmo no OFX 1.x (SGML).
  const blocks = content.split(/<STMTTRN>/i).slice(1)
  const seen = new Set<string>()
  const transactions: OfxTransaction[] = []

  blocks.forEach((block, index) => {
    const body = block.split(/<\/STMTTRN>/i)[0]
    const date = parseOfxDate(tagValue(body, 'DTPOSTED'))
    const amount = parseOfxAmount(tagValue(body, 'TRNAMT'))

    if (!date || amount === null || amount === 0) return

    const description = cleanDescription(tagValue(body, 'MEMO') || tagValue(body, 'NAME'))
      || cleanDescription(tagValue(body, 'NAME'))
      || 'Lançamento importado'

    // Sem FITID, sintetiza uma chave estável a partir do próprio conteúdo.
    const fitid = tagValue(body, 'FITID')
      || `${date}:${amount.toFixed(2)}:${description}:${index}`

    if (seen.has(fitid)) return
    seen.add(fitid)

    transactions.push({
      fitid: fitid.slice(0, 120),
      date,
      amount: Math.abs(amount),
      type: amount < 0 ? 'expense' : 'income',
      description,
      checkNumber: tagValue(body, 'CHECKNUM'),
    })
  })

  if (transactions.length === 0) {
    throw new OfxParseError('Nenhuma transação encontrada no arquivo.')
  }

  const balanceBlock = content.split(/<LEDGERBAL>/i)[1] ?? ''

  return {
    bankId: tagValue(content, 'BANKID'),
    accountId: tagValue(content, 'ACCTID'),
    currency: tagValue(content, 'CURDEF') ?? 'BRL',
    periodStart: parseOfxDate(tagValue(content, 'DTSTART')),
    periodEnd: parseOfxDate(tagValue(content, 'DTEND')),
    balance: parseOfxAmount(tagValue(balanceBlock, 'BALAMT')),
    transactions: transactions.sort((a, b) => b.date.localeCompare(a.date)),
  }
}

export function maskAccount(accountId: string | null) {
  if (!accountId) return null
  const digits = accountId.replace(/\s/g, '')
  return digits.length <= 4 ? digits : `••••${digits.slice(-4)}`
}

/** Palavras-chave → categoria padrão do app. Ordem importa: primeira vence. */
const CATEGORY_RULES: { category: string; pattern: RegExp }[] = [
  { category: 'Assinaturas', pattern: /netflix|spotify|disney|hbo|max\b|prime\s?video|globoplay|deezer|youtube|paramount|apple\.?com|itunes|icloud|amazon\s?prime/i },
  { category: 'Ferramentas', pattern: /adobe|canva|figma|notion|slack|google\s?(one|workspace|cloud)|microsoft|office\s?365|openai|chatgpt|anthropic|claude|github|aws|amazon\s?web|vercel|supabase|cloudflare|registro\.?br|hostgator|hostinger|godaddy|dropbox|zoom/i },
  // Extratos abreviam agressivamente: FACEBK, GOOGLE*ADS, MP*ADS.
  { category: 'Marketing', pattern: /facebook|facebk|meta\s?ads|instagram|google\s?\*?\s?ads|linkedin|tiktok|mailchimp|rd\s?station|anuncio|publicidade/i },
  { category: 'Impostos', pattern: /\bdas\b|simples\s?nacional|darf|inss|iss\b|irrf|receita\s?federal|prefeitura|tributo|imposto|iptu|ipva/i },
  { category: 'Equipamento', pattern: /kabum|pichau|terabyte|magazine|americanas|mercado\s?livre|shopee|aliexpress|apple\s?store|notebook|monitor/i },
  { category: 'Pessoal', pattern: /ifood|rappi|uber|99app|99\s?pop|posto|supermercado|farmacia|drogaria|academia|smartfit|restaurante|padaria|mercado/i },
]

const INCOME_RULES: { category: string; pattern: RegExp }[] = [
  { category: 'Recorrente', pattern: /assinatura|mensalidade|recorrente/i },
  { category: 'Serviço prestado', pattern: /pix\s?recebido|ted\s?recebida|transferencia\s?recebida|recebimento|deposito|pagamento\s?de/i },
  { category: 'Comissão', pattern: /comissao|repasse/i },
  { category: 'Produto', pattern: /venda|pedido|shopify|nuvemshop|hotmart|kiwify|eduzz/i },
]

// Marcas de acentuação combinantes, por escape para não deixar
// caracteres invisíveis no fonte.
const DIACRITICS = new RegExp('[\\u0300-\\u036f]', 'g')

/** Minúsculas, sem acento e sem espaços duplos — base das comparações. */
export function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(DIACRITICS, '')
    .toLocaleLowerCase('pt-BR')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Extrato abrevia o fornecedor; casar exige comparação normalizada. */
export function matchesVendor(description: string, vendorName: string) {
  const name = normalizeText(vendorName)
  return name.length >= 3 && normalizeText(description).includes(name)
}

/**
 * Sugere categoria pela descrição do extrato. Nomes de assinaturas
 * cadastradas têm prioridade — o usuário já classificou aquele gasto.
 */
export function suggestCategory(
  description: string,
  type: FinancialType,
  knownVendors: { name: string; category: string }[] = []
) {
  for (const vendor of knownVendors) {
    if (matchesVendor(description, vendor.name)) return vendor.category
  }

  // As regras cobrem acento no próprio padrão; a descrição vai normalizada.
  const normalized = normalizeText(description)
  const rules = type === 'expense' ? CATEGORY_RULES : INCOME_RULES
  for (const rule of rules) {
    if (rule.pattern.test(normalized)) return rule.category
  }

  return type === 'expense'
    ? EXPENSE_CATEGORIES[EXPENSE_CATEGORIES.length - 1]
    : INCOME_CATEGORIES[INCOME_CATEGORIES.length - 1]
}
