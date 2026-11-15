import Dexie, { type Table } from 'dexie'
import type { Category, MetaEntry, Task, TaskSeries, WeeklyGoal } from '../domain/types'
import type { Expense, ExpenseCategory } from '../modules/expenses/types'
import type { CustomExercise, Workout } from '../modules/workouts/types'
import type { ShoppingHistoryEntry, ShoppingItem, ShoppingList } from '../modules/shopping/types'

/** Основные таблицы; все остальные принадлежат модулям и в бэкапе лежат в разделе modules */
export const CORE_TABLES = ['categories', 'goals', 'series', 'tasks', 'meta'] as const

export class TrackerDB extends Dexie {
  categories!: Table<Category, string>
  goals!: Table<WeeklyGoal, string>
  series!: Table<TaskSeries, string>
  tasks!: Table<Task, string>
  meta!: Table<MetaEntry, string>
  // Модуль «Покупки»
  shoppingLists!: Table<ShoppingList, string>
  shoppingItems!: Table<ShoppingItem, string>
  shoppingHistory!: Table<ShoppingHistoryEntry, string>
  // Модуль «Расходы»
  expenseCategories!: Table<ExpenseCategory, string>
  expenses!: Table<Expense, string>
  // Модуль «Тренировки»
  workouts!: Table<Workout, string>
  workoutExercises!: Table<CustomExercise, string>

  constructor(name = 'tracker') {
    super(name)
    // Перечислены только индексы; остальные поля хранятся без объявления.
    this.version(1).stores({
      categories: 'id',
      goals: 'id, categoryId',
      series: 'id, categoryId, goalId',
      tasks: 'id, date, goalId, seriesId, status',
      meta: 'key',
    })
    // Версия 2: таблицы модулей. Прежние таблицы переходят как есть.
    this.version(2).stores({
      shoppingLists: 'id',
      shoppingItems: 'id, listId',
      shoppingHistory: 'key',
    })
    this.version(3).stores({
      expenseCategories: 'id',
      expenses: 'id, date, categoryId',
    })
    this.version(4).stores({
      workouts: 'id, date',
      workoutExercises: 'id',
    })
  }
}

export const db = new TrackerDB()
