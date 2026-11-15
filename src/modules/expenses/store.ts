// Данные модуля «Расходы»: живое чтение и действия (одна транзакция на действие).
// Экран и плитка обращаются к базе только через этот файл.
import { useLiveQuery } from 'dexie-react-hooks'
import { format } from 'date-fns'
import { db } from '../../db/db'
import { metaRepo } from '../../db/repositories'
import { newId } from '../../domain/ids'
import type { ISODate } from '../../domain/types'
import type { Expense, ExpenseCategory } from './types'

const nowStamp = (): string => format(new Date(), "yyyy-MM-dd'T'HH:mm:ss.SSS")

const BUDGET = 'expenseBudget'
const TABLES = [db.expenseCategories, db.expenses, db.meta]

export interface ExpensesData {
  /** В порядке выбора */
  categories: ExpenseCategory[]
  expenses: Expense[]
  /** Месячный бюджет в сотых долях валюты; undefined — не задан */
  budget: number | undefined
}

/** Живые данные модуля; undefined, пока база читается */
export function useExpenses(): ExpensesData | undefined {
  return useLiveQuery(async () => {
    const [categories, expenses, budget] = await Promise.all([
      db.expenseCategories.toArray(),
      db.expenses.toArray(),
      metaRepo.get<number>(BUDGET),
    ])
    categories.sort((a, b) => a.order - b.order || a.name.localeCompare(b.name))
    return { categories, expenses, budget: typeof budget === 'number' && budget > 0 ? budget : undefined }
  }, [])
}

/** Стартовые цвета категорий расходов, по порядку названий из словаря */
const DEFAULT_COLORS = ['#34c759', '#ff9500', '#007aff', '#a2845e', '#ff3b30', '#af52de', '#ff2d55', '#8e8e93']

/** Создаёт стартовые категории, если категорий ещё нет; повторный вызов ничего не делает */
export async function ensureDefaultCategories(names: readonly string[]): Promise<void> {
  await db.transaction('rw', TABLES, async () => {
    if ((await db.expenseCategories.count()) > 0) return
    await db.expenseCategories.bulkPut(
      names.map((name, order) => ({ id: newId(), name, color: DEFAULT_COLORS[order % DEFAULT_COLORS.length], order })),
    )
  })
}

export interface ExpenseInput {
  amount: number
  categoryId: string
  date: ISODate
  note?: string
}

const clean = ({ amount, categoryId, date, note }: ExpenseInput) => ({
  amount,
  categoryId,
  date,
  ...(note?.trim() ? { note: note.trim() } : {}),
})

export async function addExpense(input: ExpenseInput): Promise<void> {
  await db.expenses.put({ id: newId(), ...clean(input), createdAt: nowStamp() })
}

export async function updateExpense(expense: Expense, input: ExpenseInput): Promise<void> {
  await db.expenses.put({ id: expense.id, ...clean(input), createdAt: expense.createdAt })
}

export async function deleteExpense(id: string): Promise<void> {
  await db.expenses.delete(id)
}

export async function saveExpenseCategory(input: { id?: string; name: string; color: string }): Promise<void> {
  await db.transaction('rw', TABLES, async () => {
    const existing = input.id ? await db.expenseCategories.get(input.id) : undefined
    const all = await db.expenseCategories.toArray()
    const order = existing?.order ?? Math.max(-1, ...all.map((c) => c.order)) + 1
    await db.expenseCategories.put({ id: input.id ?? newId(), name: input.name.trim(), color: input.color, order })
  })
}

/** Удаляет категорию, перенося её расходы в категорию moveToId */
export async function deleteExpenseCategory(id: string, moveToId: string): Promise<void> {
  if (id === moveToId) throw new Error('moveToId must differ from id')
  await db.transaction('rw', TABLES, async () => {
    if (!(await db.expenseCategories.get(moveToId))) throw new Error('target category not found')
    await db.expenses.where('categoryId').equals(id).modify({ categoryId: moveToId })
    await db.expenseCategories.delete(id)
  })
}

/** Месячный бюджет в сотых долях валюты; undefined убирает бюджет */
export async function setBudget(budget: number | undefined): Promise<void> {
  await metaRepo.set(BUDGET, budget && budget > 0 ? budget : 0)
}
