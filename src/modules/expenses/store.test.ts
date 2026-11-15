import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { normalizeCurrency } from '../../app/units'
import { exportBackup, importBackup } from '../../db/backup'
import { db } from '../../db/db'
import { parseBackup } from '../../domain/backup'
import { moveModule, setModuleEnabled } from '../settings'
import {
  addExpense,
  deleteExpenseCategory,
  ensureDefaultCategories,
  saveExpenseCategory,
  setBudget,
  updateExpense,
} from './store'

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()))
})

const categoryId = async (name: string) => (await db.expenseCategories.toArray()).find((c) => c.name === name)!.id

describe('расходы в базе', () => {
  it('стартовые категории создаются один раз и в заданном порядке', async () => {
    await ensureDefaultCategories(['Продукты', 'Кафе'])
    await ensureDefaultCategories(['Продукты', 'Кафе'])
    const all = (await db.expenseCategories.toArray()).sort((a, b) => a.order - b.order)
    expect(all.map((c) => c.name)).toEqual(['Продукты', 'Кафе'])
  })

  it('новая категория встаёт в конец, правка порядок не меняет', async () => {
    await ensureDefaultCategories(['Продукты', 'Кафе'])
    await saveExpenseCategory({ name: ' Подарки ', color: '#ff3b30' })
    const gifts = (await db.expenseCategories.toArray()).find((c) => c.name === 'Подарки')!
    expect(gifts.order).toBe(2)
    await saveExpenseCategory({ id: gifts.id, name: 'Презенты', color: '#ff3b30' })
    expect((await db.expenseCategories.get(gifts.id))?.order).toBe(2)
  })

  it('пустая заметка не сохраняется, правка сохраняет время создания', async () => {
    await ensureDefaultCategories(['Продукты'])
    const food = await categoryId('Продукты')
    await addExpense({ amount: 12500, categoryId: food, date: '2026-11-15', note: '  ' })
    const [saved] = await db.expenses.toArray()
    expect(saved).not.toHaveProperty('note')
    await updateExpense(saved, { amount: 20000, categoryId: food, date: '2026-11-14', note: 'рынок' })
    expect(await db.expenses.get(saved.id)).toEqual({ ...saved, amount: 20000, date: '2026-11-14', note: 'рынок' })
  })

  it('удаление категории переносит её расходы', async () => {
    await ensureDefaultCategories(['Продукты', 'Кафе'])
    const food = await categoryId('Продукты')
    const cafe = await categoryId('Кафе')
    await addExpense({ amount: 100, categoryId: cafe, date: '2026-11-15' })
    await deleteExpenseCategory(cafe, food)
    expect((await db.expenses.toArray()).map((e) => e.categoryId)).toEqual([food])
    expect(await db.expenseCategories.count()).toBe(1)
    await expect(deleteExpenseCategory(food, food)).rejects.toThrow()
  })

  it('расходы, бюджет и валюта переживают бэкап', async () => {
    await ensureDefaultCategories(['Продукты'])
    await addExpense({ amount: 12500, categoryId: await categoryId('Продукты'), date: '2026-11-15' })
    await setBudget(4000000)
    await db.meta.put({ key: 'currency', value: 'UZS' })

    const file = parseBackup(JSON.stringify(await exportBackup()))
    await Promise.all(db.tables.map((t) => t.clear()))
    await importBackup(file)

    expect((await db.expenses.toArray()).map((e) => e.amount)).toEqual([12500])
    expect((await db.meta.get('expenseBudget'))?.value).toBe(4000000)
    expect((await db.meta.get('currency'))?.value).toBe('UZS')
  })
})

describe('валюта и порядок плиток', () => {
  it('неизвестная валюта заменяется валютой языка', () => {
    expect(normalizeCurrency('UZS', 'ru')).toBe('UZS')
    expect(normalizeCurrency(undefined, 'ru')).toBe('RUB')
    expect(normalizeCurrency('XXX', 'en')).toBe('USD')
  })

  it('плитку можно поднять выше', async () => {
    await setModuleEnabled('shopping', true)
    await setModuleEnabled('expenses', true)
    await moveModule('expenses', -1)
    expect((await db.meta.get('modules'))?.value).toEqual(['expenses', 'shopping'])
    await moveModule('expenses', -1)
    expect((await db.meta.get('modules'))?.value).toEqual(['expenses', 'shopping'])
  })
})
