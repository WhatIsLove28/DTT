// Логика расходов — чистые функции. Суммы везде в сотых долях валюты (целые числа).
import type { ISODate } from '../../domain/types'
import type { Expense } from './types'

/** Месяц в виде 'yyyy-MM' */
export type Month = string

export const monthOf = (date: ISODate): Month => date.slice(0, 7)

/** Соседний месяц: shiftMonth('2026-12', 1) → '2027-01' */
export function shiftMonth(month: Month, delta: number): Month {
  const [y, m] = month.split('-').map(Number)
  const index = y * 12 + (m - 1) + delta
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, '0')}`
}

/** Первый день месяца как ISO-дата */
export const monthStart = (month: Month): ISODate => `${month}-01`

const MAX_INT_DIGITS = 9

/**
 * Нажатие клавиши цифровой клавиатуры. Строка суммы хранится с точкой: '1240.5'.
 * Клавиши: '0'–'9', '.', 'back'. Не больше двух знаков после точки и девяти до неё.
 */
export function keypadPress(current: string, key: string): string {
  if (key === 'back') return current.slice(0, -1)
  if (key === '.') return current.includes('.') ? current : `${current || '0'}.`
  if (!/^\d$/.test(key)) return current
  const [int, frac] = current.split('.')
  if (frac !== undefined) return frac.length >= 2 ? current : current + key
  if (int === '0') return key
  return int.length >= MAX_INT_DIGITS ? current : current + key
}

/** Строка суммы ('1 240,50', '12.5') → сотые доли; undefined, если это не положительное число */
export function parseAmount(text: string): number | undefined {
  const clean = text.replace(/[\s  ]/g, '').replace(',', '.')
  if (!/^\d+(\.\d{0,2})?$/.test(clean)) return undefined
  const [int, frac = ''] = clean.split('.')
  const minor = Number(int) * 100 + Number(frac.padEnd(2, '0'))
  return minor > 0 && Number.isSafeInteger(minor) ? minor : undefined
}

/** Сотые доли → строка для клавиатуры: 124050 → '1240.5', 5000 → '50' */
export function amountToInput(minor: number): string {
  const int = Math.floor(minor / 100)
  const frac = minor % 100
  if (frac === 0) return String(int)
  return `${int}.${String(frac).padStart(2, '0').replace(/0$/, '')}`
}

/**
 * Сумма с валютой: «1 240 ₽», «$12.50». Копейки показываются, только если они есть.
 * symbols заменяет обозначение валюты там, где системное неудачно (UZS → «сум»).
 */
export function formatMoney(
  minor: number,
  currency: string,
  localeTag: string,
  symbols: Readonly<Record<string, string>> = {},
): string {
  const digits = minor % 100 === 0 ? 0 : 2
  const parts = new Intl.NumberFormat(localeTag, {
    style: 'currency',
    currency,
    currencyDisplay: 'narrowSymbol',
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).formatToParts(minor / 100)
  return parts.map((p) => (p.type === 'currency' ? (symbols[currency] ?? p.value) : p.value)).join('')
}

export const sum = (expenses: readonly Expense[]): number => expenses.reduce((total, e) => total + e.amount, 0)

export const expensesOfMonth = (expenses: readonly Expense[], month: Month): Expense[] =>
  expenses.filter((e) => monthOf(e.date) === month)

export const totalOn = (expenses: readonly Expense[], date: ISODate): number =>
  sum(expenses.filter((e) => e.date === date))

export interface CategoryTotal {
  categoryId: string
  total: number
  /** Доля от суммы месяца, 0…1 */
  share: number
}

/** Итог месяца и разбивка по категориям, от самой затратной */
export function monthSummary(expenses: readonly Expense[], month: Month): { total: number; byCategory: CategoryTotal[] } {
  const inMonth = expensesOfMonth(expenses, month)
  const total = sum(inMonth)
  const totals = new Map<string, number>()
  for (const e of inMonth) totals.set(e.categoryId, (totals.get(e.categoryId) ?? 0) + e.amount)
  const byCategory = [...totals]
    .map(([categoryId, value]) => ({ categoryId, total: value, share: total > 0 ? value / total : 0 }))
    .sort((a, b) => b.total - a.total || a.categoryId.localeCompare(b.categoryId))
  return { total, byCategory }
}

export interface DayGroup {
  date: ISODate
  total: number
  items: Expense[]
}

/** Расходы месяца по дням: последние дни и последние записи сверху */
export function groupByDay(expenses: readonly Expense[], month: Month): DayGroup[] {
  const days = new Map<ISODate, Expense[]>()
  for (const e of expensesOfMonth(expenses, month)) days.set(e.date, [...(days.get(e.date) ?? []), e])
  return [...days]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, items]) => ({
      date,
      total: sum(items),
      items: items.sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    }))
}

export interface BudgetState {
  /** Остаток; отрицательный — перерасход */
  left: number
  /** Потраченная доля бюджета, 0…1 */
  ratio: number
  over: boolean
}

/** Состояние месячного бюджета; без бюджета — undefined */
export function budgetState(total: number, budget: number | undefined): BudgetState | undefined {
  if (!budget || budget <= 0) return undefined
  return { left: budget - total, ratio: Math.min(1, total / budget), over: total > budget }
}
