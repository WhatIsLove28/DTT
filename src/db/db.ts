import Dexie, { type Table } from 'dexie'
import type { Category, MetaEntry, Task, TaskSeries, WeeklyGoal } from '../domain/types'

export class TrackerDB extends Dexie {
  categories!: Table<Category, string>
  goals!: Table<WeeklyGoal, string>
  series!: Table<TaskSeries, string>
  tasks!: Table<Task, string>
  meta!: Table<MetaEntry, string>

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
  }
}

export const db = new TrackerDB()
