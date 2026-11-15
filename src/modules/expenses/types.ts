import type { ISODate } from '../../domain/types'

export interface ExpenseCategory {
  id: string
  name: string
  color: string
  /** Порядок в списке выбора */
  order: number
}

export interface Expense {
  id: string
  /** Сумма в сотых долях валюты (копейки, центы): целое число, без ошибок округления */
  amount: number
  categoryId: string
  date: ISODate
  note?: string
  /** ISO-дата со временем создания; порядок внутри дня */
  createdAt: string
}
