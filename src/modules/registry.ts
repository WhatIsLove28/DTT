// Реестр модулей главного экрана. Новый модуль — папка в src/modules и запись здесь.
import type { ComponentType } from 'react'
import { t } from '../i18n'
import { ExpensesScreen } from './expenses/ExpensesScreen'
import { ExpensesTile } from './expenses/ExpensesTile'
import type { ModuleId } from './settings'
import { ShoppingScreen } from './shopping/ShoppingScreen'
import { ShoppingTile } from './shopping/ShoppingTile'
import { WorkoutsScreen } from './workouts/WorkoutsScreen'
import { WorkoutsTile } from './workouts/WorkoutsTile'

export interface ModuleDef {
  id: ModuleId
  /** Функции, а не строки: тексты зависят от языка */
  title: () => string
  description: () => string
  /** Плитка на главном экране; wide — на всю ширину (последняя при нечётном числе) */
  Tile: ComponentType<{ wide: boolean; onOpen: (intent?: string) => void }>
  /** Экран модуля на весь экран */
  Screen: ComponentType<{ onClose: () => void; intent?: string }>
}

export const MODULES: readonly ModuleDef[] = [
  {
    id: 'shopping',
    title: () => t.shopping.title,
    description: () => t.shopping.description,
    Tile: ShoppingTile,
    Screen: ShoppingScreen,
  },
  {
    id: 'expenses',
    title: () => t.expenses.title,
    description: () => t.expenses.description,
    Tile: ExpensesTile,
    Screen: ExpensesScreen,
  },
  {
    id: 'workouts',
    title: () => t.workouts.title,
    description: () => t.workouts.description,
    Tile: WorkoutsTile,
    Screen: WorkoutsScreen,
  },
]

export const moduleById = (id: ModuleId): ModuleDef | undefined => MODULES.find((m) => m.id === id)
