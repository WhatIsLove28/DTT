import { describe, expect, it } from 'vitest'
import {
  amountToInput,
  budgetState,
  formatMoney,
  groupByDay,
  keypadPress,
  monthOf,
  monthSummary,
  parseAmount,
  shiftMonth,
  totalOn,
} from './domain'
import type { Expense } from './types'

let seq = 0
const expense = (date: string, amount: number, categoryId = 'food', over: Partial<Expense> = {}): Expense => ({
  id: `e${++seq}`,
  amount,
  categoryId,
  date,
  createdAt: `${date}T10:00:${String(seq).padStart(2, '0')}`,
  ...over,
})

/** Intl ставит неразрывные пробелы — в ожиданиях пишем обычные */
const plain = (s: string) => s.replace(/[  ]/g, ' ')

describe('месяцы', () => {
  it('месяц даты и переход через границу года', () => {
    expect(monthOf('2026-11-15')).toBe('2026-11')
    expect(shiftMonth('2026-11', 1)).toBe('2026-12')
    expect(shiftMonth('2026-12', 1)).toBe('2027-01')
    expect(shiftMonth('2027-01', -1)).toBe('2026-12')
    expect(shiftMonth('2026-03', -14)).toBe('2025-01')
  })
})

describe('ввод суммы', () => {
  const type = (keys: string) => [...keys].reduce((s, k) => keypadPress(s, k === '<' ? 'back' : k), '')

  it('цифры, точка и стирание', () => {
    expect(type('1240')).toBe('1240')
    expect(type('12.5')).toBe('12.5')
    expect(type('12.5<<')).toBe('12')
    expect(type('<')).toBe('')
  })

  it('одна точка, не больше двух знаков после неё', () => {
    expect(type('1.2.3')).toBe('1.23')
    expect(type('1.234')).toBe('1.23')
    expect(type('.5')).toBe('0.5')
  })

  it('ведущий ноль заменяется, длина ограничена', () => {
    expect(type('007')).toBe('7')
    expect(type('1234567890')).toBe('123456789')
  })

  it('разбор строки в сотые доли', () => {
    expect(parseAmount('1240')).toBe(124000)
    expect(parseAmount('12.5')).toBe(1250)
    expect(parseAmount('1 240,50')).toBe(124050)
    expect(parseAmount('0.07')).toBe(7)
    expect(parseAmount('12.')).toBe(1200)
  })

  it('пустое, нулевое и мусор не являются суммой', () => {
    expect(parseAmount('')).toBeUndefined()
    expect(parseAmount('0')).toBeUndefined()
    expect(parseAmount('0.00')).toBeUndefined()
    expect(parseAmount('abc')).toBeUndefined()
    expect(parseAmount('1.234')).toBeUndefined()
    expect(parseAmount('-5')).toBeUndefined()
  })

  it('обратное преобразование для редактирования', () => {
    expect(amountToInput(124000)).toBe('1240')
    expect(amountToInput(124050)).toBe('1240.5')
    expect(amountToInput(7)).toBe('0.07')
    expect(parseAmount(amountToInput(199999))).toBe(199999)
  })
})

describe('формат суммы', () => {
  it('копейки показываются, только если они есть', () => {
    expect(plain(formatMoney(124000, 'RUB', 'ru-RU'))).toBe('1 240 ₽')
    expect(plain(formatMoney(124050, 'RUB', 'ru-RU'))).toBe('1 240,50 ₽')
    expect(formatMoney(1250, 'USD', 'en-US')).toBe('$12.50')
    expect(formatMoney(0, 'USD', 'en-US')).toBe('$0')
  })

  it('обозначение валюты можно заменить', () => {
    expect(plain(formatMoney(5000000, 'UZS', 'ru-RU', { UZS: 'сум' }))).toBe('50 000 сум')
  })
})

describe('итоги месяца', () => {
  const data = [
    expense('2026-11-01', 50000, 'food'),
    expense('2026-11-15', 30000, 'cafe'),
    expense('2026-11-15', 20000, 'food'),
    expense('2026-10-31', 99900, 'food'),
    expense('2026-12-01', 10000, 'cafe'),
  ]

  it('считает только свой месяц, категории — от самой затратной', () => {
    const { total, byCategory } = monthSummary(data, '2026-11')
    expect(total).toBe(100000)
    expect(byCategory).toEqual([
      { categoryId: 'food', total: 70000, share: 0.7 },
      { categoryId: 'cafe', total: 30000, share: 0.3 },
    ])
  })

  it('пустой месяц', () => {
    expect(monthSummary(data, '2026-09')).toEqual({ total: 0, byCategory: [] })
    expect(groupByDay(data, '2026-09')).toEqual([])
  })

  it('по дням: последние сверху, внутри дня — последние записи сверху', () => {
    const days = groupByDay(data, '2026-11')
    expect(days.map((d) => [d.date, d.total])).toEqual([
      ['2026-11-15', 50000],
      ['2026-11-01', 50000],
    ])
    expect(days[0].items.map((e) => e.categoryId)).toEqual(['food', 'cafe'])
  })

  it('сумма за день', () => {
    expect(totalOn(data, '2026-11-15')).toBe(50000)
    expect(totalOn(data, '2026-11-16')).toBe(0)
  })
})

describe('бюджет', () => {
  it('остаток и доля', () => {
    expect(budgetState(30000, 100000)).toEqual({ left: 70000, ratio: 0.3, over: false })
    expect(budgetState(100000, 100000)).toEqual({ left: 0, ratio: 1, over: false })
  })

  it('перерасход', () => {
    expect(budgetState(150000, 100000)).toEqual({ left: -50000, ratio: 1, over: true })
  })

  it('без бюджета состояния нет', () => {
    expect(budgetState(100, undefined)).toBeUndefined()
    expect(budgetState(100, 0)).toBeUndefined()
  })
})
