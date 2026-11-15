import type { ISODate, Task, TaskStatus } from '../../domain/types'
import { db } from '../db'

const OPEN_STATUSES: TaskStatus[] = ['todo', 'in_progress']

export const tasksRepo = {
  list: (): Promise<Task[]> => db.tasks.toArray(),
  get: (id: string): Promise<Task | undefined> => db.tasks.get(id),
  put: (task: Task): Promise<string> => db.tasks.put(task),
  remove: (id: string): Promise<void> => db.tasks.delete(id),

  /** Задачи с датой в диапазоне, обе границы включительно */
  listByDateRange: (from: ISODate, to: ISODate): Promise<Task[]> =>
    db.tasks.where('date').between(from, to, true, true).toArray(),

  /** Все незавершённые задачи (todo и in_progress) */
  listOpen: (): Promise<Task[]> => db.tasks.where('status').anyOf(OPEN_STATUSES).toArray(),

  listByGoal: (goalId: string): Promise<Task[]> => db.tasks.where('goalId').equals(goalId).toArray(),

  listBySeries: (seriesId: string): Promise<Task[]> => db.tasks.where('seriesId').equals(seriesId).toArray(),

  allIds: (): Promise<string[]> => db.tasks.toCollection().primaryKeys(),

  /** Добавляет новые задачи; id не должны существовать */
  addMany: async (tasks: Task[]): Promise<void> => {
    if (tasks.length > 0) await db.tasks.bulkAdd(tasks)
  },

  putMany: async (tasks: Task[]): Promise<void> => {
    if (tasks.length > 0) await db.tasks.bulkPut(tasks)
  },

  removeMany: async (ids: string[]): Promise<void> => {
    if (ids.length > 0) await db.tasks.bulkDelete(ids)
  },

  setStatus: async (ids: string[], status: TaskStatus): Promise<void> => {
    if (ids.length > 0) await db.tasks.where('id').anyOf(ids).modify({ status })
  },
}
